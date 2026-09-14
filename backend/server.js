require('dotenv').config()

const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const { createBooking, createComment, createCommentReply, createEmailVerification, deleteEmailVerification, getAuthenticatedUser, getEmailVerification, getLatestEmailVerification, getEvents, getGalleryItems, getMixtapes, getPublicComments, getPublicReplies, getPublicSiteContent, getSitemapContent, toggleCommentLike } = require('./database')
const { createUploadSignature, isConfigured: isCloudinaryConfigured } = require('./cloudinary')
const { sendBookingEmail, sendCommentEmail, sendVerificationCode } = require('./email')
const crypto = require('crypto')
const { sanitizeBookingPayload, sanitizeCommentPayload } = require('./validation')

const app = express()
const port = process.env.PORT || 3000
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://intldjexperience.com',
  'https://www.intldjexperience.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173'
].filter(Boolean)

app.use(express.json({ limit: '1mb' }))
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
      return
    }

    callback(new Error('Origin not allowed by CORS'))
  },
  credentials: true
}))
app.use(helmet())

function asyncRoute(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next)
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function hashVerificationCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex')
}

function publicSubmissionError(error, fallback) {
  const message = error?.message || ''
  if (/required|valid email|too long|verify your email|sign in with google/i.test(message)) {
    return message
  }
  return fallback
}

app.post('/api/email-verification/request', asyncRoute(async (request, response) => {
  const email = String(request.body.email || '').trim().toLowerCase()
  const purpose = ['booking', 'comment'].includes(request.body.purpose) ? request.body.purpose : ''
  if (!isValidEmail(email) || !purpose) {
    return response.status(400).json({ error: 'Enter a valid email and verification purpose.' })
  }

  const code = String(crypto.randomInt(100000, 1000000))
  const token = crypto.randomUUID()
  await createEmailVerification({ token, email, purpose, code_hash: hashVerificationCode(code), expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() })
  try {
    await sendVerificationCode({ to: email, code })
  } catch (error) {
    await deleteEmailVerification(token).catch(() => {})
    console.error('Verification email delivery failed:', error.message)
    return response.status(503).json({ error: 'We could not send the verification email. Check the Render SMTP settings and try again.' })
  }
  response.json({ success: true, message: 'Verification code sent.' })
}))

app.post('/api/email-verification/verify', asyncRoute(async (request, response) => {
  const email = String(request.body.email || '').trim().toLowerCase()
  const purpose = ['booking', 'comment'].includes(request.body.purpose) ? request.body.purpose : ''
  const code = String(request.body.code || '').trim()
  if (!isValidEmail(email) || !purpose || !/^\d{6}$/.test(code)) {
    return response.status(400).json({ error: 'Enter the six-digit verification code.' })
  }

  const verification = await getLatestEmailVerification(email, purpose)
  if (!verification || verification.code_hash !== hashVerificationCode(code)) {
    return response.status(400).json({ error: 'That verification code is invalid or expired.' })
  }
  response.json({ success: true, data: { token: verification.token } })
}))

app.get('/', (request, response) => {
  response.json({
    name: "INT'L DJ Experience API",
    status: 'ok',
    message: 'Backend is running. Use /api/health for the health check.'
  })
})

app.get('/api/health', (request, response) => {
  response.json({ status: 'ok' })
})

app.get('/api/mixtapes', asyncRoute(async (request, response) => {
  response.json({ data: await getMixtapes() })
}))

app.get('/api/events', asyncRoute(async (request, response) => {
  response.json({ data: await getEvents() })
}))

app.get('/api/gallery', asyncRoute(async (request, response) => {
  response.json({ data: await getGalleryItems() })
}))

app.get('/api/comments', asyncRoute(async (request, response) => {
  response.json({ data: await getPublicComments() })
}))

app.get('/api/site-content', asyncRoute(async (request, response) => {
  response.json({ data: await getPublicSiteContent() })
}))

