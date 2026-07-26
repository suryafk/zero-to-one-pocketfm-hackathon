import { useCallback, useEffect, useState } from 'react'
import { generateAdaptation } from '../api/adaptationApi.js'
import { usePlayback } from '../hooks/usePlayback.js'
import { cultureLabel, GENRE_ACCENTS, genreOptions, languagesForCulture } from '../data/stories.js'
import AdaptationControls from './AdaptationControls.jsx'
import PlotIntegrityPanel from './PlotIntegrityPanel.jsx'
import IdiomMappingPreview from './IdiomMappingPreview.jsx'
import PlayerBar from './PlayerBar.jsx'
import VideoTrailerPanel from './VideoTrailerPanel.jsx'
import { BackIcon } from './Icons.jsx'

function adaptationCacheKey(story, params) {
  const sourceAudio = story.sourceAudioFile
  return JSON.stringify({
    storyId: story.id,
    sourceAudio: sourceAudio
      ? { name: sourceAudio.name, size: sourceAudio.size, lastModified: sourceAudio.lastModified }
      : null,
    ...params,
  })
}

function initialAdaptationParams(story, initialSession) {
  const saved = initialSession?.params
  const culture = saved?.culture || 'Rural Bhojpuri'
  const allowedLanguages = languagesForCulture(culture)

  return {
    genre: saved?.genre || (genreOptions.includes(story.originalGenre) ? story.originalGenre : 'Horror'),
    culture,
    language: allowedLanguages.includes(saved?.language) ? saved.language : allowedLanguages[0],
    customPrompt: saved?.customPrompt || '',
  }
}

