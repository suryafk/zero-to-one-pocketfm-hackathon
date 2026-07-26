import { stories as seedStories } from '../data/stories.js'
import { runMockAdaptation } from './mockEngine.js'

// ---------------------------------------------------------------------------
// This is the ONLY file you need to touch to wire up a real backend.
// Every function tries the real REST endpoint first (see README.md for the
// expected contract) and transparently falls back to local mock data if the
// request fails — 404, network error, CORS, whatever. That means the UI is
// fully clickable today, and starts using real data the moment the routes
// exist, with zero component changes.
// ---------------------------------------------------------------------------

const BASE_URL = 'https://zero-to-one-pocketfm-hackathon.onrender.com'

function deriveVoiceStyle(genre, culture) {
  const genreStyles = {
    Horror: ['wide, from uneasy restraint to sharp fear', 'low, suspenseful rises', 'intimate storyteller', 'measured and deliberate', 'dark and tense', 'occasional quiet whispers at revelations'],
    Comedy: ['lively and playful', 'bouncy with comedic pauses', 'warm, witty host', 'brisk but clear', 'light and mischievous', 'never whisper'],
    Thriller: ['controlled urgency', 'crisp rises at danger and short pauses', 'focused investigative narrator', 'brisk and deliberate', 'tense and urgent', 'brief whispers for secrets'],
    Romance: ['gentle and expressive', 'soft, flowing contours', 'intimate confidant', 'unhurried', 'warm and tender', 'soft whispers for intimate moments'],
    'Sci-Fi': ['restrained awe and concern', 'precise with subtle rises', 'cinematic future narrator', 'steady', 'curious and atmospheric', 'quiet whispers for unknown discoveries'],
    Drama: ['natural and emotionally grounded', 'conversational with reflective pauses', 'empathetic storyteller', 'natural pace', 'earnest and human', 'only for intimate moments'],
  }
  const [emotional_range, intonation, impressions, speed_of_speech, tone, whispering] = genreStyles[genre] || genreStyles.Drama
  return { accent: `a natural, respectful ${culture} flavour`, emotional_range, intonation, impressions, speed_of_speech, tone, whispering }
}

async function tryFetch(path, options) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
    if (!res.ok) throw new Error(`${path} responded ${res.status}`)
    return await res.json()
  } catch (err) {
    return null // signal "fall back to mock" to the caller
  }
}

async function tryAudioAdaptation({ story, genre, culture, language, voiceStyle }) {
  try {
    console.info('[ReVibe] Audio adaptation started', {
      fileName: story.sourceAudioFile.name,
      fileBytes: story.sourceAudioFile.size,
      genre,
      culture,
      language,
      synthesizeVoice: true,
    })
    const body = new FormData()
    body.append('audio_file', story.sourceAudioFile)
    body.append('genre', genre)
    body.append('region', culture)
    body.append('language', language)
    body.append('synthesize_voice', 'true')
    Object.entries(voiceStyle).forEach(([key, value]) => body.append(key, value))

    console.info('[ReVibe] Uploading MP3 for transcription and adaptation')
    const res = await fetch(`${BASE_URL}/api/v1/adapt`, { method: 'POST', body })
    if (!res.ok) throw new Error(`Audio adaptation responded ${res.status}`)
    const data = await res.json()
    console.info('[ReVibe] Transcript, plot context, and adapted script received', {
      transcriptCharacters: data.source_transcript?.length ?? 0,
      adaptedScriptCharacters: data.transformed_script?.length ?? 0,
      voiceProvider: data.voice?.provider,
    })
    const voiceToAudioUrl = (voice) => voice?.audio_url || (voice?.audio_base64
      ? `data:audio/${voice.audio_format};base64,${voice.audio_base64}`
      : undefined)
    const audioUrl = voiceToAudioUrl(data.voice)
    const teaserAudioUrl = voiceToAudioUrl(data.teaser_voice)

    const result = {
      invariants: Object.keys(data.invariants).map((key) => ({
        label: key.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
        locked: true,
      })),
      consistencyScore: 100,
      idiomMappings: [],
      adaptedQuote: data.transformed_script.slice(0, 280),
      genre: data.genre,
      culture: data.region,
      language,
      transcript: data.source_transcript,
      teaser: { label: '30s Custom Teaser', durationSeconds: 45, audioUrl: teaserAudioUrl },
      fullEpisode: { label: 'Full Adapted Episode', durationSeconds: 0, audioUrl },
      generationSeconds: 0,
      transformedScript: data.transformed_script,
      teaserDetails: {
        hook: data.teaser?.hook,
        risingTension: data.teaser?.rising_tension,
        cliffhanger: data.teaser?.cliffhanger,
      },
    }
    console.info('[ReVibe] Adapted audio ready for player', {
      fullAudioGenerated: Boolean(audioUrl),
      teaserAudioGenerated: Boolean(teaserAudioUrl),
    })
    return result
  } catch {
    console.error('[ReVibe] Audio adaptation failed')
    return null
  }
}

