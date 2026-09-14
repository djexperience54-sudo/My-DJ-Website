import { useEffect, useState } from 'react'
import './App.css'
import AboutSection from './components/AboutSection'
import BookingSection from './components/BookingSection'
import CommentSection from './components/CommentSection'
import EventList from './components/EventList'
import GalleryPreview from './components/GalleryPreview'
import GenreNavigation from './components/GenreNavigation'
import MixtapeCard from './components/MixtapeCard'
import MusicPlatforms from './components/MusicPlatforms'
import MusicPlayer from './components/MusicPlayer'
import SiteFooter from './components/SiteFooter'
import { getDownloadUrl } from './lib/cloudinaryUpload'
import { apiUrl } from './lib/api'
import { upcomingEvents } from './data/events'
import { genres } from './data/genres'
import { featuredMixtapes } from './data/mixtapes'
import { socialPlatforms } from './data/profile'
import { galleryItems, musicPlatforms } from './data/media'

const navigationItems = ['Mixes', 'Sound', 'Events', 'About']

const defaultSiteSettings = {
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

function SiteSearch() {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchStatus, setSearchStatus] = useState('')

  function handleSubmit(event) {
    event.preventDefault()

    const normalizedTerm = searchTerm.trim().toLowerCase()

    if (!normalizedTerm) {
      setSearchStatus('Enter a search term.')
      return
    }

    const matchingSections = Array.from(document.querySelectorAll('main section')).filter((section) =>
      section.textContent.toLowerCase().includes(normalizedTerm)
    )

    if (matchingSections.length === 0) {
      setSearchStatus('No matching content found.')
      return
    }

    setSearchStatus(`${matchingSections.length} matching section${matchingSections.length === 1 ? '' : 's'} found.`)
    matchingSections[0].scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <form className="site-search" role="search" onSubmit={handleSubmit}>
      <label htmlFor="site-search-input">Search the site</label>
      <input
        id="site-search-input"
        type="search"
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        placeholder="Search the site"
        aria-describedby="search-status"
      />
      <button type="submit">Search</button>
      <output id="search-status" className="search-status" aria-live="polite">
        {searchStatus}
      </output>
    </form>
  )
}

function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <>
      <header className="site-header">
        <div className="site-container header-content">
          <a className="brand" href="#top">
            INT'L DJ <span>EXPERIENCE</span>
          </a>
          <nav className={isMenuOpen ? 'is-open' : ''} aria-label="Primary navigation">
            {navigationItems.map((item) => (
              <a href={`#${item.toLowerCase()}`} key={item} onClick={() => setIsMenuOpen(false)}>
                {item}
              </a>
            ))}
          </nav>
          <SiteSearch />
          <a className="book-button" href="#book">
            Book Int'L DJ Experience
          </a>
          <button
            className="menu-button"
            type="button"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? 'Close' : 'Menu'}
          </button>
        </div>
      </header>
    </>
  )
}

function MixtapeLibrary({ mixtapes, onPlay }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('All genres')
  const genresInLibrary = ['All genres', ...new Set(mixtapes.map((mixtape) => mixtape.genre))]
  const normalizedSearchTerm = searchTerm.trim().toLowerCase()
  const filteredMixtapes = mixtapes.filter((mixtape) => {
    const matchesGenre = selectedGenre === 'All genres' || mixtape.genre === selectedGenre
    const searchableText = `${mixtape.title} ${mixtape.genre} ${mixtape.description}`.toLowerCase()
    return matchesGenre && searchableText.includes(normalizedSearchTerm)
  })

  return (
    <section id="mixtape-library" className="library-section" aria-labelledby="library-title">
      <div className="site-container">
        <div className="section-heading">
          <div>
            <p className="eyebrow">The collection</p>
            <h2 id="library-title">Mixtape Library</h2>
          </div>
          <span className="library-count">{filteredMixtapes.length} mix{filteredMixtapes.length === 1 ? '' : 'es'}</span>
        </div>
        <div className="library-filters">
          <label>
            Search mixes
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Title, genre or mood"
            />
          </label>
          <label>
            Genre
            <select data-genre-filter value={selectedGenre} onChange={(event) => setSelectedGenre(event.target.value)}>
              {genresInLibrary.map((genre) => <option key={genre}>{genre}</option>)}
            </select>
          </label>
        </div>
        {filteredMixtapes.length > 0 ? (
          <div className="mix-card-grid">
            {filteredMixtapes.map((mixtape) => <MixtapeCard key={mixtape.id} mixtape={mixtape} onPlay={onPlay} />)}
          </div>
        ) : (
          <p className="data-status">No mixes match your search.</p>
        )}
      </div>
    </section>
  )
}

