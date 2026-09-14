import { useEffect, useState } from 'react'
import { apiUrl } from '../lib/api'
import { getSupabaseClient } from '../lib/supabaseClient'

const initialForm = {
  message: ''
}

const requestTimeoutMs = 20000

function CommentSection() {
  const [form, setForm] = useState(initialForm)
  const [comments, setComments] = useState([])
  const [replies, setReplies] = useState({})
  const [sortMode, setSortMode] = useState('best')
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    fetch(apiUrl('/api/comments'))
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Comments could not be loaded.')))
      .then((result) => setComments(result.data || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    getSupabaseClient().auth.getSession().then(({ data }) => setProfile(data.session ?? null)).catch(() => {})
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
        headers: { 'Content-Type': 'application/json', ...(profile ? { Authorization: `Bearer ${profile.access_token}` } : {}) },
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

  async function handleShare(commentId) {
    const shareUrl = `${window.location.origin}/#comment-${commentId}`
    try {
      await navigator.clipboard?.writeText(shareUrl)
      setError('Comment link copied.')
    } catch {
      setError('Copy the page link to share this comment.')
    }
  }

  async function handleReply(commentId, message) {
    if (!message.trim()) return
    const response = await fetch(apiUrl(`/api/comments/${commentId}/replies`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(profile ? { Authorization: `Bearer ${profile.access_token}` } : {}) },
      body: JSON.stringify({ message })
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(result.error || 'That reply could not be posted.')
      return
    }
    setReplies((currentReplies) => ({ ...currentReplies, [commentId]: [...(currentReplies[commentId] || []), result.data] }))
  }

  const sortedComments = [...comments].sort((first, second) => {
    if (sortMode === 'newest') return new Date(second.created_at) - new Date(first.created_at)
    if (sortMode === 'oldest') return new Date(first.created_at) - new Date(second.created_at)
    return (second.likes || 0) - (first.likes || 0) || new Date(second.created_at) - new Date(first.created_at)
  })

  return (
    <section className="comment-section" aria-labelledby="comments-title">
      <div className="site-container comment-layout">
        <div className="comment-introduction">
          <p className="eyebrow">Listener feedback</p>
          <h2 id="comments-title">The conversation</h2>
          <p>Share the moment, react to the sound, and keep the conversation moving.</p>
        </div>

        <div className="discussion-panel">
          <div className="discussion-heading">
            <h3>{comments.length} Comment{comments.length === 1 ? '' : 's'}</h3>
            <span className="discussion-badge">INT&apos;L DJ EXPERIENCE</span>
          </div>
          <form className="comment-form" onSubmit={handleSubmit}>
            <div className="comment-composer-row">
              <div className="comment-avatar" aria-hidden="true">{profile?.user_metadata?.avatar_url ? <img src={profile.user_metadata.avatar_url} alt="" /> : (profile?.user_metadata?.full_name || profile?.email || 'Guest').charAt(0).toUpperCase()}</div>
              <div className="comment-composer-fields">
                <textarea name="message" value={form.message} onChange={handleChange} rows="3" placeholder="Join the conversation..." required />
              </div>
            </div>
            <div className="comment-composer-footer">
              <span className="comment-identity-note">{profile ? `Commenting as ${profile.user_metadata?.full_name || profile.email}` : 'Posting as Anonymous'}</span>
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Posting...' : 'Post comment'}
              </button>
            </div>
          </form>

          {submitted && (
            <p className="form-status" role="status">
              Thanks for the feedback. Your comment has been posted successfully.
            </p>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="discussion-toolbar">
            <strong>{comments.length} voices</strong>
            <div className="comment-sort-tabs" role="tablist" aria-label="Sort comments">
              {['best', 'newest', 'oldest'].map((mode) => <button key={mode} className={sortMode === mode ? 'is-active' : ''} type="button" role="tab" aria-selected={sortMode === mode} onClick={() => setSortMode(mode)}>{mode}</button>)}
            </div>
          </div>
          <div className="public-comments" aria-live="polite">
            {sortedComments.length === 0 && <p className="empty-comments">No comments yet. Be the first to share your experience.</p>}
            {sortedComments.map((comment) => (
              <article id={`comment-${comment.id}`} key={comment.id} className="public-comment">
                <div className="comment-avatar comment-avatar--small" aria-hidden="true">{comment.avatar_url ? <img src={comment.avatar_url} alt="" /> : (comment.name === 'Guest' || comment.name === 'Listener' ? 'A' : comment.name.charAt(0).toUpperCase())}</div>
                <div className="comment-body">
                  <div className="comment-author-line"><strong>{comment.name === 'Guest' || comment.name === 'Listener' ? 'Anonymous' : comment.name}</strong><span>{new Date(comment.created_at).toLocaleDateString()}</span></div>
                  <p>{comment.message}</p>
                  <div className="comment-actions">
                    <button type="button" onClick={() => handleLike(comment.id)}>Like <span>{comment.likes || 0}</span></button>
                    <button type="button" onClick={() => document.getElementById(`reply-${comment.id}`)?.focus()}>Reply</button>
                    <button type="button" onClick={() => handleShare(comment.id)}>Share</button>
                  </div>
                  {(replies[comment.id] || []).map((reply) => <p className="public-reply" key={reply.id}><strong>{reply.name === 'Listener' ? 'Anonymous' : reply.name}:</strong> {reply.message}</p>)}
                  <form className="comment-reply-form" onSubmit={(event) => { event.preventDefault(); handleReply(comment.id, event.currentTarget.elements.reply.value); event.currentTarget.reset() }}><input id={`reply-${comment.id}`} name="reply" placeholder="Write a reply" maxLength="1000" required /><button type="submit">Reply</button></form>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default CommentSection
