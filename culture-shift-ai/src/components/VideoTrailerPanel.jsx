import { useEffect, useRef, useState } from 'react'
import { generateTrailerVideo } from '../utils/trailerGenerator.js'
import { getVideoTrailer, getVideoTrailerCapability, startVideoTrailer, videoTrailerContentUrl } from '../api/adaptationApi.js'
import { PlayIcon } from './Icons.jsx'

function trailerScenes(result, concept) {
  if (concept) {
    return [
      { label: 'The world', text: concept.visual_arc[0] },
      { label: 'The stakes rise', text: concept.visual_arc[1] },
      { label: concept.suspense_line, text: concept.call_to_action },
    ]
  }
  const details = result.teaserDetails
  if (details) {
    return [
      { label: 'The hook', text: details.hook },
      { label: 'The tension rises', text: details.risingTension },
      { label: details.cliffhanger, text: 'Hear the complete story to know more.' },
    ]
  }
  const quote = result.adaptedQuote || 'A familiar story is about to change.'
  return [
    { label: 'The hook', text: quote },
    { label: 'The tension rises', text: `Every choice pulls the truth closer in this ${result.genre} reimagining.` },
    { label: 'But the final secret was never meant to be heard…', text: 'Hear the complete story to know more.' },
  ]
}

function StoryboardPreview({ scenes, accent, progress }) {
  const [sceneIndex, setSceneIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => setSceneIndex((index) => (index + 1) % scenes.length), 2800)
    return () => window.clearInterval(timer)
  }, [scenes.length])

  const scene = scenes[sceneIndex]
  return (
    <div className="storyboard-preview" style={{ '--accent': accent }} aria-live="polite">
      <div className="storyboard-orb storyboard-orb-one" />
      <div className="storyboard-orb storyboard-orb-two" />
      <span className="storyboard-kicker">ANIMATED STORYBOARD • FINAL VIDEO {progress}%</span>
      <strong key={`${sceneIndex}-${scene.text}`}>{scene.text}</strong>
      <span className="storyboard-caption">{scene.label}</span>
      <div className="trailer-progress"><span style={{ width: `${progress}%` }} /></div>
      <div className="storyboard-dots">
        {scenes.map((item, index) => <i key={item.label} className={index === sceneIndex ? 'active' : ''} />)}
      </div>
    </div>
  )
}

function TrailerVideo({ videoUrl, storyTitle }) {
  const [showEndCard, setShowEndCard] = useState(false)

  function updateEndCard(event) {
    const video = event.currentTarget
    setShowEndCard(Number.isFinite(video.duration) && video.duration - video.currentTime <= 4)
  }

  return (
    <div className="trailer-video-frame">
      <video
        src={videoUrl}
        controls
        autoPlay
        playsInline
        aria-label={`Animated trailer for ${storyTitle}`}
        onTimeUpdate={updateEndCard}
        onSeeked={updateEndCard}
        onPlay={updateEndCard}
      />
      {showEndCard && (
        <div className="trailer-end-card">
          <span>THE STORY HAS ONLY JUST BEGUN</span>
          <strong>Hear the complete story to know what happens next.</strong>
        </div>
      )}
    </div>
  )
}

export default function VideoTrailerPanel({ story, result, accent, customization, isLatest, autoStart = false }) {
  const [videoUrl, setVideoUrl] = useState('')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [provider, setProvider] = useState('')
  const [isEnabled, setIsEnabled] = useState(false)
  const [concept, setConcept] = useState(null)
  const autoStartedRef = useRef(false)
  const isGenerating = progress > 0 && progress < 100 && !videoUrl

  useEffect(() => () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl)
  }, [videoUrl])

  useEffect(() => {
    getVideoTrailerCapability().then(setIsEnabled)
  }, [])

  async function generate() {
    if (!result || videoUrl) return
    setError('')
    setProgress(1)
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setVideoUrl('')
    try {
      const job = await startVideoTrailer({ story, result })
      setConcept(job.trailer_concept || null)
      let current = job
      while (!['completed', 'failed'].includes(current.status)) {
        setProgress(Math.max(1, current.progress || 1))
        await new Promise((resolve) => setTimeout(resolve, 10000))
        current = await getVideoTrailer(job.id)
      }
      if (current.status === 'failed') throw new Error(current.error?.message || 'The external video render failed.')
      setVideoUrl(videoTrailerContentUrl(job.id))
      setProvider('Sora 2')
      setProgress(100)
    } catch (err) {
      try {
        setError(`${err.message || 'External generation failed'} Using the local demo renderer instead.`)
        const blob = await generateTrailerVideo({
          title: story.title,
          genre: result.genre,
          culture: result.culture,
          accent,
          scenes: trailerScenes(result, concept),
        }, setProgress)
        setVideoUrl(URL.createObjectURL(blob))
        setProvider('Local fallback')
        setProgress(100)
      } catch (fallbackError) {
        setProgress(0)
        setError(fallbackError.message || 'The trailer could not be generated.')
      }
    }
  }

  useEffect(() => {
    if (!isEnabled || !autoStart || autoStartedRef.current) return
    autoStartedRef.current = true
    generate()
  }, [isEnabled, autoStart])

  if (!isEnabled) return null

  return (
    <section className="video-trailer-panel" aria-labelledby="video-trailer-heading">
      <div className="video-trailer-copy">
        <span className="video-kicker">NEW • AI VIDEO GENERATED FROM YOUR ADAPTATION</span>
        <h4 id="video-trailer-heading">Animated Video Trailer {!isLatest && <span className="saved-trailer-tag">Saved</span>}</h4>
        <span className="trailer-variation">{customization.genre} • {customization.culture} • {customization.language}</span>
        <p>A spoiler-safe concept is extracted from the complete adapted story, then rendered as a 20-second cinematic trailer.</p>
        {!videoUrl && <button className="cta-gradient trailer-generate" onClick={generate} disabled={isGenerating}>
          <PlayIcon /> {isGenerating ? `Rendering video… ${progress}%` : 'Generate Video Trailer'}
        </button>}
        {videoUrl && <span className="trailer-complete">Trailer ready • Change a customization to create a different version</span>}
        {error && <p className="trailer-error" role="alert">{error}</p>}
      </div>

      <div className="video-preview-shell">
        {videoUrl ? (
          <>
            <TrailerVideo videoUrl={videoUrl} storyTitle={story.title} />
            <a className="trailer-download" href={videoUrl} download={`${story.id || 'story'}-trailer.${provider === 'Local fallback' ? 'webm' : 'mp4'}`}>Download video</a>
            <span className="trailer-provider">Generated with {provider}</span>
          </>
        ) : isGenerating ? (
          <StoryboardPreview scenes={trailerScenes(result, concept)} accent={accent} progress={progress} />
        ) : (
          <div className="video-placeholder" style={{ '--accent': accent }}>
            <PlayIcon />
            <span>Your trailer preview will appear here</span>
          </div>
        )}
      </div>
    </section>
  )
}
