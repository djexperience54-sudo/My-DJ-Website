import { useEffect, useRef, useState } from 'react'
import { getSupabaseClient } from '../lib/supabaseClient'
import { extractEmbeddedArtwork, uploadToCloudinary } from '../lib/cloudinaryUpload'

const contentTables = [
  { key: 'mixtapes', label: 'Mixtapes', target: 'mixtape-management-title' },
  { key: 'events', label: 'Events', target: 'events-management-title' },
  { key: 'gallery_items', label: 'Gallery items', target: 'gallery-management-title' },
  { key: 'site_videos', label: 'Featured videos', target: 'video-management-title', optional: true },
  { key: 'site_settings', label: 'Homepage settings', target: 'site-settings-title', optional: true },
  { key: 'comments', label: 'Comments', target: 'comments-title-admin', optional: true },
  { key: 'bookings', label: 'Bookings', target: 'bookings-title', optional: true }
]

const emptyMixtape = {
  id: '',
  genre: '',
  title: '',
  artwork: '',
  description: '',
  audio_url: ''
}

const emptyEvent = {
  id: '',
  month: '',
  day: '',
  title: '',
  details: '',
  sort_order: 0
}

const emptyGalleryItem = {
  id: '',
  src: '',
  alt: '',
  sort_order: 0
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    || 'mixtape'
}

const emptySiteSettings = {
  id: 'default',
  hero_title: "INT'L DJ EXPERIENCE",
  hero_subtitle: 'Live energy. Deep culture. Unforgettable nights.',
  hero_image: '/Hero-view.jpg',
  about_eyebrow: "INT'L DJ EXPERIENCE",
  about_title: 'About Me',
  about_image: 'https://images.unsplash.com/photo-1524650359799-842906ca1c06?auto=format&fit=crop&w=1000&q=85',
  about_image_alt: 'Int\'L DJ Experience performer',
  about_paragraphs: [
    'Int\'L DJ Experience, known legally as Dapaah Jerry John, is a versatile Ghanaian disk jockey, entertainer, and professional website developer.',
    'Popularly crowned the Campus DJ, he has built a strong reputation across the Ghanaian entertainment circuit for his high-energy live performances and viral digital mixtapes. Jerry balances his passion for music with a deep background in technology. He is currently studying Information and Communications Technology (ICT) at the University of Education, Winneba (UEW). By uniquely merging his technical skills as a web developer with his musical creativity, Int\'L DJ Experience is paving a distinct path as a modern, self-reliant tech-and-entertainment brand in the digital music era.'
  ]
}

const sessionTimeoutMs = 2 * 60 * 1000

