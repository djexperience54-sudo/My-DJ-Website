const backendUrl = 'https://my-dj-website.onrender.com'

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

export async function onRequest(context) {
  const requestUrl = new URL(context.request.url)
  const id = requestUrl.pathname.split('/').filter(Boolean).pop()

  try {
    const [mixtapesResponse, indexResponse] = await Promise.all([
      fetch(`${backendUrl}/api/mixtapes`),
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
    const image = escapeHtml(mixtape.artwork)
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