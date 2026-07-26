# ReVibe — Web Prototype

A working React front end for the two-screen ReVibe workflow in the
blueprint: **Story Discovery Library → Story Adaptation & Player**, built to
the exact color tokens from the Figma spec and wired against a mock version
of the BRD's adaptation engine so every control actually does something.

## Stack

- **React 18 + Vite** — fast dev server, zero-config build, no router needed
  for a 2-screen app (screen switching is a single piece of state in `App.jsx`).
- **Plain CSS with custom properties** — the design tokens (`#0F1117` canvas,
  `#2A2E3D` borders, `#30D158` accent, the red→orange CTA gradient) are
  defined once in `src/index.css` and used everywhere, so re-theming is a
  one-file change.
- **No backend dependency to run it** — `src/api/adaptationApi.js` calls real
  REST endpoints first and transparently falls back to a local mock engine.
  The UI is fully clickable today; point it at a real API and nothing else
  changes.

## Run it

```bash
cd culture-shift-ai
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Click any story
on Screen 1 to jump to Screen 2 — that's the "click a story → adaptation
screen" behavior you asked for.

Build for production with `npm run build` (outputs to `dist/`).

## What's implemented from the BRD

| BRD Feature | Where it shows up |
|---|---|
| F1 — Core Plot Anchor (Invariants Engine) | "Plot Integrity Lock" panel on Screen 2, shown after generating an adaptation — locks the 5 invariants and shows a consistency score. |
| F2 — Multi-Axis Transformation (Genre × Culture) | The Genre and Cultural Flavour selects in the controls panel. |
| F3 — Hyper-Local Idiom & Humor Mapper | "Hyper-Local Idiom Mapping" panel — shows generic→localized phrase swaps for the selected culture. |
| F4 — Expressive Regional Voice & Accent Synthesizer | Language select + the player bar (currently simulated playback — see below). |
| F5 — Dynamic Suspense Teaser & Hook Generator | "Play 30s Teaser" vs "Play Full Story" — both trigger generation, then playback. |
| NFR — Teaser generation < 10s | `generateAdaptation()` reports a `generationSeconds` value that's always under 10, shown in the status line. |

The custom modulation prompt (free text) is threaded through and reflected in
the generated quote, matching the "Make the narrator sound eerie…" example in
the blueprint.

## Project structure

```
src/
  api/
    adaptationApi.js   ← the ONE file to edit to wire up a real backend
    mockEngine.js       ← stand-in for the AI pipeline (invariants, idioms, teaser)
  components/
    Screen1Library.jsx  ← story discovery, search, genre filter
    Screen2Adaptation.jsx ← adaptation controls + generated result + player
    AdaptationControls.jsx, PlotIntegrityPanel.jsx, IdiomMappingPreview.jsx,
    PlayerBar.jsx, StoryCard.jsx, FeaturedOriginal.jsx, Header.jsx, Icons.jsx
  data/stories.js       ← seed catalogue + option lists (genres/cultures/languages)
  hooks/usePlayback.js  ← simulated audio progress/play/pause
```

## Wiring up the real backend

`adaptationApi.js` expects two REST endpoints:

```
GET  /api/stories
     -> Story[]  (same shape as src/data/stories.js)

POST /api/adapt
     body: { storyId, genre, culture, language, customPrompt }
     -> {
          invariants: { label, locked }[],
          consistencyScore: number,
          idiomMappings: { from, to }[],
          adaptedQuote: string,
          teaser: { label, durationSeconds, audioUrl?: string },
          fullEpisode: { label, durationSeconds, audioUrl?: string },
          generationSeconds: number
        }
```

### Does it actually play audio?

Yes — `PlayerBar` mounts a real `<audio>` element, and `usePlayback.js` drives
it whenever a track has an `audioUrl` (native `play()`/`pause()`, and its
`timeupdate`/`loadedmetadata`/`ended` events feed the progress bar and time
display). If `audioUrl` is missing — which is the case for every track from
the mock engine right now, since there's no TTS output to point to — it
falls back to a simulated timer so the UI is still fully demoable.

To try real playback today, with no backend at all: drop an mp3 at
`public/audio/your-file.mp3` and set `audioUrl: '/audio/your-file.mp3'` on
the `teaser`/`fullEpisode` objects in `src/api/mockEngine.js`. Once a real
TTS pipeline exists, `/api/adapt` just needs to return that same field — no
component changes required.

Uncomment the proxy block in `vite.config.js` and point `BASE_URL` in
`adaptationApi.js` at your backend, or just implement those two routes behind
the same origin. No component needs to change — `fetchStories()` and
`generateAdaptation()` already try the real endpoint first.

## What I'd extend first

1. **Real TTS output.** Playback itself is already wired to a real
   `<audio>` element (see "Does it actually play audio?" above) — what's
   missing is an actual voice synthesis backend (Feature 4) to produce the
   `audioUrl`. ElevenLabs/Azure Neural TTS per the BRD's tech guidance would
   plug straight in.
2. **Streaming generation status.** Right now "Adapting…" is a single
   loading state. Once the real pipeline exists, stream intermediate stages
   (invariants locked → genre transform → idiom pass → TTS) via SSE or
   websockets so the UI can show real progress instead of a spinner.
3. **Automated invariant verification.** The BRD's acceptance criteria for
   Feature 1 wants an automated check that the 5 invariants are unchanged.
   Right now the UI just trusts the API's `locked: true` flags — the real
   backend should return a diff/confidence score per invariant, and the
   Plot Integrity panel is already set up to render per-invariant detail if
   you add it.
4. **Batch/agent mode (P6 — Entertainment CEO Agent).** The BRD's second
   theme is scaling one story across hundreds of regions automatically.
   That's a different screen entirely (a queue/dashboard), not an extension
   of Screen 2 — worth scoping as its own view once the single-adaptation
   flow is validated.
5. **Persisted library state.** Search and genre filters currently reset on
   navigation. If users bounce between library and adaptation a lot, lift
   that state up or add URL params.
6. **Auth + coins economy.** The "120 Coins" pill is decorative right now.
   If unlocking adaptations costs coins, that balance needs a real source
   of truth and a spend confirmation step before generation.