function formatFileSize(bytes) {
  if (!bytes) {
    return ''
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function scrollToDashboardSection(targetId) {
  document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function AdminDashboard({ user, onSignOut }) {
  const [counts, setCounts] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [mixtapes, setMixtapes] = useState([])
  const [mixtapeForm, setMixtapeForm] = useState(emptyMixtape)
  const [isSavingMixtape, setIsSavingMixtape] = useState(false)
  const [mixtapeStatus, setMixtapeStatus] = useState('')
  const [mixtapeUploadProgress, setMixtapeUploadProgress] = useState(null)
  const [mixtapeArtworkFile, setMixtapeArtworkFile] = useState(null)
  const [mixtapeAudioFile, setMixtapeAudioFile] = useState(null)
  const [embeddedArtworkFile, setEmbeddedArtworkFile] = useState(null)
  const audioSelectionRef = useRef(0)
  const [events, setEvents] = useState([])
  const [eventForm, setEventForm] = useState(emptyEvent)
  const [isSavingEvent, setIsSavingEvent] = useState(false)
  const [galleryItems, setGalleryItems] = useState([])
  const [galleryForm, setGalleryForm] = useState(emptyGalleryItem)
  const [isSavingGallery, setIsSavingGallery] = useState(false)
  const [galleryUploadProgress, setGalleryUploadProgress] = useState(null)
  const [galleryStatus, setGalleryStatus] = useState('')
  const [galleryFile, setGalleryFile] = useState(null)
  const [heroImageFile, setHeroImageFile] = useState(null)
  const [aboutImageFile, setAboutImageFile] = useState(null)
  const [siteSettingsForm, setSiteSettingsForm] = useState(emptySiteSettings)
  const [isSavingSiteSettings, setIsSavingSiteSettings] = useState(false)
  const [siteUploadProgress, setSiteUploadProgress] = useState(null)
  const [siteUploadStatus, setSiteUploadStatus] = useState('')
  const [videos, setVideos] = useState([])
  const [videoForm, setVideoForm] = useState({ id: '', title: '', url: '', type: 'youtube', sort_order: 0 })
  const [isSavingVideo, setIsSavingVideo] = useState(false)
  const [comments, setComments] = useState([])
  const [bookings, setBookings] = useState([])
  useEffect(() => {
    const lastActivityRef = { current: Date.now() }

    function updateActivity() {
      lastActivityRef.current = Date.now()
    }

    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click']
    activityEvents.forEach((eventName) => window.addEventListener(eventName, updateActivity))

    const timer = window.setInterval(async () => {
      const { data } = await getSupabaseClient().auth.getSession()
      const session = data.session

      if (!session || Number(session.expires_at || 0) * 1000 <= Date.now()) {
        await getSupabaseClient().auth.signOut()
        onSignOut()
        return
      }

      if (Date.now() - lastActivityRef.current > sessionTimeoutMs) {
        await getSupabaseClient().auth.signOut()
        onSignOut()
      }
    }, 30000)

    return () => {
      window.clearInterval(timer)
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, updateActivity))
    }
  }, [onSignOut])

  useEffect(() => {
    async function loadOverview() {
      try {
        const results = await Promise.all(
          contentTables.map(async ({ key, optional }) => {
            const { count, error: countError } = await getSupabaseClient()
              .from(key)
              .select('*', { count: 'exact', head: true })

            if (countError) {
              if (optional && /does not exist|relation .* does not exist|schema cache/i.test(countError.message)) {
                return [key, 0]
              }
              throw countError
            }

            return [key, count ?? 0]
          })
        )

        setCounts(Object.fromEntries(results))
        const { data: mixtapeRows, error: mixtapeError } = await getSupabaseClient()
          .from('mixtapes')
          .select('id, genre, title, artwork, description, audio_url')
          .order('title', { ascending: true })

        if (mixtapeError) {
          throw mixtapeError
        }

        setMixtapes(mixtapeRows)
        const { data: eventRows, error: eventError } = await getSupabaseClient()
          .from('events')
          .select('id, month, day, title, details, sort_order')
          .order('sort_order', { ascending: true })

        if (eventError) {
          throw eventError
        }

        setEvents(eventRows)
        const { data: galleryRows, error: galleryError } = await getSupabaseClient()
          .from('gallery_items')
          .select('id, src, alt, sort_order')
          .order('sort_order', { ascending: true })

        if (galleryError) {
          throw galleryError
        }

        setGalleryItems(galleryRows)
        const { data: siteSettingsRow, error: siteSettingsError } = await getSupabaseClient()
          .from('site_settings')
          .select('*')
          .limit(1)
          .maybeSingle()

        if (siteSettingsError && !/does not exist|relation .* does not exist/i.test(siteSettingsError.message)) {
          throw siteSettingsError
        }

        if (siteSettingsRow) {
          setSiteSettingsForm({
            ...emptySiteSettings,
            ...siteSettingsRow,
            about_paragraphs: Array.isArray(siteSettingsRow.about_paragraphs)
              ? siteSettingsRow.about_paragraphs
              : (siteSettingsRow.about_paragraphs ? String(siteSettingsRow.about_paragraphs).split(/\n+/) : emptySiteSettings.about_paragraphs)
          })
        }

        const { data: videoRows, error: videoError } = await getSupabaseClient()
          .from('site_videos')
          .select('id, title, url, type, sort_order')
          .order('sort_order', { ascending: true })

        if (videoError && !/does not exist|relation .* does not exist/i.test(videoError.message)) {
          throw videoError
        }

        setVideos(videoRows ?? [])
        const { data: commentRows, error: commentError } = await getSupabaseClient()
          .from('comments')
          .select('id, name, email, mood, message, created_at')
          .order('created_at', { ascending: false })

        if (commentError && !/does not exist|relation .* does not exist|schema cache/i.test(commentError.message)) {
          throw commentError
        }

        setComments(commentRows ?? [])
        const { data: bookingRows, error: bookingError } = await getSupabaseClient()
          .from('bookings')
          .select('id, name, email, event_type, message, status, created_at')
          .order('created_at', { ascending: false })

        if (bookingError) {
          throw bookingError
        }

        setBookings(bookingRows)
      } catch (overviewError) {
        setError(overviewError.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadOverview()
  }, [])

  async function handleSignOut() {
    await getSupabaseClient().auth.signOut()
    onSignOut()
  }

  function handleMixtapeChange(event) {
    const { name, value } = event.target
    setMixtapeForm((currentForm) => ({ ...currentForm, [name]: value }))
  }

  function editMixtape(mixtape) {
    setMixtapeForm({
      id: mixtape.id,
      genre: mixtape.genre,
      title: mixtape.title,
      artwork: mixtape.artwork,
      description: mixtape.description,
      audio_url: mixtape.audio_url || ''
    })
    setError('')
    setMixtapeStatus(`Editing ${mixtape.title}`)
    document.getElementById('mixtape-management-title')?.scrollIntoView({ behavior: 'smooth' })
  }

  function cancelMixtapeEdit() {
    setMixtapeForm(emptyMixtape)
    setMixtapeStatus('')
    setMixtapeArtworkFile(null)
    setMixtapeAudioFile(null)
    setMixtapeUploadProgress(null)
    setEmbeddedArtworkFile(null)
  }

  async function handleMixtapeAudioChange(event) {
    const selectionId = audioSelectionRef.current + 1
    audioSelectionRef.current = selectionId
    const audioFile = event.target.files?.[0] ?? null
    setMixtapeAudioFile(audioFile)
    setEmbeddedArtworkFile(null)
    setMixtapeArtworkFile(null)
    setMixtapeForm((currentForm) => ({
      ...currentForm,
      id: '',
      title: '',
      artwork: '',
      audio_url: ''
    }))

    if (!audioFile) {
      return
    }

    const detectedTitle = audioFile.name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim()
    setMixtapeForm((currentForm) => ({
      ...currentForm,
      id: slugify(audioFile.name),
      title: detectedTitle
    }))

    setMixtapeStatus('Checking audio metadata and embedded artwork...')
    try {
      const artwork = await extractEmbeddedArtwork(audioFile)
      if (selectionId !== audioSelectionRef.current) {
        return
      }
      setEmbeddedArtworkFile(artwork)
      setMixtapeStatus(artwork ? 'Audio title, ID, and embedded artwork detected.' : 'Audio title and ID detected. No embedded artwork found.')
    } catch (metadataError) {
      if (selectionId !== audioSelectionRef.current) {
        return
      }
      setMixtapeStatus(`Audio title and ID detected. Artwork could not be read: ${metadataError.message}`)
    }
  }

  async function handleMixtapeSubmit(event) {
    event.preventDefault()
    setError('')
    setMixtapeStatus('Uploading files and saving mixtape...')
    setIsSavingMixtape(true)
    setMixtapeUploadProgress(null)

    try {
      const { data: sessionData } = await getSupabaseClient().auth.getSession()
      const accessToken = sessionData.session?.access_token

      if (!accessToken) {
        throw new Error('Your admin session has expired. Please sign in again.')
      }

      let embeddedArtwork = embeddedArtworkFile
      if (!mixtapeArtworkFile && !mixtapeForm.artwork && mixtapeAudioFile && !embeddedArtwork) {
        setMixtapeStatus('Checking audio for embedded artwork...')
        embeddedArtwork = await extractEmbeddedArtwork(mixtapeAudioFile)
        if (!embeddedArtwork) {
          throw new Error('No embedded artwork found. Choose an artwork image or add artwork to the audio file.')
        }
      }

      const artwork = mixtapeArtworkFile
        ? await uploadToCloudinary(mixtapeArtworkFile, 'mixtapes', 'image', accessToken, (status) => setMixtapeStatus(status), setMixtapeUploadProgress)
        : embeddedArtwork
          ? await uploadToCloudinary(embeddedArtwork, 'mixtapes', 'image', accessToken, (status) => setMixtapeStatus(status), setMixtapeUploadProgress)
          : mixtapeForm.artwork
      if (mixtapeAudioFile) {
        setMixtapeStatus('Artwork uploaded. Preparing audio upload...')
        setMixtapeUploadProgress(0)
      }
      const audioUrl = mixtapeAudioFile
        ? await uploadToCloudinary(mixtapeAudioFile, 'mixtapes', 'video', accessToken, (status) => setMixtapeStatus(status), setMixtapeUploadProgress)
        : mixtapeForm.audio_url || null
      setMixtapeStatus('Saving mixtape record...')
      const { data, error: saveError } = await getSupabaseClient()
        .from('mixtapes')
        .upsert({ ...mixtapeForm, artwork, audio_url: audioUrl })
        .select()
        .single()

      if (saveError) {
        throw saveError
      }

      setMixtapes((currentMixtapes) => {
        const withoutSaved = currentMixtapes.filter((mixtape) => mixtape.id !== data.id)
        const nextMixtapes = [...withoutSaved, data].sort((first, second) => first.title.localeCompare(second.title))
        setCounts((currentCounts) => ({ ...currentCounts, mixtapes: nextMixtapes.length }))
        return nextMixtapes
      })
      setMixtapeForm(emptyMixtape)
      setMixtapeArtworkFile(null)
      setMixtapeAudioFile(null)
      setEmbeddedArtworkFile(null)
      setMixtapeUploadProgress(null)
      setMixtapeStatus('Mixtape saved successfully.')
    } catch (saveError) {
      setError(saveError.message)
      setMixtapeStatus(`Save failed: ${saveError.message}`)
      setMixtapeUploadProgress(null)
    } finally {
      setIsSavingMixtape(false)
    }
  }

  async function handleMixtapeDelete(id) {
    setError('')

    if (!window.confirm('Delete this mixtape? This removes its database record from the public site.')) {
      return
    }

    const { error: deleteError } = await getSupabaseClient().from('mixtapes').delete().eq('id', id)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    setMixtapes((currentMixtapes) => currentMixtapes.filter((mixtape) => mixtape.id !== id))
    setCounts((currentCounts) => ({ ...currentCounts, mixtapes: Math.max(0, (currentCounts.mixtapes ?? 0) - 1) }))
  }

  function handleEventChange(event) {
    const { name, value } = event.target
    setEventForm((currentForm) => ({ ...currentForm, [name]: name === 'sort_order' ? Number(value) : value }))
  }

  function editEvent(event) {
    setEventForm({
      id: event.id,
      month: event.month,
      day: event.day,
      title: event.title,
      details: event.details,
      sort_order: event.sort_order
    })
    setError('')
    document.getElementById('events-management-title')?.scrollIntoView({ behavior: 'smooth' })
  }

  function cancelEventEdit() {
    setEventForm(emptyEvent)
  }

  async function handleEventSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSavingEvent(true)

    try {
      const { data, error: saveError } = await getSupabaseClient()
        .from('events')
        .upsert(eventForm)
        .select()
        .single()

      if (saveError) {
        throw saveError
      }

      setEvents((currentEvents) => {
        const withoutSaved = currentEvents.filter((currentEvent) => currentEvent.id !== data.id)
        const nextEvents = [...withoutSaved, data].sort((first, second) => first.sort_order - second.sort_order)
        setCounts((currentCounts) => ({ ...currentCounts, events: nextEvents.length }))
        return nextEvents
      })
      setEventForm(emptyEvent)
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setIsSavingEvent(false)
    }
  }

  async function handleEventDelete(id) {
    setError('')

    if (!window.confirm('Delete this event from the public site?')) {
      return
    }

    const { error: deleteError } = await getSupabaseClient().from('events').delete().eq('id', id)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    setEvents((currentEvents) => currentEvents.filter((currentEvent) => currentEvent.id !== id))
    setCounts((currentCounts) => ({ ...currentCounts, events: Math.max(0, (currentCounts.events ?? 0) - 1) }))
  }

  function handleGalleryChange(event) {
    const { name, value } = event.target
    setGalleryForm((currentForm) => ({ ...currentForm, [name]: name === 'sort_order' ? Number(value) : value }))
  }

  function editGalleryItem(item) {
    setGalleryForm({ id: item.id, src: item.src, alt: item.alt, sort_order: item.sort_order })
    setError('')
    document.getElementById('gallery-management-title')?.scrollIntoView({ behavior: 'smooth' })
  }

  function cancelGalleryEdit() {
    setGalleryForm(emptyGalleryItem)
    setGalleryFile(null)
  }

  async function handleGallerySubmit(event) {
    event.preventDefault()
    setError('')
    setIsSavingGallery(true)
    setGalleryUploadProgress(null)
    setGalleryStatus('Preparing gallery upload...')

    try {
      const { data: sessionData } = await getSupabaseClient().auth.getSession()
      const accessToken = sessionData.session?.access_token

      if (!accessToken) {
        throw new Error('Your admin session has expired. Please sign in again.')
      }

      const src = galleryFile
        ? await uploadToCloudinary(galleryFile, 'gallery', 'image', accessToken, setGalleryStatus, setGalleryUploadProgress)
        : galleryForm.src
      const { data, error: saveError } = await getSupabaseClient()
        .from('gallery_items')
        .upsert({ ...galleryForm, src })
        .select()
        .single()

      if (saveError) {
        throw saveError
      }

      setGalleryItems((currentItems) => {
        const withoutSaved = currentItems.filter((item) => item.id !== data.id)
        const nextItems = [...withoutSaved, data].sort((first, second) => first.sort_order - second.sort_order)
        setCounts((currentCounts) => ({ ...currentCounts, gallery_items: nextItems.length }))
        return nextItems
      })
      setGalleryForm(emptyGalleryItem)
      setGalleryFile(null)
      setGalleryStatus('Gallery item saved successfully.')
    } catch (saveError) {
      setError(saveError.message)
      setGalleryStatus(`Save failed: ${saveError.message}`)
    } finally {
      setIsSavingGallery(false)
      setGalleryUploadProgress(null)
    }
  }

  async function handleGalleryDelete(id) {
    setError('')

    if (!window.confirm('Delete this gallery item from the public site?')) {
      return
    }

    const { error: deleteError } = await getSupabaseClient().from('gallery_items').delete().eq('id', id)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    setGalleryItems((currentItems) => currentItems.filter((item) => item.id !== id))
    setCounts((currentCounts) => ({ ...currentCounts, gallery_items: Math.max(0, (currentCounts.gallery_items ?? 0) - 1) }))
  }

  function handleSiteSettingsChange(event) {
    const { name, value } = event.target
    setSiteSettingsForm((currentForm) => ({ ...currentForm, [name]: value }))
  }

  async function handleSiteSettingsSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSavingSiteSettings(true)
    setSiteUploadProgress(null)
    setSiteUploadStatus('Preparing homepage image uploads...')

    try {
      const { data: sessionData } = await getSupabaseClient().auth.getSession()
      const accessToken = sessionData.session?.access_token

      if (!accessToken) {
        throw new Error('Your admin session has expired. Please sign in again.')
      }

      const heroImage = heroImageFile
        ? await uploadToCloudinary(heroImageFile, 'site', 'image', accessToken, setSiteUploadStatus, setSiteUploadProgress)
        : siteSettingsForm.hero_image.trim() || '/Hero-view.jpg'
      const aboutImage = aboutImageFile
        ? await uploadToCloudinary(aboutImageFile, 'site', 'image', accessToken, setSiteUploadStatus, setSiteUploadProgress)
        : siteSettingsForm.about_image.trim() || 'https://images.unsplash.com/photo-1524650359799-842906ca1c06?auto=format&fit=crop&w=1000&q=85'

      const payload = {
        id: siteSettingsForm.id || 'default',
        hero_title: siteSettingsForm.hero_title.trim() || "INT'L DJ EXPERIENCE",
        hero_subtitle: siteSettingsForm.hero_subtitle.trim() || 'Live energy. Deep culture. Unforgettable nights.',
        hero_image: heroImage,
        about_eyebrow: siteSettingsForm.about_eyebrow.trim() || "INT'L DJ EXPERIENCE",
        about_title: siteSettingsForm.about_title.trim() || 'About Me',
        about_image: aboutImage,
        about_image_alt: siteSettingsForm.about_image_alt.trim() || 'Int\'L DJ Experience performer',
        about_paragraphs: Array.isArray(siteSettingsForm.about_paragraphs)
          ? siteSettingsForm.about_paragraphs.filter(Boolean)
          : String(siteSettingsForm.about_paragraphs || '')
              .split(/\n+/)
              .map((paragraph) => paragraph.trim())
              .filter(Boolean),
        updated_at: new Date().toISOString()
      }

      const { data, error: saveError } = await getSupabaseClient()
        .from('site_settings')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single()

      if (saveError) {
        if (/does not exist|relation .* does not exist/i.test(saveError.message)) {
          throw new Error('The site_settings table is missing. Run the SQL from backend/supabase-schema.sql in Supabase, then reload the dashboard.')
        }
        throw saveError
      }

      setHeroImageFile(null)
      setAboutImageFile(null)
      setSiteUploadStatus('Homepage content saved successfully.')
      setSiteSettingsForm({ ...emptySiteSettings, ...data, about_paragraphs: Array.isArray(data.about_paragraphs) ? data.about_paragraphs : String(data.about_paragraphs || '').split(/\n+/).map((paragraph) => paragraph.trim()).filter(Boolean) })
    } catch (saveError) {
      setError(saveError.message)
      setSiteUploadStatus(`Save failed: ${saveError.message}`)
    } finally {
      setIsSavingSiteSettings(false)
      setSiteUploadProgress(null)
    }
  }

  function handleVideoChange(event) {
    const { name, value } = event.target
    setVideoForm((currentForm) => ({ ...currentForm, [name]: name === 'sort_order' ? Number(value) : value }))
  }

  function editVideo(item) {
    setVideoForm({
      id: item.id,
      title: item.title,
      url: item.url,
      type: item.type || 'youtube',
      sort_order: item.sort_order ?? 0
    })
    setError('')
    document.getElementById('video-management-title')?.scrollIntoView({ behavior: 'smooth' })
  }

  function cancelVideoEdit() {
    setVideoForm({ id: '', title: '', url: '', type: 'youtube', sort_order: 0 })
  }

  async function handleVideoSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSavingVideo(true)

    try {
      const normalizedUrl = videoForm.url.trim()
      if (!normalizedUrl) {
        throw new Error('A video link is required.')
      }

      const { data, error: saveError } = await getSupabaseClient()
        .from('site_videos')
        .upsert({ ...videoForm, url: normalizedUrl, type: videoForm.type || 'youtube' })
        .select()
        .single()

      if (saveError) {
        throw saveError
      }

      setVideos((currentVideos) => {
        const withoutSaved = currentVideos.filter((entry) => entry.id !== data.id)
        const nextVideos = [...withoutSaved, data].sort((first, second) => (first.sort_order ?? 0) - (second.sort_order ?? 0))
        setCounts((currentCounts) => ({ ...currentCounts, site_videos: nextVideos.length }))
        return nextVideos
      })
      setVideoForm({ id: '', title: '', url: '', type: 'youtube', sort_order: 0 })
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setIsSavingVideo(false)
    }
  }

  async function handleVideoDelete(id) {
    setError('')

    if (!window.confirm('Delete this video from the public site?')) {
      return
    }

    const { error: deleteError } = await getSupabaseClient().from('site_videos').delete().eq('id', id)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    setVideos((currentVideos) => currentVideos.filter((item) => item.id !== id))
    setCounts((currentCounts) => ({ ...currentCounts, site_videos: Math.max(0, (currentCounts.site_videos ?? 0) - 1) }))
  }

  async function handleCommentDelete(id) {
    if (!window.confirm('Delete this comment from the public site?')) return
    const { data: sessionData } = await getSupabaseClient().auth.getSession()
    const accessToken = sessionData.session?.access_token
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://my-dj-website.onrender.com'}/api/comments/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    if (!response.ok) {
      setError('The comment could not be deleted.')
      return
    }
    setComments((currentComments) => currentComments.filter((comment) => comment.id !== id))
  }

  async function handleBookingStatusChange(id, status) {
    setError('')

    const { data, error: updateError } = await getSupabaseClient()
      .from('bookings')
      .update({ status })
      .eq('id', id)
      .select('id, name, email, event_type, message, status, created_at')
      .single()

    if (updateError) {
      setError(updateError.message)
      return
    }

    setBookings((currentBookings) => currentBookings.map((booking) => booking.id === data.id ? data : booking))
  }

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-header">
        <div>
          <p className="eyebrow">INT&apos;L DJ EXPERIENCE</p>
          <h1>Dashboard</h1>
          <p className="admin-user">Signed in as {user.email}</p>
        </div>
        <button className="admin-signout-button" type="button" onClick={handleSignOut}>
          Sign out
        </button>
      </div>
      <section aria-labelledby="overview-title">
        <p className="eyebrow">Content overview</p>
        <h2 id="overview-title">Your website at a glance</h2>
        {isLoading && <p className="admin-status">Loading content counts...</p>}
        {error && <p className="admin-login-error" role="alert">{error}</p>}
        <div className="admin-stat-grid">
          {contentTables.map(({ key, label, target }) => (
            <button className="admin-stat" key={key} type="button" onClick={() => scrollToDashboardSection(target)}>
              <span>{label}</span>
              <strong>{counts[key] ?? '-'}</strong>
            </button>
          ))}
        </div>
      </section>
      <section className="admin-next-section" aria-labelledby="events-management-title">
        <p className="eyebrow">Event management</p>
        <h2 id="events-management-title">Manage upcoming events</h2>
        <form className="admin-content-form" onSubmit={handleEventSubmit}>
          {Object.entries(emptyEvent).map(([field]) => (
            <label key={field}>
              {field.replace('_', ' ')}
              <input name={field} type={field === 'sort_order' ? 'number' : 'text'} value={eventForm[field]} onChange={handleEventChange} required={field !== 'sort_order'} />
            </label>
          ))}
          <button type="submit" disabled={isSavingEvent}>
            {isSavingEvent ? 'Saving...' : 'Save event'}
          </button>
          {eventForm.id && <button className="admin-cancel-button" type="button" onClick={cancelEventEdit}>Cancel edit</button>}
        </form>
        <div className="admin-content-list">
          {events.map((event) => (
            <article className="admin-content-row" key={event.id}>
              <div>
                <strong>{event.title}</strong>
                <span>{event.month} {event.day} - {event.details}</span>
              </div>
              <div className="admin-row-actions">
                <button type="button" onClick={() => editEvent(event)}>Edit</button>
                <button type="button" onClick={() => handleEventDelete(event.id)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="admin-next-section" aria-labelledby="mixtape-management-title">
        <p className="eyebrow">Mixtape management</p>
        <h2 id="mixtape-management-title">Manage the sound</h2>
        <form className="admin-content-form" onSubmit={handleMixtapeSubmit}>
          <label>
            upload artwork
            <input type="file" accept="image/*" onChange={(event) => setMixtapeArtworkFile(event.target.files?.[0] ?? null)} />
            {mixtapeArtworkFile && <small className="selected-file">Selected: {mixtapeArtworkFile.name} ({formatFileSize(mixtapeArtworkFile.size)})</small>}
          </label>
          <label>
            upload audio
            <input type="file" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.webm,.mp4,.mpeg" onChange={handleMixtapeAudioChange} />
            {mixtapeAudioFile && <small className="selected-file">Selected: {mixtapeAudioFile.name} ({formatFileSize(mixtapeAudioFile.size)})</small>}
          </label>
          {Object.entries(emptyMixtape).map(([field]) => (
            <label key={field}>
              {field.replace('_', ' ')}
              {field === 'description' ? (
                <textarea name={field} value={mixtapeForm[field]} onChange={handleMixtapeChange} rows="3" required={field !== 'audio_url'} />
              ) : (
                <input name={field} value={mixtapeForm[field]} onChange={handleMixtapeChange} required={field !== 'audio_url' && !(field === 'artwork' && mixtapeArtworkFile)} />
              )}
            </label>
          ))}
          <button type="submit" disabled={isSavingMixtape}>
            {isSavingMixtape ? 'Saving...' : 'Save mixtape'}
          </button>
          {isSavingMixtape && (
            <div className="admin-upload-progress" role="status" aria-live="polite">
              <div className="admin-upload-progress-track">
                <div className="admin-upload-progress-bar" style={{ width: `${mixtapeUploadProgress ?? 0}%` }} />
              </div>
              <span>{mixtapeUploadProgress === null ? 'Preparing upload...' : `${mixtapeUploadProgress}% uploaded`}</span>
            </div>
          )}
          {mixtapeForm.id && <button className="admin-cancel-button" type="button" onClick={cancelMixtapeEdit}>Cancel edit</button>}
          {mixtapeStatus && <p className="admin-form-status" role="status">{mixtapeStatus}</p>}
        </form>
        <div className="admin-content-list">
          {mixtapes.map((mixtape) => (
            <article className="admin-content-row" key={mixtape.id}>
              <div>
                <strong>{mixtape.title}</strong>
                <span>{mixtape.genre}</span>
              </div>
              <div className="admin-row-actions">
                <button type="button" onClick={() => editMixtape(mixtape)}>Edit</button>
                <button type="button" onClick={() => handleMixtapeDelete(mixtape.id)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="admin-next-section" aria-labelledby="site-settings-title">
        <p className="eyebrow">Brand and hero content</p>
        <h2 id="site-settings-title">Manage your public homepage</h2>
        <form className="admin-content-form" onSubmit={handleSiteSettingsSubmit}>
          <label>
            Hero title
            <input name="hero_title" value={siteSettingsForm.hero_title} onChange={handleSiteSettingsChange} required />
          </label>
          <label>
            Hero subtitle
            <input name="hero_subtitle" value={siteSettingsForm.hero_subtitle} onChange={handleSiteSettingsChange} required />
          </label>
          <label>
            Upload hero image
            <input type="file" accept="image/*" onChange={(event) => setHeroImageFile(event.target.files?.[0] ?? null)} />
            {heroImageFile && <small className="selected-file">Selected: {heroImageFile.name} ({formatFileSize(heroImageFile.size)})</small>}
          </label>
          <label>
            Hero image URL
            <input name="hero_image" value={siteSettingsForm.hero_image} onChange={handleSiteSettingsChange} required />
          </label>
          <label>
            About eyebrow
            <input name="about_eyebrow" value={siteSettingsForm.about_eyebrow} onChange={handleSiteSettingsChange} required />
          </label>
          <label>
            About title
            <input name="about_title" value={siteSettingsForm.about_title} onChange={handleSiteSettingsChange} required />
          </label>
          <label>
            Upload about image
            <input type="file" accept="image/*" onChange={(event) => setAboutImageFile(event.target.files?.[0] ?? null)} />
            {aboutImageFile && <small className="selected-file">Selected: {aboutImageFile.name} ({formatFileSize(aboutImageFile.size)})</small>}
          </label>
          <label>
            About image URL
            <input name="about_image" value={siteSettingsForm.about_image} onChange={handleSiteSettingsChange} required />
          </label>
          <label>
            About image alt text
            <input name="about_image_alt" value={siteSettingsForm.about_image_alt} onChange={handleSiteSettingsChange} required />
          </label>
          <label>
            About paragraphs
            <textarea name="about_paragraphs" rows="6" value={Array.isArray(siteSettingsForm.about_paragraphs) ? siteSettingsForm.about_paragraphs.join('\n\n') : siteSettingsForm.about_paragraphs} onChange={(event) => setSiteSettingsForm((currentForm) => ({ ...currentForm, about_paragraphs: event.target.value.split(/\n+/).map((paragraph) => paragraph.trim()).filter(Boolean) }))} required />
          </label>
          <button type="submit" disabled={isSavingSiteSettings}>
            {isSavingSiteSettings ? 'Saving...' : 'Save homepage content'}
          </button>
          {isSavingSiteSettings && (
            <div className="admin-upload-progress" role="status" aria-live="polite">
              <div className="admin-upload-progress-track">
                <div className="admin-upload-progress-bar" style={{ width: `${siteUploadProgress ?? 0}%` }} />
              </div>
              <span>{siteUploadProgress === null ? siteUploadStatus : `${siteUploadStatus} ${siteUploadProgress}% uploaded`}</span>
            </div>
          )}
          {siteUploadStatus && !isSavingSiteSettings && <p className="admin-form-status" role="status">{siteUploadStatus}</p>}
        </form>
      </section>
      <section className="admin-next-section" aria-labelledby="comments-title-admin">
        <p className="eyebrow">Comments inbox</p>
        <h2 id="comments-title-admin">Listener feedback</h2>
        <div className="admin-content-list">
          {comments.length === 0 && <p className="admin-status">No comments yet.</p>}
          {comments.map((comment) => (
            <article className="admin-booking-row" key={comment.id}>
              <div>
                <strong>{comment.name} - {comment.mood}</strong>
                <a href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(comment.email)}&su=${encodeURIComponent(`Re: Your comment on INT'L DJ EXPERIENCE`)}&body=${encodeURIComponent(`Hi ${comment.name},\n\nThank you for your comment.\n\n`)}`} target="_blank" rel="noreferrer">Reply in Gmail</a>
                <p>{comment.message}</p>
                              <button type="button" onClick={() => handleCommentDelete(comment.id)}>Delete comment</button>
              </div>
              <small>{new Date(comment.created_at).toLocaleString()}</small>
            </article>
          ))}
        </div>
      </section>
      <section className="admin-next-section" aria-labelledby="video-management-title">
        <p className="eyebrow">Video spotlight</p>
        <h2 id="video-management-title">Manage a live video</h2>
        <form className="admin-content-form" onSubmit={handleVideoSubmit}>
          <label>
            Title
            <input name="title" value={videoForm.title} onChange={handleVideoChange} required />
          </label>
          <label>
            Video URL
            <input name="url" value={videoForm.url} onChange={handleVideoChange} placeholder="https://www.youtube.com/watch?v=... or mp4 link" required />
          </label>
          <label>
            Video type
            <select name="type" value={videoForm.type} onChange={handleVideoChange}>
              <option value="youtube">YouTube</option>
              <option value="vimeo">Vimeo</option>
              <option value="direct">Direct video</option>
            </select>
          </label>
          <label>
            Sort order
            <input name="sort_order" type="number" value={videoForm.sort_order} onChange={handleVideoChange} />
          </label>
          <button type="submit" disabled={isSavingVideo}>
            {isSavingVideo ? 'Saving...' : 'Save video'}
          </button>
          {videoForm.id && <button className="admin-cancel-button" type="button" onClick={cancelVideoEdit}>Cancel edit</button>}
        </form>
        <div className="admin-content-list">
          {videos.map((item) => (
            <article className="admin-content-row" key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <span>{item.url}</span>
              </div>
              <div className="admin-row-actions">
                <button type="button" onClick={() => editVideo(item)}>Edit</button>
                <button type="button" onClick={() => handleVideoDelete(item.id)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="admin-next-section" aria-labelledby="gallery-management-title">
        <p className="eyebrow">Gallery management</p>
        <h2 id="gallery-management-title">Manage the moments</h2>
        <form className="admin-content-form" onSubmit={handleGallerySubmit}>
          <label>
            upload image
            <input type="file" accept="image/*" onChange={(event) => setGalleryFile(event.target.files?.[0] ?? null)} />
            {galleryFile && <small className="selected-file">Selected: {galleryFile.name} ({formatFileSize(galleryFile.size)})</small>}
          </label>
          {Object.entries(emptyGalleryItem).map(([field]) => (
            <label key={field}>
              {field.replace('_', ' ')}
              <input name={field} type={field === 'sort_order' ? 'number' : 'text'} value={galleryForm[field]} onChange={handleGalleryChange} required={field !== 'sort_order' && !(field === 'src' && galleryFile)} />
            </label>
          ))}
          <button type="submit" disabled={isSavingGallery}>
            {isSavingGallery ? 'Saving...' : 'Save gallery item'}
          </button>
          {isSavingGallery && (
            <div className="admin-upload-progress" role="status" aria-live="polite">
              <div className="admin-upload-progress-track">
                <div className="admin-upload-progress-bar" style={{ width: `${galleryUploadProgress ?? 0}%` }} />
              </div>
              <span>{galleryUploadProgress === null ? galleryStatus : `${galleryStatus} ${galleryUploadProgress}% uploaded`}</span>
            </div>
          )}
          {galleryStatus && !isSavingGallery && <p className="admin-form-status" role="status">{galleryStatus}</p>}
          {galleryForm.id && <button className="admin-cancel-button" type="button" onClick={cancelGalleryEdit}>Cancel edit</button>}
        </form>
        <div className="admin-content-list">
          {galleryItems.map((item) => (
            <article className="admin-content-row" key={item.id}>
              <div>
                <strong>{item.alt}</strong>
                <span>{item.src}</span>
              </div>
              <div className="admin-row-actions">
                <button type="button" onClick={() => editGalleryItem(item)}>Edit</button>
                <button type="button" onClick={() => handleGalleryDelete(item.id)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="admin-next-section" aria-labelledby="bookings-title">
        <p className="eyebrow">Booking inbox</p>
        <h2 id="bookings-title">Visitor enquiries</h2>
        <div className="admin-content-list">
          {bookings.length === 0 && <p className="admin-status">No booking enquiries yet.</p>}
          {bookings.map((booking) => (
            <article className="admin-booking-row" key={booking.id}>
              <div>
                <strong>{booking.name} - {booking.event_type}</strong>
                <a href={`mailto:${booking.email}`}>{booking.email}</a>
                <a href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(booking.email)}&su=${encodeURIComponent(`Re: Booking enquiry for INT'L DJ EXPERIENCE`)}&body=${encodeURIComponent(`Hi ${booking.name},\n\nThank you for your booking enquiry.\n\n`)}`} target="_blank" rel="noreferrer">Reply in Gmail</a>
                <p>{booking.message}</p>
              </div>
              <select value={booking.status} onChange={(event) => handleBookingStatusChange(booking.id, event.target.value)} aria-label={`Status for ${booking.name}`}>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="booked">Booked</option>
                <option value="closed">Closed</option>
              </select>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

export default AdminDashboard