function MixtapeDetail({ mixtape, onPlay }) {
  return (
    <section className="mix-detail-section" aria-labelledby="mix-detail-title">
      <div className="site-container mix-detail-layout">
        <img src={mixtape.artwork} alt={`${mixtape.title} artwork`} />
        <div>
          <a className="back-link" href="/#library-title">Back to mixtape library</a>
          <p className="eyebrow">{mixtape.genre}</p>
          <h1 id="mix-detail-title">{mixtape.title}</h1>
          <p className="mix-detail-description">{mixtape.description}</p>
          {mixtape.audio_url ? (
            <>
              <audio controls src={mixtape.audio_url} aria-label={`Play ${mixtape.title}`} />
              <div className="mix-detail-actions">
                <button className="mix-action-button mix-action-button--secondary" type="button" onClick={() => onPlay(mixtape)}>Play in site player</button>
                <a className="mix-action-button mix-action-button--primary" href={getDownloadUrl(mixtape.audio_url, mixtape.title)} download>Download mix</a>
              </div>
            </>
          ) : (
            <p className="data-status">Audio is not available for this mix yet.</p>
          )}
        </div>
      </div>
    </section>
  )
}

function SupportSection() {
  async function handleMomoClick() {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText('0558520091')
      }
    } catch {
      // Ignore clipboard failures and keep the number visible to the user.
    }
  }

  return (
    <section className="support-section" id="support" aria-labelledby="support-title">
      <div className="site-container support-content">
        <div className="support-header">
          <p className="eyebrow">Support the DJ</p>
          <h2 id="support-title">Show Some Love to the DJ</h2>
        </div>
        <div className="support-grid">
          <button type="button" className="support-card support-card--momo" aria-label="Copy mobile money number 0558520091" onClick={handleMomoClick}>
            <span className="support-icon" aria-hidden="true">💸</span>
            <span className="support-label">MTN Mobile Money</span>
            <strong>0558520091</strong>
            <small>Tap to copy the number</small>
          </button>
          <a
            className="support-card support-card--paypal"
            href="https://www.paypal.com/paypalme/DapaahJerryJohn?v=1&utm_source=unp&utm_medium=email&utm_campaign=RT000481&utm_unptid=00053b52-5b9a-11f1-80c0-a3cadf221da4&ppid=RT000481&cnac=AE&rsta=en_US%28en-AE%29&cust=CTQ8PK3AYDEKN&unptid=00053b52-5b9a-11f1-80c0-a3cadf221da4&calc=66639baf653ce&unp_tpcid=ppme-social-business-profile-created&page=main%3Aemail%3ART000481&pgrp=main%3Aemail&e=cl&mchn=em&s=ci&mail=sys&appVersion=1.414.0&tenant_name=PAYPAL&xt=175543%2C104038%2C180658&link_ref=paypalme_dapaahjerryjohn"
            target="_blank"
            rel="noreferrer"
            aria-label="Send money through PayPal"
          >
            <span className="support-icon" aria-hidden="true">💙</span>
            <span className="support-label">PayPal</span>
            <strong>Support the DJ</strong>
            <small>paypal.me/DapaahJerryJohn</small>
          </a>
        </div>
      </div>
    </section>
  )
}

