import { PauseIcon, PlayIcon, SkipBackIcon, SkipForwardIcon, VolumeIcon } from './Icons.jsx'

function formatTime(totalSeconds) {
  const safe = Number.isFinite(totalSeconds) ? totalSeconds : 0
  const m = Math.floor(safe / 60)
  const s = Math.floor(safe % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function PlayerBar({ audioRef, track, elapsed, duration, isPlaying, volume, setVolume, onToggle }) {

  const total = track ? duration || track.durationSeconds : 0
  const pct = total ? Math.min(100, (elapsed / total) * 100) : 0

  return (
    <>
      {/* Hidden real <audio> element — active whenever track.audioUrl is set.
          See src/hooks/usePlayback.js for how this is driven. */}
      <audio ref={audioRef} style={{ display: 'none' }} />

      {track && (
        <div className="player-bar" role="region" aria-label="Playback controls">
          <div className="player-top">
            <span className="player-label">Playing: {track.label}</span>
            <span className="player-time">
              {formatTime(elapsed)} / {formatTime(total)}
            </span>
          </div>

          <div className="player-progress-track">
            <div className="player-progress-fill" style={{ width: `${pct}%` }} />
          </div>

          <div className="player-controls">
            <button className="player-icon-btn" aria-label="Restart" disabled>
              <SkipBackIcon />
            </button>
            <button className="player-icon-btn play-pause" onClick={onToggle} aria-label={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button className="player-icon-btn" aria-label="Skip" disabled>
              <SkipForwardIcon />
            </button>
            <div className="player-volume">
              <VolumeIcon />
              <input
                type="range"
                min={0}
                max={100}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label="Volume"
              />
              <span>{volume}%</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
