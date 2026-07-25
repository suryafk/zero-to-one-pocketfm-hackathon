import { useState } from 'react'
import { generateAdaptation } from '../api/adaptationApi.js'
import { usePlayback } from '../hooks/usePlayback.js'
import { GENRE_ACCENTS } from '../data/stories.js'
import AdaptationControls from './AdaptationControls.jsx'
import PlotIntegrityPanel from './PlotIntegrityPanel.jsx'
import IdiomMappingPreview from './IdiomMappingPreview.jsx'
import PlayerBar from './PlayerBar.jsx'
import { BackIcon } from './Icons.jsx'

export default function Screen2Adaptation({ story, onBack }) {
  const [params, setParams] = useState({
    genre: story.originalGenre in GENRE_ACCENTS ? story.originalGenre : 'Horror',
    culture: 'Rural Bhojpuri',
    language: 'Hindi',
    customPrompt: '',
  })
  const [result, setResult] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [status, setStatus] = useState('')
  const playback = usePlayback()

  function updateParams(patch) {
    setParams((prev) => ({ ...prev, ...patch }))
  }

  async function runAdaptation(mode) {
    setIsGenerating(true)
    setStatus('Locking plot invariants and generating adaptation…')
    try {
      const res = await generateAdaptation({ story, ...params })
      setResult(res)
      const track = mode === 'teaser' ? res.teaser : res.fullEpisode
      playback.play(track)
      setStatus(`Generated in ${res.generationSeconds}s — playing ${track.label.toLowerCase()}.`)
    } catch (err) {
      setStatus('Something went wrong generating this adaptation. Please try again.')
    } finally {
      setIsGenerating(false)
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
          isGenerating={isGenerating}
        />

        {status && (
          <p className="status-line" role="status">
            {status}
          </p>
        )}

        {result && (
          <div className="result-grid">
            <PlotIntegrityPanel invariants={result.invariants} consistencyScore={result.consistencyScore} />
            <IdiomMappingPreview mappings={result.idiomMappings} />
          </div>
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
