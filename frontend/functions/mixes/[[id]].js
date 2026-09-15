const backendUrl = 'https://my-dj-website.onrender.com'

// Same fallback image used as the default og:image in index.html.
// Used whenever a mixtape has no artwork (or a broken artwork URL) so we
// NEVER send an empty og:image tag — an empty tag makes WhatsApp/Facebook/etc
// fall back to the site favicon (the logo) instead of a mixtape cover.
const fallbackArtwork = 'https://images.unsplash.com/photo-1571266028243-d220c19c9f4c?auto=format&fit=crop&w=1200&q=85'

// Render's free tier spins the backend down when idle, so the first request
// after a while can take 30-50s to "wake up". Bots time out well before that,
// so we cap how long we wait and fall back gracefully instead of hanging.
const backendFetchTimeoutMs = 8000

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function updateMeta(html, selector, replacement) {
  return html.replace(selector, replacement)
}

function isValidImageUrl(value) {
  if (!value || typeof value !== 'string') {
    return false
  }
  try {
    const parsed = new URL(value.trim())
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export async function onRequest(context) {
  const requestUrl = new URL(context.request.url)
  const rawId = requestUrl.pathname.split('/').filter(Boolean).pop() || ''
  const id = decodeURIComponent(rawId).trim()

  try {
    const [mixtapesResponse, indexResponse] = await Promise.all([
      fetchWithTimeout(`${backendUrl}/api/mixtapes`, backendFetchTimeoutMs),
      fetch(new URL('/index.html', requestUrl))
    ])
    const mixtapeData = mixtapesResponse.ok ? await mixtapesResponse.json() : { data: [] }
    const mixtape = (mixtapeData.data || []).find((item) => item.id === id)

    if (!mixtape || !indexResponse.ok) {
      return context.next()
    }

    const shareUrl = `${requestUrl.origin}/mixes/${encodeURIComponent(mixtape.id)}`
    const title = escapeHtml(`${mixtape.title} | INT'L DJ EXPERIENCE`)
    const description = escapeHtml(mixtape.description)
    const image = escapeHtml(isValidImageUrl(mixtape.artwork) ? mixtape.artwork.trim() : fallbackArtwork)
    const canonical = escapeHtml(shareUrl)
    let html = await indexResponse.text()

    html = updateMeta(html, /<title>[^<]*<\/title>/i, `<title>${title}</title>`)
    html = updateMeta(html, /<meta name="description" content="[^"]*"\s*\/>/i, `<meta name="description" content="${description}" />`)
    html = updateMeta(html, /<meta property="og:title" content="[^"]*"\s*\/>/i, `<meta property="og:title" content="${title}" />`)
    html = updateMeta(html, /<meta property="og:description" content="[^"]*"\s*\/>/i, `<meta property="og:description" content="${description}" />`)
    html = updateMeta(html, /<meta property="og:image" content="[^"]*"\s*\/>/i, `<meta property="og:image" content="${image}" />`)
    html = updateMeta(html, /<meta property="og:image:alt" content="[^"]*"\s*\/>/i, `<meta property="og:image:alt" content="${title} artwork" />`)
    html = updateMeta(html, /<meta property="og:url" content="[^"]*"\s*\/>/i, `<meta property="og:url" content="${canonical}" />`)
    html = updateMeta(html, /<meta name="twitter:card" content="[^"]*"\s*\/>/i, `<meta name="twitter:card" content="summary_large_image" />`)
    html = html.replace('</head>', `<meta name="twitter:title" content="${title}" /><meta name="twitter:description" content="${description}" /><meta name="twitter:image" content="${image}" /><link rel="canonical" href="${canonical}" /></head>`)

    return new Response(html, {
      headers: { 'content-type': 'text/html; charset=UTF-8', 'cache-control': 'public, max-age=300' }
    })
  } catch {
    return context.next()
  }
}
