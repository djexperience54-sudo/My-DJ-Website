import { useEffect, useState } from 'react'
import { apiUrl } from '../lib/api'

const initialForm = {
  name: '',
  mood: 'good',
  message: ''
}

const requestTimeoutMs = 20000

function CommentSection() {
  const [form, setForm] = useState(initialForm)
  const [comments, setComments] = useState([])
  const [replies, setReplies] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(apiUrl('/api/comments'))
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Comments could not be loaded.')))
      .then((result) => setComments(result.data || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    comments.forEach((comment) => {
      fetch(apiUrl(`/api/comments/${comment.id}/replies`))
        .then((response) => response.ok ? response.json() : Promise.reject(new Error('Replies could not be loaded.')))
        .then((result) => setReplies((currentReplies) => ({ ...currentReplies, [comment.id]: result.data || [] })))
        .catch(() => {})
    })
  }, [comments])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((currentForm) => ({ ...currentForm, [name]: value }))
    setSubmitted(false)
    setError('')
  }

  async function submitComment(commentForm) {
    setIsSubmitting(true)
    setError('')
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), requestTimeoutMs)

    try {
      const response = await fetch(apiUrl('/api/comments'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commentForm),
        signal: controller.signal
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(result.error || 'Your comment could not be posted. Please try again.')
      }

      setSubmitted(true)
      setComments((currentComments) => [result.data, ...currentComments])
      setForm(initialForm)
      window.localStorage.removeItem('pending-comment')
    } catch (submissionError) {
      setError(submissionError.name === 'AbortError' ? 'The server took too long to respond. Please try again.' : submissionError.message)
    } finally {
      window.clearTimeout(timeoutId)
      setIsSubmitting(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!event.currentTarget.checkValidity()) return

    await submitComment(form)
  }

  async function handleLike(commentId) {
    const response = await fetch(apiUrl(`/api/comments/${commentId}/like`), {
      method: 'POST'
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(result.error || 'That like could not be saved.')
      return
    }
    setComments((currentComments) => currentComments.map((comment) => comment.id === commentId ? { ...comment, likes: result.data.likes } : comment))
  }

  async function handleReply(commentId, message) {
    if (!message.trim()) return
    const response = await fetch(apiUrl(`/api/comments/${commentId}/replies`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(result.error || 'That reply could not be posted.')
      return
    }
    setReplies((currentReplies) => ({ ...currentReplies, [commentId]: [...(currentReplies[commentId] || []), result.data] }))
  }

  return (
    <section className="comment-section" aria-labelledby="comments-title">
      <div className="site-container comment-layout">
        <div className="comment-introduction">
          <p className="eyebrow">Listener feedback</p>
          <h2 id="comments-title">Tell us what you felt.</h2>
        </div>

        <form className="comment-form" onSubmit={handleSubmit}>
          <label>
            How did it feel?
            <select name="mood" value={form.mood} onChange={handleChange}>
              <option value="good">Good</option>
              <option value="neutral">Neutral</option>
              <option value="bad">Bad</option>
            </select>
          </label>

          <label className="comment-field-label">
            Comment
            <textarea name="message" value={form.message} onChange={handleChange} rows="4" placeholder="Tell us about the mixtape, the vibe, or the night..." required />
          </label>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Posting...' : 'Send comment'}
          </button>

          {submitted && (
            <p className="form-status" role="status">
              Thanks for the feedback. Your comment has been posted successfully.
            </p>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
        </form>
        <div className="public-comments" aria-live="polite">
          <h3>What listeners are saying</h3>
          {comments.length === 0 && <p>No comments yet. Be the first to share your experience.</p>}
          {comments.map((comment) => (
            <article key={comment.id} className="public-comment">
              <strong>{comment.name}</strong>
              <span>{comment.mood}</span>
              <p>{comment.message}</p>
              <button type="button" className="comment-like-button" onClick={() => handleLike(comment.id)}>Like ({comment.likes || 0})</button>
              {(replies[comment.id] || []).map((reply) => <p className="public-reply" key={reply.id}><strong>{reply.name}:</strong> {reply.message}</p>)}
              <form className="comment-reply-form" onSubmit={(event) => { event.preventDefault(); handleReply(comment.id, event.currentTarget.elements.reply.value); event.currentTarget.reset() }}><input name="reply" placeholder="Write a reply" maxLength="1000" required /><button type="submit">Reply</button></form>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default CommentSection
