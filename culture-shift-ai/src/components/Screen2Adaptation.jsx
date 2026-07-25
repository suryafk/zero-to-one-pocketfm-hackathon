import { useState } from 'react'
import { generateAdaptation } from '../api/adaptationApi.js'
import { usePlayback } from '../hooks/usePlayback.js'
import { GENRE_ACCENTS, genreOptions } from '../data/stories.js'
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

export default function Screen2Adaptation({ story, onBack }) {
  const [params, setParams] = useState({
    genre: genreOptions.includes(story.originalGenre) ? story.originalGenre : 'Horror',
    culture: 'Rural Bhojpuri',
    language: 'Hindi',
    customPrompt: '',
  })
  const [result, setResult] = useState(null)
  const [resultKey, setResultKey] = useState(null)
  const [generatingMode, setGeneratingMode] = useState(null)
  const [status, setStatus] = useState('')
  const playback = usePlayback()

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
  const displayQuote = result ? result.adaptedQuote : story.quote

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
              {params.culture.split(' ')[0]} {params.genre}
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

        {result && (
          <>
            <VideoTrailerPanel story={story} result={result} accent={accent} />
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
