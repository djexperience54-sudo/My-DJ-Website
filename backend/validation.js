function normalizeText(value, fieldName, maxLength = 5000) {
  const text = typeof value === 'string' ? value.trim() : ''

  if (!text) {
    throw new Error(`${fieldName} is required.`)
  }

  if (text.length > maxLength) {
    throw new Error(`${fieldName} is too long.`)
  }

  return text
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function sanitizeBookingPayload(payload = {}) {
  const name = normalizeText(payload.name, 'Name', 120)
  const email = normalizeText(payload.email, 'Email', 254).toLowerCase()
  const eventType = normalizeText(payload.eventType, 'Event type', 200)
  const message = normalizeText(payload.message, 'Message', 5000)

  if (!isValidEmail(email)) {
    throw new Error('Enter a valid email address.')
  }

  return { name, email, eventType, message }
}

function sanitizeCommentPayload(payload = {}) {
  const name = normalizeText(payload.name || 'Guest', 'Name', 120)
  const message = normalizeText(payload.message, 'Message', 1000)
  return { name, message }
}

module.exports = { sanitizeBookingPayload, sanitizeCommentPayload }
