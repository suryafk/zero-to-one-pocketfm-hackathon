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

const BASE_URL = '' // e.g. 'http://localhost:8000' once a backend is deployed

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

async function tryAudioAdaptation({ story, genre, culture, language, synthesizeVoice, voiceStyle }) {
  try {
    console.info('[CultureShift] Audio adaptation started', {
      fileName: story.sourceAudioFile.name,
      fileBytes: story.sourceAudioFile.size,
      genre,
      culture,
      language,
      synthesizeVoice,
    })
    const body = new FormData()
    body.append('audio_file', story.sourceAudioFile)
    body.append('genre', genre)
    body.append('region', culture)
    body.append('language', language)
    body.append('synthesize_voice', String(synthesizeVoice))
    Object.entries(voiceStyle).forEach(([key, value]) => body.append(key, value))

    console.info('[CultureShift] Uploading MP3 for transcription and adaptation')
    const res = await fetch(`${BASE_URL}/api/v1/adapt`, { method: 'POST', body })
    if (!res.ok) throw new Error(`Audio adaptation responded ${res.status}`)
    const data = await res.json()
    console.info('[CultureShift] Transcript, plot context, and adapted script received', {
      transcriptCharacters: data.source_transcript?.length ?? 0,
      adaptedScriptCharacters: data.transformed_script?.length ?? 0,
      voiceProvider: data.voice?.provider,
    })
    const voice = data.voice
    const audioUrl = voice?.audio_url || (voice?.audio_base64
      ? `data:audio/${voice.audio_format};base64,${voice.audio_base64}`
      : undefined)

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
      teaser: { label: '30s Custom Teaser', durationSeconds: 45, audioUrl: undefined },
      fullEpisode: { label: 'Full Adapted Episode', durationSeconds: 0, audioUrl },
      generationSeconds: 0,
      transformedScript: data.transformed_script,
    }
    console.info('[CultureShift] Adapted audio ready for player', { audioGenerated: Boolean(audioUrl) })
    return result
  } catch {
    console.error('[CultureShift] Audio adaptation failed')
    return null
  }
}

/** GET /api/stories -> Story[] */
export async function fetchStories() {
  const real = await tryFetch('/api/stories')
  return real ?? seedStories
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
  synthesizeVoice = true,
}) {
  const voiceStyle = deriveVoiceStyle(genre, culture)
  if (story.sourceAudioFile) {
    const audioResult = await tryAudioAdaptation({ story, genre, culture, language, synthesizeVoice, voiceStyle })
    if (audioResult) return audioResult
    throw new Error('The audio upload could not be transcribed or synthesized. Check the backend and OpenAI configuration, then try again.')
  }

  const real = await tryFetch('/api/adapt', {
    method: 'POST',
    body: JSON.stringify({
      storyId: story.id,
      genre,
      culture,
      language,
      customPrompt,
      synthesizeVoice,
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
