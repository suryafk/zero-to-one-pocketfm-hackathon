import { useEffect, useState } from 'react'
import { generateTrailerVideo } from '../utils/trailerGenerator.js'
import { getVideoTrailer, getVideoTrailerCapability, startVideoTrailer, videoTrailerContentUrl } from '../api/adaptationApi.js'
import { PlayIcon } from './Icons.jsx'

function trailerScenes(result) {
  const details = result.teaserDetails
  if (details) {
    return [
      { label: 'The hook', text: details.hook },
      { label: 'The tension rises', text: details.risingTension },
      { label: 'The cliffhanger', text: details.cliffhanger },
    ]
  }
  const quote = result.adaptedQuote || 'A familiar story is about to change.'
  return [
    { label: 'The hook', text: quote },
    { label: 'The tension rises', text: `Every choice pulls the truth closer in this ${result.genre} reimagining.` },
    { label: 'The cliffhanger', text: 'But the final secret was never meant to be heard…' },
  ]
}

export default function VideoTrailerPanel({ story, result, accent }) {
  const [videoUrl, setVideoUrl] = useState('')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [provider, setProvider] = useState('')
  const [isEnabled, setIsEnabled] = useState(false)
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
          scenes: trailerScenes(result),
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

  if (!isEnabled) return null

  return (
    <section className="video-trailer-panel" aria-labelledby="video-trailer-heading">
      <div className="video-trailer-copy">
        <span className="video-kicker">NEW • AI VIDEO GENERATED FROM YOUR ADAPTATION</span>
        <h4 id="video-trailer-heading">Animated Video Trailer</h4>
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
            <video src={videoUrl} controls autoPlay playsInline aria-label={`Animated trailer for ${story.title}`} />
            <a className="trailer-download" href={videoUrl} download={`${story.id || 'story'}-trailer.mp4`}>Download video</a>
            <span className="trailer-provider">Generated with {provider}</span>
          </>
        ) : (
          <div className="video-placeholder" style={{ '--accent': accent }}>
            <PlayIcon />
            <span>{isGenerating ? `Rendering ${progress}%` : result ? 'Your trailer preview will appear here' : 'Customize and generate the story first'}</span>
            {isGenerating && <div className="trailer-progress"><span style={{ width: `${progress}%` }} /></div>}
          </div>
        )}
      </div>
    </section>
  )
}