/** GET /api/stories -> Story[] */
export async function fetchStories() {
  const real = await tryFetch('/api/stories')
  return real ?? seedStories
}

export async function transcribeAudioSource(file) {
  const body = new FormData()
  body.append('audio_file', file)
  const response = await fetch(`${BASE_URL}/api/source/transcribe`, { method: 'POST', body })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.detail || 'The audio file could not be transcribed.')
  if (!data.text?.trim()) throw new Error('The audio transcription was empty.')
  return data.text.trim()
}

/**
 * POST /api/adapt
 * body: { storyId, genre, culture, language, customPrompt }
 * returns: {
 *   invariants: {label, locked}[],
 *   consistencyScore: number,
 *   idiomMappings: {from, to}[],
 *   adaptedQuote: string,
 *   teaser: {label, durationSeconds, audioUrl?},
 *   fullEpisode: {label, durationSeconds, audioUrl?},
 *   generationSeconds: number
 * }
 * `audioUrl`, once your TTS backend produces it, is played through a real
 * <audio> element (src/hooks/usePlayback.js) — omit it and the player falls
 * back to simulated progress, which is what happens today.
 */
export async function generateAdaptation({
  story,
  genre,
  culture,
  language,
  customPrompt,
}) {
  const voiceStyle = deriveVoiceStyle(genre, culture)
  if (story.sourceAudioFile && !story.sourceText) {
    const audioResult = await tryAudioAdaptation({ story, genre, culture, language, voiceStyle })
    if (audioResult) return audioResult
    throw new Error('The audio upload could not be transcribed or synthesized. Check the backend and OpenAI configuration, then try again.')
  }

  const real = await tryFetch('/api/adapt', {
    method: 'POST',
    body: JSON.stringify({
      storyId: story.id,
      storyTitle: story.title,
      storyText: story.sourceText,
      genre,
      culture,
      language,
      customPrompt,
      synthesizeVoice: true,
      voiceStyle,
    }),
  })
  if (real) return real

  // Simulated network + generation latency for the demo (kept short so the
  // UI stays snappy — the *reported* generationSeconds still honors the
  // BRD's "< 10s" non-functional requirement independently of this delay).
  await new Promise((resolve) => setTimeout(resolve, 900 + Math.random() * 700))
  return runMockAdaptation({ story, genre, culture, language, customPrompt })
}

export async function startVideoTrailer({ story, result }) {
  const response = await fetch(`${BASE_URL}/api/video-trailers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: story.title,
      genre: result.genre,
      culture: result.culture,
      language: result.language || 'English',
      // Uploaded documents and audio use their original extracted context.
      // Catalog stories use the complete customized script.
      story_text: story.sourceText || result.transcript || result.transformedScript || story.synopsis || result.adaptedQuote,
    }),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.detail || `Video generation failed (${response.status}).`)
  }
  return response.json()
}

export async function getVideoTrailerCapability() {
  try {
    const response = await fetch(`${BASE_URL}/api/video-trailers-enabled`)
    if (!response.ok) return null
    const data = await response.json()
    return data.enabled === true
  } catch {
    // `null` means temporarily unreachable; `false` means explicitly disabled.
    return null
  }
}

export async function getVideoTrailer(videoId) {
  const response = await fetch(`${BASE_URL}/api/video-trailers/${encodeURIComponent(videoId)}`)
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.detail || `Could not check video status (${response.status}).`)
  }
  return response.json()
}

export function videoTrailerContentUrl(videoId) {
  return `${BASE_URL}/api/video-trailers/${encodeURIComponent(videoId)}/content`
}
