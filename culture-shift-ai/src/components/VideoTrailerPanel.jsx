import { useEffect, useRef, useState } from 'react'
import { generateTrailerVideo } from '../utils/trailerGenerator.js'
import { getVideoTrailer, getVideoTrailerCapability, startVideoTrailer, videoTrailerContentUrl } from '../api/adaptationApi.js'
import { PlayIcon } from './Icons.jsx'
import { cultureLabel } from '../data/stories.js'

const TRAILER_CTA = {
  Hindi: 'आगे क्या होता है जानने के लिए पूरी कहानी सुनें।',
  English: 'Hear the complete story to know what happens next.',
  Bhojpuri: 'आगे का होई, ई जाने खातिर पूरा कहानी सुनीं।',
  Marathi: 'पुढे काय होते हे जाणून घेण्यासाठी संपूर्ण कथा ऐका.',
  Bengali: 'এরপর কী হয় জানতে সম্পূর্ণ গল্পটি শুনুন।',
  Tamil: 'அடுத்து என்ன நடக்கிறது என்பதை அறிய முழுக் கதையையும் கேளுங்கள்.',
  Telugu: 'తర్వాత ఏమి జరుగుతుందో తెలుసుకోవడానికి పూర్తి కథను వినండి.',
  Kannada: 'ಮುಂದೆ ಏನಾಗುತ್ತದೆ ಎಂಬುದನ್ನು ತಿಳಿಯಲು ಸಂಪೂರ್ಣ ಕಥೆಯನ್ನು ಕೇಳಿ.',
  Malayalam: 'അടുത്തതായി എന്ത് സംഭവിക്കുമെന്ന് അറിയാൻ മുഴുവൻ കഥയും കേൾക്കൂ.',
  Punjabi: 'ਅੱਗੇ ਕੀ ਹੁੰਦਾ ਹੈ ਜਾਣਨ ਲਈ ਪੂਰੀ ਕਹਾਣੀ ਸੁਣੋ।',
  Gujarati: 'આગળ શું થાય છે તે જાણવા માટે સંપૂર્ણ વાર્તા સાંભળો.',
  Urdu: 'آگے کیا ہوتا ہے جاننے کے لیے پوری کہانی سنیں۔',
  Odia: 'ଆଗକୁ କଣ ହେବ ଜାଣିବା ପାଇଁ ସମ୍ପୂର୍ଣ୍ଣ କାହାଣୀ ଶୁଣନ୍ତୁ।',
  Assamese: 'ইয়াৰ পিছত কি হয় জানিবলৈ সম্পূৰ্ণ কাহিনীটো শুনক।',
  Spanish: 'Escucha la historia completa para descubrir qué sucede después.',
  Portuguese: 'Ouça a história completa para descobrir o que acontece depois.',
  Korean: '다음 이야기가 궁금하다면 전체 스토리를 들어보세요.',
  Yoruba: 'Gbọ́ ìtàn náà ní kíkún láti mọ ohun tó ṣẹlẹ̀ lẹ́yìn náà.',
}

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
      { label: details.cliffhanger, text: TRAILER_CTA[result.language] || TRAILER_CTA.English },
    ]
  }
  const quote = result.adaptedQuote || 'A familiar story is about to change.'
  return [
    { label: 'The hook', text: quote },
    { label: 'The tension rises', text: `Every choice pulls the truth closer in this ${result.genre} reimagining.` },
    { label: 'But the final secret was never meant to be heard…', text: TRAILER_CTA[result.language] || TRAILER_CTA.English },
  ]
}

// Browser-session job registry. Jobs live independently of React screens, so
// navigation cannot cancel Sora polling or discard a completed trailer.
const trailerJobs = new Map()

function updateTrailerJob(jobKey, patch) {
  const job = trailerJobs.get(jobKey)
  if (!job) return
  job.state = { ...job.state, ...patch }
  job.listeners.forEach((listener) => listener(job.state))
}

function subscribeToTrailerJob(jobKey, listener, initialState) {
  if (!trailerJobs.has(jobKey)) {
    trailerJobs.set(jobKey, { state: initialState, listeners: new Set() })
  }
  const job = trailerJobs.get(jobKey)
  job.listeners.add(listener)
  listener(job.state)
  return () => job.listeners.delete(listener)
}

