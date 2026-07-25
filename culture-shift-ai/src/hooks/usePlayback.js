import { useEffect, useRef, useState } from 'react'

// Real playback path: if a track carries an `audioUrl` (what a real TTS
// backend — Feature 4, ElevenLabs/Azure Neural TTS per the BRD — would
// return), this drives an actual <audio> element via `audioRef` and mirrors
// its native play/pause/timeupdate/ended events into state.
//
// Fallback path: if there's no audioUrl yet (e.g. the mock engine), progress
// is simulated with a timer so the UI stays demoable before real audio
// exists. Nothing else in the component tree needs to know which path is
// active — swap in real audio by returning `audioUrl` from the API.
export function usePlayback() {
  const audioRef = useRef(null)
  const fallbackTimer = useRef(null)

  const [track, setTrack] = useState(null) // { label, durationSeconds, audioUrl? }
  const [elapsed, setElapsed] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolumeState] = useState(80)

  function clearFallback() {
    if (fallbackTimer.current) {
      clearInterval(fallbackTimer.current)
      fallbackTimer.current = null
    }
  }

  function setVolume(v) {
    setVolumeState(v)
    if (audioRef.current) audioRef.current.volume = v / 100
  }

  function startFallbackTimer(activeTrack) {
    clearFallback()
    fallbackTimer.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1
        if (next >= activeTrack.durationSeconds) {
          clearFallback()
          setIsPlaying(false)
          return activeTrack.durationSeconds
        }
        return next
      })
    }, 1000)
  }

  async function play(newTrack) {
    clearFallback()
    setTrack(newTrack)
    setElapsed(0)
    setDuration(newTrack.durationSeconds)

    if (newTrack.audioUrl && audioRef.current) {
      const audio = audioRef.current
      audio.src = newTrack.audioUrl
      audio.currentTime = 0
      audio.volume = volume / 100
      try {
        await audio.play()
        setIsPlaying(true)
        return true
      } catch {
        setIsPlaying(false)
        return false
      }
    } else {
      // No real file yet — simulate progress, sped up ~6x so a multi-minute
      // episode is watchable in a demo.
      setIsPlaying(true)
      startFallbackTimer(newTrack)
      return true
    }
  }

  function togglePause() {
    if (!track) return
    if (track.audioUrl && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false))
      }
      return
    } else if (isPlaying) {
      clearFallback()
    } else {
      startFallbackTimer(track)
    }
    setIsPlaying((p) => !p)
  }

  // Mirror the real <audio> element's own clock when it's the active path.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTimeUpdate = () => setElapsed(audio.currentTime)
    const onLoadedMetadata = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration)
    }
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => setIsPlaying(false)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
    }
  }, [])

  useEffect(() => () => clearFallback(), [])

  return { audioRef, track, elapsed, duration, isPlaying, volume, setVolume, play, togglePause }
}
