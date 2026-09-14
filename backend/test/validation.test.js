const test = require('node:test')
const assert = require('node:assert/strict')
const { sanitizeBookingPayload, sanitizeCommentPayload } = require('../validation')

test('sanitizeBookingPayload accepts valid booking data', () => {
  const result = sanitizeBookingPayload({
    name: 'Jane',
    email: 'jane@example.com',
    eventType: 'Private party',
    message: 'Looking for a DJ for my birthday party.'
  })

  assert.equal(result.name, 'Jane')
  assert.equal(result.email, 'jane@example.com')
  assert.equal(result.eventType, 'Private party')
  assert.match(result.message, /birthday party/i)
})

test('sanitizeBookingPayload rejects invalid email addresses', () => {
  assert.throws(() => {
    sanitizeBookingPayload({
      name: 'Jane',
      email: 'not-an-email',
      eventType: 'Private party',
      message: 'Hi there'
    })
  }, /valid email/i)
})

test('sanitizeCommentPayload accepts valid comment data', () => {
  const result = sanitizeCommentPayload({
    name: 'DJ fan',
    message: 'The mix had great energy and the transitions were smooth.'
  })

  assert.equal(result.name, 'DJ fan')
  assert.match(result.message, /great energy/i)
})

test('sanitizeCommentPayload rejects empty messages', () => {
  assert.throws(() => {
    sanitizeCommentPayload({
      name: 'Fan',
      message: ''
    })
  }, /message/i)
})