function ShareMixtapeButton({ mixtape }) {
  const [shareStatus, setShareStatus] = useState('')
  const [shareLinks, setShareLinks] = useState([])

  function getShareUrl() {
    return `${window.location.origin}/mixes/${encodeURIComponent(mixtape.id)}`
  }

  async function handleShare() {
    const shareUrl = getShareUrl()
    const shareData = {
      title: `${mixtape.title} | INT'L DJ EXPERIENCE`,
      text: `Listen to ${mixtape.title} by INT'L DJ EXPERIENCE`,
      url: shareUrl
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
        setShareStatus('Share menu opened.')
        return
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }
      }
    }

    const encodedUrl = encodeURIComponent(shareUrl)
    const encodedText = encodeURIComponent(`${shareData.text}: ${shareUrl}`)
    const fallbackLinks = [
      { label: 'WhatsApp', url: `https://wa.me/?text=${encodedText}` },
      { label: 'Telegram', url: `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(shareData.text)}` },
      { label: 'Facebook', url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
      { label: 'X', url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareData.text)}&url=${encodedUrl}` },
      { label: 'Email', url: `mailto:?subject=${encodeURIComponent(shareData.title)}&body=${encodedText}` }
    ]

    setShareLinks(fallbackLinks)
    setShareStatus('Choose where to share this mixtape.')

    try {
      await navigator.clipboard?.writeText(shareUrl)
    } catch {
      // The share link remains available through the opened share target.
    }
  }

  return (
    <div className="share-mixtape-action">
      <button className="text-link" type="button" onClick={handleShare}>Share mixtape</button>
      {shareStatus && <small className="share-status" role="status">{shareStatus}</small>}
      {shareLinks.length > 0 && (
        <div className="share-links" aria-label="Share options">
          {shareLinks.map((link) => <a key={link.label} href={link.url} target={link.label === 'Email' ? undefined : '_blank'} rel={link.label === 'Email' ? undefined : 'noreferrer'}>{link.label}</a>)}
        </div>
      )}
    </div>
  )
}

function getVideoEmbedUrl(videoUrl) {
  if (!videoUrl) {
    return ''
  }

  const normalizedUrl = videoUrl.trim()

  const youtubeMatch = normalizedUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/)
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}?rel=0`
  }

  const vimeoMatch = normalizedUrl.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`
  }

  return normalizedUrl
}

function ScrollHintButton() {
  const [isAtTop, setIsAtTop] = useState(true)
  const [scrollProgress, setScrollProgress] = useState(0)

  useEffect(() => {
    function handleScroll() {
      const distanceFromBottom = document.documentElement.scrollHeight - (window.innerHeight + window.scrollY)
      setIsAtTop(distanceFromBottom < 120 && window.scrollY < 120)
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight
      setScrollProgress(scrollableHeight > 0 ? Math.min(100, Math.round((window.scrollY / scrollableHeight) * 100)) : 0)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  function handleScrollAction() {
    if (window.scrollY < 180) {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
      return
    }

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <button type="button" className="scroll-hint-button" style={{ '--scroll-progress': `${scrollProgress}%` }} onClick={handleScrollAction} aria-label={isAtTop ? 'Scroll to bottom' : 'Scroll to top'}>
      {isAtTop ? '↓' : '↑'}
    </button>
  )
}

function App() {
  const [mixtapes, setMixtapes] = useState(featuredMixtapes)
  const [events, setEvents] = useState(upcomingEvents)
  const [gallery, setGallery] = useState(galleryItems)
  const [featuredVideo, setFeaturedVideo] = useState(null)
  const [siteSettings, setSiteSettings] = useState(defaultSiteSettings)
  const [isLoadingMixtapes, setIsLoadingMixtapes] = useState(true)
  const [mixtapeError, setMixtapeError] = useState('')
  const [contentError, setContentError] = useState('')
  const [currentMixtape, setCurrentMixtape] = useState(null)
  const detailId = window.location.pathname.startsWith('/mixes/') ? window.location.pathname.split('/')[2] : ''

  const aboutProfile = {
    eyebrow: siteSettings.about_eyebrow,
    name: siteSettings.about_title,
    image: siteSettings.about_image,
    imageAlt: siteSettings.about_image_alt,
    paragraphs: siteSettings.about_paragraphs?.length ? siteSettings.about_paragraphs : defaultSiteSettings.about_paragraphs
  }

  useEffect(() => {
    function handleGenreSelect(event) {
      const targetGenre = event.detail
      const select = document.querySelector('[data-genre-filter]')
      const library = document.getElementById('mixtape-library')

      if (select) {
        select.value = targetGenre
        select.dispatchEvent(new Event('change', { bubbles: true }))
      }

      if (library) {
        library.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }

    window.addEventListener('genre-select', handleGenreSelect)
    return () => window.removeEventListener('genre-select', handleGenreSelect)
  }, [])

  useEffect(() => {
    async function loadContent() {
      try {
        const contentResponse = await fetch(apiUrl('/api/site-content'))
        let content

        if (contentResponse.ok) {
          ({ data: content } = await contentResponse.json())
        } else {
          const [mixtapeResponse, eventResponse, galleryResponse] = await Promise.all([
            fetch(apiUrl('/api/mixtapes')),
            fetch(apiUrl('/api/events')),
            fetch(apiUrl('/api/gallery'))
          ])

          if (!mixtapeResponse.ok || !eventResponse.ok || !galleryResponse.ok) {
            throw new Error('Some website content could not be loaded.')
          }

          const [mixtapeResult, eventResult, galleryResult] = await Promise.all([
            mixtapeResponse.json(),
            eventResponse.json(),
            galleryResponse.json()
          ])

          content = {
            mixtapes: mixtapeResult.data,
            events: eventResult.data,
            gallery: galleryResult.data,
            siteSettings: null,
            featuredVideo: null
          }
        }

        setMixtapes(content.mixtapes)
        setEvents(content.events)
        setGallery(content.gallery)

        if (content.siteSettings) {
          setSiteSettings({
            ...defaultSiteSettings,
            ...content.siteSettings,
            about_paragraphs: Array.isArray(content.siteSettings.about_paragraphs)
              ? content.siteSettings.about_paragraphs
              : (content.siteSettings.about_paragraphs ? String(content.siteSettings.about_paragraphs).split(/\n+/) : defaultSiteSettings.about_paragraphs)
          })
        }

        if (content.featuredVideo) {
          setFeaturedVideo(content.featuredVideo)
        }
      } catch (error) {
        setContentError(error.message)
        setMixtapeError(error.message)
      } finally {
        setIsLoadingMixtapes(false)
      }
    }

    loadContent()
  }, [])

  const detailMixtape = mixtapes.find((mixtape) => mixtape.id === detailId)

  useEffect(() => {
    if (!detailMixtape) {
      return
    }

    const shareUrl = `${window.location.origin}/mixes/${encodeURIComponent(detailMixtape.id)}`
    document.title = `${detailMixtape.title} | INT'L DJ EXPERIENCE`

    const metadata = {
      description: detailMixtape.description,
      'og:title': detailMixtape.title,
      'og:description': detailMixtape.description,
      'og:image': detailMixtape.artwork,
      'og:url': shareUrl,
      'twitter:title': detailMixtape.title,
      'twitter:description': detailMixtape.description,
      'twitter:image': detailMixtape.artwork
    }

    Object.entries(metadata).forEach(([name, content]) => {
      const selector = name.startsWith('og:') || name.startsWith('twitter:')
        ? `meta[property="${name}"]`
        : `meta[name="${name}"]`
      let element = document.head.querySelector(selector)

      if (!element) {
        element = document.createElement('meta')
        if (name.startsWith('og:') || name.startsWith('twitter:')) {
          element.setAttribute('property', name)
        } else {
          element.setAttribute('name', name)
        }
        document.head.appendChild(element)
      }

      element.setAttribute('content', content)
    })
  }, [detailMixtape])

  if (detailId && detailMixtape) {
    return (
      <div id="top">
        <SiteHeader />
        <main><MixtapeDetail mixtape={detailMixtape} onPlay={setCurrentMixtape} /></main>
        <SiteFooter />
        <MusicPlayer mixtape={currentMixtape} onClose={() => setCurrentMixtape(null)} />
      </div>
    )
  }

  return (
    <div id="top">
      <SiteHeader />
      <main>
        <section className="hero-section" aria-labelledby="hero-title">
          <div className="site-container hero-layout">
            <div className="hero-copy">
              <p className="eyebrow">Afrobeats & Amapiano DJ</p>
              <h1 id="hero-title">{siteSettings.hero_title}</h1>
              <p className="hero-description">
                {siteSettings.hero_subtitle}
              </p>
              <div className="hero-actions">
                <a className="primary-button" href="#mixes">Listen to latest mix</a>
                <a className="secondary-button" href="#book">Book Int'L DJ Experience</a>
              </div>
            </div>
            <div className="hero-image">
              <img
                src={siteSettings.hero_image || '/Hero-view.jpg'}
                alt="DJ performing to a crowd"
              />
            </div>
          </div>
        </section>
        <section className="video-section" aria-labelledby="video-title">
          <div className="site-container">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Live moment</p>
                <h2 id="video-title">Featured Video</h2>
              </div>
            </div>
            {featuredVideo ? (
              <div className="video-card">
                {featuredVideo.url.includes('youtube.com') || featuredVideo.url.includes('youtu.be') || featuredVideo.url.includes('vimeo.com') ? (
                  <iframe
                    src={getVideoEmbedUrl(featuredVideo.url)}
                    title={featuredVideo.title || 'Featured video'}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                ) : (
                  <video controls src={featuredVideo.url} preload="metadata" />
                )}
                <div className="video-copy">
                  <p className="eyebrow">Spotlight</p>
                  <h3>{featuredVideo.title}</h3>
                </div>
              </div>
            ) : (
              <div className="video-card video-card--placeholder" aria-label="Video placeholder preview">
                <div className="video-placeholder">
                  <span className="video-play-button">▶</span>
                  <div>
                    <strong>Video slot placeholder</strong>
                    <small>Add your featured performance clip here</small>
                  </div>
                </div>
                <div className="video-copy">
                  <p className="eyebrow">Spotlight</p>
                  <h3>Featured clip</h3>
                  <p className="video-placeholder-text">This preview shows where your live video will appear on the homepage.</p>
                </div>
              </div>
            )}
          </div>
        </section>
        <section className="mixes-section" id="mixes" aria-labelledby="mixes-title">
          <div className="site-container">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Featured sound</p>
                <h2 id="mixes-title">Latest Mixtape</h2>
              </div>
              <a href="#sound">Browse the sound</a>
            </div>
            {isLoadingMixtapes && <p className="data-status">Loading mixtapes...</p>}
            {mixtapeError && <p className="data-status">Using local mixtape data.</p>}
            {mixtapes.length > 0 && (
              <>
                <div className="featured-mixtape">
                  <img src={mixtapes[0].artwork} alt={`${mixtapes[0].title} artwork`} />
                  <div className="featured-mixtape-content">
                    <p className="mix-card-genre">{mixtapes[0].genre} - 2026</p>
                    <h3>{mixtapes[0].title}</h3>
                    <p>{mixtapes[0].description}</p>
                    <audio controls src={mixtapes[0].audio_url || undefined} aria-label={`Play ${mixtapes[0].title}`} />
                    {mixtapes[0].audio_url && (
                      <a className="text-link" href={getDownloadUrl(mixtapes[0].audio_url, mixtapes[0].title)} download>
                        Download mix
                      </a>
                    )}
                    <ShareMixtapeButton mixtape={mixtapes[0]} />
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
        <MixtapeLibrary mixtapes={mixtapes} onPlay={setCurrentMixtape} />
        <section className="sound-section" id="sound" aria-labelledby="sound-title">
          <div className="site-container">
            <p className="eyebrow">Browse by genre</p>
            <h2 id="sound-title">The Sound</h2>
            <p className="section-description">
              You can browse your favorite genre mixtapes and find the sound that matches your night.
            </p>
            <GenreNavigation genres={genres} mixtapes={mixtapes} />
          </div>
        </section>
        <section className="events-section" id="events" aria-labelledby="events-title">
          <div className="site-container">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Where the sound lands</p>
                <h2 id="events-title">Upcoming Events</h2>
              </div>
            </div>
            {contentError && <p className="data-status">Using local event data.</p>}
            <EventList events={events} />
          </div>
        </section>
        <AboutSection profile={aboutProfile} platforms={socialPlatforms} />
        <GalleryPreview items={gallery} />
        <MusicPlatforms platforms={musicPlatforms} />
        <SupportSection />
        <CommentSection />
        <BookingSection />
      </main>
      <SiteFooter />
      <MusicPlayer mixtape={currentMixtape} onClose={() => setCurrentMixtape(null)} />
      <ScrollHintButton />
    </div>
  )
}

export default App
