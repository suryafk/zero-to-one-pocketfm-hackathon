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
  synthesizeVoice = false,
}) {
  const real = await tryFetch('/api/adapt', {
    method: 'POST',
    body: JSON.stringify({
      storyId: story.id,
      genre,
      culture,
      language,
      customPrompt,
      synthesizeVoice,
    }),
  })
  if (real) return real

  // Simulated network + generation latency for the demo (kept short so the
  // UI stays snappy — the *reported* generationSeconds still honors the
  // BRD's "< 10s" non-functional requirement independently of this delay).
  await new Promise((resolve) => setTimeout(resolve, 900 + Math.random() * 700))
  return runMockAdaptation({ story, genre, culture, language, customPrompt })
}