app.get('/sitemap.xml', asyncRoute(async (request, response) => {
  const { mixtapes } = await getSitemapContent()
  const urls = [
    'https://intldjexperience.com/',
    ...mixtapes.map((item) => `https://intldjexperience.com/mixes/${encodeURIComponent(item.id)}`),
  ]
  const lastModified = mixtapes
    .map((item) => item.created_at)
    .filter(Boolean)
    .sort()
    .pop()
  const entries = urls.map((url) => `  <url><loc>${escapeXml(url)}</loc>${lastModified ? `<lastmod>${new Date(lastModified).toISOString()}</lastmod>` : ''}</url>`).join('\n')
  response.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`)
}))

app.post('/api/bookings', asyncRoute(async (request, response) => {
  try {
    const payload = sanitizeBookingPayload(request.body)
    const recipient = process.env.SMTP_TO || 'djexperience54@gmail.com'
    const emailPayload = {
      to: recipient,
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'djexperience54@gmail.com',
      name: payload.name,
      email: payload.email,
      eventType: payload.eventType,
      message: payload.message
    }

    await sendBookingEmail(emailPayload)

    response.status(201).json({
      success: true,
      message: 'Your booking request has been sent to INT\'L DJ EXPERIENCE. I will reply within 24 hours.'
    })
  } catch (error) {
    response.status(400).json({ error: publicSubmissionError(error, 'Your booking could not be submitted. Please try again.') })
  }
}))

app.post('/api/comments', asyncRoute(async (request, response) => {
  try {
    const accessToken = (request.headers.authorization || '').startsWith('Bearer ') ? request.headers.authorization.slice(7) : ''
    const user = accessToken ? await getAuthenticatedUser(accessToken) : null
    const metadata = user?.user_metadata || {}
    const payload = sanitizeCommentPayload({ ...request.body, name: metadata.full_name || metadata.name || user?.email?.split('@')[0] || 'Anonymous' })
    const comment = await createComment({ ...payload, email: user?.email || null, avatar_url: metadata.avatar_url || null })

    sendCommentEmail({
        to: process.env.SMTP_TO || 'djexperience54@gmail.com',
        from: process.env.SMTP_FROM || process.env.SMTP_USER || 'djexperience54@gmail.com',
        ...payload
      }).catch((emailError) => {
      console.error('Comment email delivery failed:', emailError.message)
      })

    response.status(201).json({
      success: true,
      message: 'Your comment has been posted successfully.',
      data: comment
    })
  } catch (error) {
    response.status(400).json({
      error: publicSubmissionError(error, 'Your comment could not be posted right now. Please try again in a moment.')
    })
  }
}))

app.post('/api/comments/:id/like', asyncRoute(async (request, response) => {
  const commentId = Number(request.params.id)
  if (!Number.isInteger(commentId)) return response.status(400).json({ error: 'That comment is not available.' })
  response.json({ data: await toggleCommentLike(commentId) })
}))

app.delete('/api/comments/:id', asyncRoute(async (request, response) => {
  const authorization = request.headers.authorization || ''
  const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!accessToken) return response.status(401).json({ error: 'Administrator access is required.' })
  const user = await getAuthenticatedUser(accessToken)
  await deleteComment(Number(request.params.id), user.id)
  response.status(204).end()
}))

app.get('/api/comments/:id/replies', asyncRoute(async (request, response) => {
  response.json({ data: await getPublicReplies(Number(request.params.id)) })
}))

app.post('/api/comments/:id/replies', asyncRoute(async (request, response) => {
  const message = typeof request.body.message === 'string' ? request.body.message.trim() : ''
  if (!message || message.length > 1000) return response.status(400).json({ error: 'Enter a reply of 1,000 characters or fewer.' })
  const accessToken = (request.headers.authorization || '').startsWith('Bearer ') ? request.headers.authorization.slice(7) : ''
  const user = accessToken ? await getAuthenticatedUser(accessToken) : null
  const metadata = user?.user_metadata || {}
  response.status(201).json({ data: await createCommentReply({ comment_id: Number(request.params.id), name: metadata.full_name || metadata.name || user?.email?.split('@')[0] || 'Anonymous', avatar_url: metadata.avatar_url || null, message }) })
}))

app.post('/api/media/signature', asyncRoute(async (request, response) => {
  const authorization = request.headers.authorization || ''
  const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''

  if (!accessToken) {
    return response.status(401).json({ error: 'A signed-in admin is required.' })
  }

  if (!isCloudinaryConfigured()) {
    return response.status(503).json({ error: 'Cloudinary is not configured on the backend yet.' })
  }

  try {
    await getAuthenticatedUser(accessToken)
  } catch (authenticationError) {
    return response.status(401).json({ error: 'The admin session is invalid or expired.' })
  }

  const resourceType = ['image', 'video', 'raw'].includes(request.body.resourceType) ? request.body.resourceType : 'image'
  const folder = request.body.folder === 'gallery' ? 'intl-dj/gallery' : 'intl-dj/mixtapes'
  response.json({ data: createUploadSignature({ folder, resourceType }) })
}))

app.use((error, request, response, next) => {
  console.error(error)
  response.status(500).json({ error: 'We could not complete that request. Please try again.' })
})

app.listen(port, () => {
  console.log(`DJ website API listening on http://localhost:${port}`)
})
