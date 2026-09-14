const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.')
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function getAuthenticatedUser(accessToken) {
  const { data, error } = await supabase.auth.getUser(accessToken)

  if (error) {
    throw error
  }

  return data.user
}

async function getRows(table, columns, orderColumn) {
  const { data, error } = await supabase.from(table).select(columns).order(orderColumn, { ascending: true })

  if (error) {
    throw error
  }

  return data
}

function getMixtapes() {
  return getRows('mixtapes', 'id, genre, title, artwork, description, audio_url', 'title')
}

function getEvents() {
  return getRows('events', 'id, month, day, title, details', 'sort_order')
}

function getGalleryItems() {
  return getRows('gallery_items', 'id, src, alt', 'sort_order')
}

async function getPublicComments() {
  const { data, error } = await supabase
    .from('comments')
    .select('id, name, mood, message, likes, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw new Error(formatSupabaseError(error, 'Public comments'))
  return data
}

async function toggleCommentLike(commentId, userId) {
  const { data: existing, error: lookupError } = await supabase
    .from('comment_likes')
    .select('comment_id')
    .eq('comment_id', commentId)
    .eq('user_id', userId)
    .maybeSingle()
  if (lookupError) throw lookupError

  if (existing) {
    const { error } = await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', userId)
    if (error) throw error
  } else {
    const { error } = await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: userId })
    if (error) throw error
  }

  const { count, error: countError } = await supabase.from('comment_likes').select('*', { count: 'exact', head: true }).eq('comment_id', commentId)
  if (countError) throw countError
  const { error: updateError } = await supabase.from('comments').update({ likes: count ?? 0 }).eq('id', commentId)
  if (updateError) throw updateError
  return { liked: !existing, likes: count ?? 0 }
}

async function getPublicReplies(commentId) {
  const { data, error } = await supabase.from('comment_replies').select('id, comment_id, name, message, created_at').eq('comment_id', commentId).order('created_at', { ascending: true })
  if (error) throw error
  return data
}

async function createCommentReply(reply) {
  const { data, error } = await supabase.from('comment_replies').insert(reply).select('id, comment_id, name, message, created_at').single()
  if (error) throw new Error(formatSupabaseError(error, 'Comment reply'))
  return data
}

async function getSitemapContent() {
  const [mixtapes] = await Promise.all([
    supabase.from('mixtapes').select('id, created_at').order('created_at', { ascending: false }),
  ])

  if (mixtapes.error) {
    throw mixtapes.error
  }

  return { mixtapes: mixtapes.data }
}

async function getPublicSiteContent() {
  const [mixtapes, events, gallery, settingsResult, videos] = await Promise.all([
    getMixtapes(),
    getEvents(),
    getGalleryItems(),
    supabase.from('site_settings').select('*').limit(1).maybeSingle(),
    supabase.from('site_videos').select('id, title, url, type, sort_order').order('sort_order', { ascending: true }).limit(1)
  ])

  if (settingsResult.error) {
    throw settingsResult.error
  }

  if (videos.error) {
    throw videos.error
  }

  return {
    mixtapes,
    events,
    gallery,
    siteSettings: settingsResult.data,
    featuredVideo: videos.data?.[0] || null
  }
}

function formatSupabaseError(error, context) {
  const message = error && error.message ? error.message : 'A database error occurred.'

  if (message.includes('Could not find the table') || message.includes('does not exist')) {
    return `${context} is temporarily unavailable because the Supabase table is not ready yet. Run the SQL schema in backend/supabase-schema.sql and then try again.`
  }

  if (message.includes('row-level security') || message.includes('permission denied for table')) {
    return `${context} is temporarily unavailable because the Supabase permissions are not configured yet.`
  }

  return message
}

async function createBooking(booking) {
  const { data, error } = await supabase.from('bookings').insert(booking).select().single()

  if (error) {
    throw new Error(formatSupabaseError(error, 'Booking submission'))
  }

  return data
}

async function createComment(comment) {
  const { data, error } = await supabase.from('comments').insert(comment).select().single()

  if (error) {
    throw new Error(formatSupabaseError(error, 'Comment submission'))
  }

  return data
}

async function createEmailVerification(record) {
  const { data, error } = await supabase.from('email_verifications').insert(record).select('token').single()
  if (error) throw new Error(formatSupabaseError(error, 'Email verification'))
  return data
}

async function getEmailVerification(token, email, purpose) {
  const { data, error } = await supabase
    .from('email_verifications')
    .select('token, email, purpose, code_hash, expires_at')
    .eq('token', token)
    .eq('email', email)
    .eq('purpose', purpose)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()
  if (error) throw new Error(formatSupabaseError(error, 'Email verification'))
  return data
}

async function getLatestEmailVerification(email, purpose) {
  const { data, error } = await supabase
    .from('email_verifications')
    .select('token, email, purpose, code_hash, expires_at')
    .eq('email', email)
    .eq('purpose', purpose)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(formatSupabaseError(error, 'Email verification'))
  return data
}

async function deleteEmailVerification(token) {
  const { error } = await supabase.from('email_verifications').delete().eq('token', token)
  if (error) throw new Error(formatSupabaseError(error, 'Email verification'))
}

module.exports = { createBooking, createComment, createCommentReply, createEmailVerification, deleteEmailVerification, formatSupabaseError, getAuthenticatedUser, getEmailVerification, getLatestEmailVerification, getEvents, getGalleryItems, getMixtapes, getPublicComments, getPublicReplies, getPublicSiteContent, getSitemapContent, toggleCommentLike }