function startPersistentTrailerJob(jobKey, { story, result, accent }) {
  const existing = trailerJobs.get(jobKey)
  if (existing?.state.status === 'running' || existing?.state.status === 'completed') return
  if (existing) {
    existing.state = { videoUrl: '', progress: 1, error: '', provider: '', concept: null, status: 'running' }
    existing.listeners.forEach((listener) => listener(existing.state))
  } else {
    trailerJobs.set(jobKey, {
      state: { videoUrl: '', progress: 1, error: '', provider: '', concept: null, status: 'running' },
      listeners: new Set(),
    })
  }

  async function run() {
    let concept = null
    try {
      const job = await startVideoTrailer({ story, result })
      concept = job.trailer_concept || null
      updateTrailerJob(jobKey, { concept })
      let current = job
      let transientPollFailures = 0
      while (!['completed', 'failed'].includes(current.status)) {
        updateTrailerJob(jobKey, { progress: Math.max(1, current.progress || 1) })
        await new Promise((resolve) => setTimeout(resolve, 10000))
        try {
          current = await getVideoTrailer(job.id)
          transientPollFailures = 0
          updateTrailerJob(jobKey, { error: '' })
        } catch (pollError) {
          transientPollFailures += 1
          if (transientPollFailures >= 5) throw pollError
          updateTrailerJob(jobKey, {
            error: `Video provider temporarily unavailable. Retrying status check (${transientPollFailures}/5)…`,
          })
          await new Promise((resolve) => setTimeout(resolve, 3000 * transientPollFailures))
        }
      }
      if (current.status === 'failed') throw new Error(current.error?.message || 'The external video render failed.')
      updateTrailerJob(jobKey, {
        videoUrl: videoTrailerContentUrl(job.id),
        provider: 'Sora 2',
        progress: 100,
        error: '',
        status: 'completed',
      })
    } catch (error) {
      try {
        updateTrailerJob(jobKey, { error: `${error.message || 'External generation failed'} Using the local demo renderer instead.` })
        const blob = await generateTrailerVideo({
          title: story.title,
          genre: result.genre,
          culture: result.culture,
          accent,
          scenes: trailerScenes(result, concept),
        }, (progress) => updateTrailerJob(jobKey, { progress }))
        updateTrailerJob(jobKey, {
          videoUrl: URL.createObjectURL(blob),
          provider: 'Local fallback',
          progress: 100,
          concept,
          status: 'completed',
        })
      } catch (fallbackError) {
        updateTrailerJob(jobKey, {
          progress: 0,
          error: fallbackError.message || 'The trailer could not be generated.',
          status: 'failed',
        })
      }
    }
  }

  run()
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

function TrailerVideo({ videoUrl, storyTitle, cliffhanger, callToAction }) {
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
          <div className="trailer-end-card-glow" aria-hidden="true" />
          <span>POCKETFM ORIGINAL</span>
          <h3>{storyTitle}</h3>
          <p>{cliffhanger || 'The truth is still waiting to be heard…'}</p>
          <strong>{callToAction || 'Hear the complete story to know what happens next.'}</strong>
        </div>
      )}
    </div>
  )
}

export default function VideoTrailerPanel({ jobKey, story, result, accent, customization, isLatest, autoStart = false, initialTrailer, onTrailerChange }) {
  const [videoUrl, setVideoUrl] = useState(() => initialTrailer?.videoUrl || '')
  const [progress, setProgress] = useState(() => initialTrailer?.progress || 0)
  const [error, setError] = useState('')
  const [provider, setProvider] = useState(() => initialTrailer?.provider || '')
  const [isEnabled, setIsEnabled] = useState(false)
  const [concept, setConcept] = useState(() => initialTrailer?.concept || null)
  const autoStartedRef = useRef(false)
  const isGenerating = progress > 0 && progress < 100 && !videoUrl

  useEffect(() => subscribeToTrailerJob(jobKey, (state) => {
    setVideoUrl(state.videoUrl)
    setProgress(state.progress)
    setError(state.error)
    setProvider(state.provider)
    setConcept(state.concept)
    if (state.status === 'completed') {
      onTrailerChange?.({
        videoUrl: state.videoUrl,
        provider: state.provider,
        progress: 100,
        concept: state.concept,
      })
    }
  }, {
    videoUrl: initialTrailer?.videoUrl || '',
    progress: initialTrailer?.progress || 0,
    error: '',
    provider: initialTrailer?.provider || '',
    concept: initialTrailer?.concept || null,
    status: initialTrailer?.videoUrl ? 'completed' : 'idle',
  }), [jobKey])

  useEffect(() => {
    let cancelled = false
    let retryTimer
    let attempts = 0

    async function checkCapability() {
      const enabled = await getVideoTrailerCapability()
      if (cancelled) return
      if (enabled !== null) {
        setIsEnabled(enabled)
        return
      }
      attempts += 1
      if (attempts < 10) retryTimer = window.setTimeout(checkCapability, 1500)
    }

    checkCapability()
    return () => {
      cancelled = true
      window.clearTimeout(retryTimer)
    }
  }, [])

  function generate() {
    if (!result || videoUrl) return
    startPersistentTrailerJob(jobKey, { story, result, accent })
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
        <span className="trailer-variation">{customization.genre} • {cultureLabel(customization.culture)} • {customization.language}</span>
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
            <TrailerVideo
              videoUrl={videoUrl}
              storyTitle={story.title}
              cliffhanger={concept?.suspense_line || result.teaserDetails?.cliffhanger}
              callToAction={concept?.call_to_action || TRAILER_CTA[result.language]}
            />
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