export default function Screen2Adaptation({ story, onBack, initialSession, onSessionChange }) {
  const [params, setParams] = useState(() => initialAdaptationParams(story, initialSession))
  const [result, setResult] = useState(() => initialSession?.result || null)
  const [resultKey, setResultKey] = useState(() => initialSession?.resultKey || null)
  const [generatingMode, setGeneratingMode] = useState(null)
  const [adaptationRuns, setAdaptationRuns] = useState(() => initialSession?.adaptationRuns || [])
  const [status, setStatus] = useState(() => initialSession?.status || '')
  const playback = usePlayback()

  useEffect(() => {
    if (!story.isExtracting) {
      onSessionChange(story.id, { params, result, resultKey, adaptationRuns, status })
    }
  }, [story.id, story.isExtracting, params, result, resultKey, adaptationRuns, status, onSessionChange])

  const saveTrailerState = useCallback((runId, trailer) => {
    setAdaptationRuns((runs) => runs.map((run) => run.id === runId ? { ...run, trailer } : run))
  }, [])

  if (story.isExtracting) {
    return (
      <div className="screen screen-adaptation">
        <div className="adaptation-topbar">
          <button className="back-link" onClick={onBack}>
            <BackIcon /> Back to Library
          </button>
          <span className="pocketfm-tag">PocketFM Web</span>
        </div>
        <main className="document-processing" aria-live="polite">
          <div className="processing-spinner" aria-hidden="true" />
          <span className="video-kicker">PREPARING YOUR STORY</span>
          <h2>{story.title}</h2>
          <p>{story.processingType === 'audio' ? 'Transcribing' : 'Extracting readable text from'} <strong>{story.sourceFileName}</strong>…</p>
          <small>{story.processingType === 'audio'
            ? 'The transcript will be reused for every customization, audio track, and trailer.'
            : 'Scanned PDFs may take longer while OCR reads each page.'}</small>
        </main>
      </div>
    )
  }

  function updateParams(patch) {
    setParams((prev) => ({ ...prev, ...patch }))
    setResult(null)
    setStatus('Customizations changed — generate the adaptation again to create a new trailer.')
  }

  async function runAdaptation(mode) {
    if (generatingMode) return
    const requestKey = adaptationCacheKey(story, params)
    const cacheHit = Boolean(result && resultKey === requestKey)

    if (!cacheHit) {
      setGeneratingMode(mode)
      setStatus('Locking plot invariants and generating adaptation…')
    }

    try {
      console.info('[CultureShift] Starting playback flow', { mode, storyId: story.id, cacheHit })
      const res = cacheHit
        ? result
        : await generateAdaptation({
            story,
            ...params,
          })

      if (!cacheHit) {
        setResult(res)
        setResultKey(requestKey)
        setAdaptationRuns((runs) => [
          ...runs,
          {
            id: `${Date.now()}-${runs.length}`,
            result: res,
            params: { ...params },
            autoStart: false,
          },
        ])
      }
      const generatedTrack = mode === 'teaser' ? res.teaser : res.fullEpisode
      const track = generatedTrack
      const started = await playback.play(track)
      console.info('[CultureShift] Playback ready', {
        label: track.label,
        hasAudio: Boolean(track.audioUrl),
        started,
        cacheHit,
      })
      setStatus(
        cacheHit
          ? started
            ? `Playing cached ${track.label.toLowerCase()}.`
            : `${track.label} is ready to play.`
          : started
            ? `Generated in ${res.generationSeconds}s — playing ${track.label.toLowerCase()}.`
            : `Generated in ${res.generationSeconds}s — ${track.label.toLowerCase()} is ready to play.`,
      )
    } catch (err) {
      console.error('[CultureShift] Playback flow failed', err)
      setStatus('Something went wrong generating this adaptation. Please try again.')
    } finally {
      if (!cacheHit) setGeneratingMode(null)
    }
  }

  const accent = GENRE_ACCENTS[params.genre] || '#30D158'
  const displayQuote = result
    ? `${result.teaserDetails.hook} ${result.teaserDetails.risingTension} ${result.teaserDetails.cliffhanger}`
    : story.quote

  return (
    <div className="screen screen-adaptation">
      <div className="adaptation-topbar">
        <button className="back-link" onClick={onBack}>
          <BackIcon /> Back to Library
        </button>
        <span className="pocketfm-tag">PocketFM Web</span>
      </div>

      <main className="adaptation-body">
        <section className="story-detail">
          <div className="story-detail-art" style={{ '--accent': accent }}>
            <span className="pill" style={{ borderColor: accent, color: accent }}>
              {cultureLabel(params.culture)} · {params.genre}
            </span>
            <span className="story-detail-title-mini">{story.title}</span>
          </div>

          <div className="story-detail-copy">
            <h2>{story.title}</h2>
            <p className="episode-line">
              {story.episode} <span>(Original: {story.originalCulture} {story.originalGenre})</span>
            </p>
            <blockquote className="adapted-quote" style={{ borderColor: accent }}>
              &ldquo;{displayQuote}&rdquo;
            </blockquote>
          </div>
        </section>

        <AdaptationControls
          {...params}
          onChange={updateParams}
          onPlayTeaser={() => runAdaptation('teaser')}
          onPlayFull={() => runAdaptation('full')}
          generatingMode={generatingMode}
        />

        {status && (
          <p className="status-line" role="status">
            {status}
          </p>
        )}

        {adaptationRuns.length > 0 && (
          <div className="trailer-history">
            {adaptationRuns.map((run, index) => (
              <VideoTrailerPanel
                key={run.id}
                jobKey={`${story.id}:${run.id}`}
                story={story}
                result={run.result}
                accent={GENRE_ACCENTS[run.params.genre] || '#30D158'}
                customization={run.params}
                isLatest={index === adaptationRuns.length - 1}
                autoStart={false}
                initialTrailer={run.trailer}
                onTrailerChange={(trailer) => saveTrailerState(run.id, trailer)}
              />
            ))}
          </div>
        )}

        {result && (
          <>
            <div className="result-grid">
              <PlotIntegrityPanel invariants={result.invariants} consistencyScore={result.consistencyScore} />
              <IdiomMappingPreview mappings={result.idiomMappings} />
            </div>
          </>
        )}
      </main>

      <PlayerBar
        audioRef={playback.audioRef}
        track={playback.track}
        elapsed={playback.elapsed}
        duration={playback.duration}
        isPlaying={playback.isPlaying}
        volume={playback.volume}
        setVolume={playback.setVolume}
        onToggle={playback.togglePause}
      />
    </div>
  )
}