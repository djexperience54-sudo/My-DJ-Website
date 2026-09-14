import { useState } from 'react'
import { apiUrl } from '../lib/api'

const initialForm = {
  name: '',
  email: '',
  eventType: '',
  message: ''
}

const requestTimeoutMs = 20000

function BookingForm() {
  const [form, setForm] = useState(initialForm)
  const [submitted, setSubmitted] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  function handleChange(event) {
    const { name, value } = event.target
    setForm((currentForm) => ({ ...currentForm, [name]: value }))
    setSubmitted(false)
    setSuccessMessage('')
    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!event.currentTarget.checkValidity()) {
      return
    }

    setIsSubmitting(true)
    setError('')
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), requestTimeoutMs)

    try {
      const response = await fetch(apiUrl('/api/bookings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        signal: controller.signal
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(result.error || 'Your enquiry could not be sent. Please try again.')
      }

      setSubmitted(true)
      setSuccessMessage(result.message || 'Your message has been sent successfully. I will reply within 24 hours.')
      setForm(initialForm)
    } catch (submissionError) {
      setError(submissionError.name === 'AbortError' ? 'The server took too long to respond. Please try again.' : submissionError.message)
    } finally {
      window.clearTimeout(timeoutId)
      setIsSubmitting(false)
    }
  }

  return (
    <form className="booking-form" onSubmit={handleSubmit}>
      <label>
        Name
        <input name="name" value={form.name} onChange={handleChange} required />
      </label>
      <label>
        Email
        <input name="email" type="email" value={form.email} onChange={handleChange} required />
      </label>
      <label>
        Event type
        <input name="eventType" value={form.eventType} onChange={handleChange} required />
      </label>
      <label>
        Message
        <textarea name="message" value={form.message} onChange={handleChange} rows="4" required />
      </label>
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Sending...' : 'Send booking enquiry'}
      </button>
      {submitted && (
        <p className="form-status" role="status">
          {successMessage}
        </p>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  )
}

export default BookingForm
