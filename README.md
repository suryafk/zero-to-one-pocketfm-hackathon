# CultureShift AI

**Multi-Axis Audio Story Adaptation Engine — PocketFM Hackathon (Zero-to-One)**

CultureShift AI takes a single audio story and re-authors it across two axes at
once — **genre** (Horror, Comedy, Thriller, …) and **culture/region** (Mumbai
Tapri, Texas Country, South London Grime, …) — while keeping the story's core
plot structurally intact. The result is one source story that can be localized
into many culturally-authentic versions on demand.

This repo contains a working **FastAPI backend** (the AI pipeline) and a
**React + Vite frontend** (the two-screen PocketFM web experience), wired
together end-to-end.

---

## The idea (BRD features)

The engine implements five features from the product brief:

| # | Feature | What it does |
|---|---------|--------------|
| **F1** | **Core Plot Anchor** (Invariants Engine) | Extracts and *locks* the 5 structural invariants of a story — inciting incident, key plot beats, character motivations, climax, resolution — before any rewrite. Everything downstream must preserve these. |
| **F2** | **Multi-Axis Transformation Matrix** | Rewrites atmosphere, pacing, and tropes to match a target **genre**. |
| **F3** | **Hyper-Local Idiom & Humor Mapper** | Replaces non-translatable metaphors, slang, food/drink, and geography with authentic local equivalents for a target **region** (not literal translation). F2 + F3 run in one pass. |
| **F4** | **Regional Voice & Accent Synthesizer** | TTS integration point (ElevenLabs / Azure Neural TTS). Ships with a `mock` provider so the pipeline runs with no TTS credentials. |
| **F5** | **Dynamic Suspense Teaser & Hook Generator** | Distills a transformed script into a 30–45s trailer: hook → rising tension → cliffhanger. |

**Pipeline:**

```
Input story ──▶ [F1] Plot Anchor ──▶ [F2 & F3] Genre + Region Transform ──▶ [F5] Teaser
                                                                        └──▶ [F4] Voice Synth (optional)
```

---

## Repo structure

```
zero-to-one-pocketfm-hackathon/
├── backend/                     # FastAPI service (the AI pipeline)
│   ├── app/
│   │   ├── main.py              # App, CORS, router registration
│   │   ├── config.py            # Env-based settings (.env)
│   │   ├── schemas.py           # Pydantic models (Genre/Region enums, requests/responses)
│   │   ├── routers/
│   │   │   ├── plot_anchor.py   # F1   → POST /api/v1/plot-anchor
│   │   │   ├── transform.py     # F2&3 → POST /api/v1/transform
│   │   │   ├── teaser.py        # F5   → POST /api/v1/teaser
│   │   │   ├── voice.py         # F4   → POST /api/v1/voice
│   │   │   ├── adapt.py         # Full pipeline → POST /api/v1/adapt
│   │   │   ├── options.py       # GET /api/v1/options (genres/regions)
│   │   │   └── frontend_compat.py  # Frontend-shaped routes: /api/stories, /api/adapt
│   │   └── services/
│   │       ├── llm_client.py    # OpenAI wrapper (JSON mode, strict-JSON parsing)
│   │       ├── plot_anchor.py   # F1 logic
│   │       ├── transformer.py   # F2&3 logic
│   │       ├── teaser.py        # F5 logic
│   │       └── voice_synth.py   # F4 logic (mock / ElevenLabs / Azure)
│   ├── tests/                   # unittest suite (frontend-compat contract)
│   ├── requirements.txt
│   └── .env.example
│
├── culture-shift-ai/            # React + Vite frontend (2-screen web app)
│   ├── src/
│   │   ├── App.jsx              # Screen switch + story upload handling
│   │   ├── api/
│   │   │   ├── adaptationApi.js # Calls the real backend first, falls back to mock
│   │   │   └── mockEngine.js    # Local stand-in for the pipeline (offline demo)
│   │   ├── components/          # Library, Adaptation, controls, player, panels
│   │   ├── hooks/usePlayback.js # Real <audio> playback + simulated fallback
│   │   ├── utils/storyDocument.js  # Client-side .txt/.docx/.mp3 upload parsing
│   │   └── data/stories.js      # Seed catalog + dropdown option lists
│   └── vite.config.js           # Dev server + /api → :8000 proxy
│
├── test_scripts/                # Standalone experiments / fixtures
│   ├── story.txt                # Full text of "The Tell-Tale Heart" (adaptation input)
│   ├── culture_shift_model_test.py  # Claude model-comparison harness (separate experiment)
│   └── culture_shift_outputs/   # Sample outputs from that harness
│
└── CultureShift_AI_BRD.pdf      # Product brief
```

---

## How the two halves connect

The frontend and backend were built separately, then integrated:

- **Frontend-compat routes** — `frontend_compat.py` exposes `GET /api/stories`
  and `POST /api/adapt` in exactly the shape the React app expects, translating
  to/from the internal pipeline. (The native, strongly-typed API lives under
  `/api/v1/*` and is still available.)
- **Vite proxy** — `vite.config.js` proxies `/api` → `http://localhost:8000`,
  so running the backend + `npm run dev` gives a live end-to-end app with no
  code changes.
- **Graceful fallback** — `adaptationApi.js` calls the real endpoint first and
  transparently falls back to `mockEngine.js` on any failure, so the UI is fully
  clickable even with no backend running.

---

## Quick start

### 1. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # then add your OPENAI_API_KEY
uvicorn app.main:app --reload --port 8000
```

- Docs: http://localhost:8000/docs · Health: http://localhost:8000/health

### 2. Frontend

```bash
cd culture-shift-ai
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173). With both running, the
app uses the real pipeline; with only the frontend, it uses the mock engine.

---

## Configuration (`backend/.env`)

| Variable | Default | Notes |
|----------|---------|-------|
| `OPENAI_API_KEY` | — | **Required.** The LLM layer uses OpenAI. |
| `OPENAI_MODEL` | `gpt-4o` | Chat model used for F1/F2/F3/F5. |
| `OPENAI_VIDEO_MODEL` | `sora-2` | Video model used for trailer rendering. |
| `VIDEO_GENERATION_ENABLED` | `false` | Opt-in spending guard. Set `true` only for controlled trailer demos. |
| `TTS_PROVIDER` | `mock` | `mock`, `elevenlabs`, or `azure`. |
| `ELEVENLABS_API_KEY` | — | Required if `TTS_PROVIDER=elevenlabs`. |
| `AZURE_SPEECH_KEY` / `AZURE_SPEECH_REGION` | — | Required if `TTS_PROVIDER=azure`. |
| `CORS_ALLOW_ORIGINS` | `*` | Comma-separated list, or `*`. |

> The LLM provider is **OpenAI** (see `llm_client.py`). The Claude scripts under
> `test_scripts/` are a separate, standalone model-comparison experiment and are
> not part of the running application.

---

## API reference

### Frontend-facing (used by the React app)

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/stories` | Story catalog for the library screen. |
| `POST` | `/api/adapt` | Adapt a story. Body: `{ storyId, genre, culture, language, customPrompt }`. Returns invariants, consistency score, idiom mappings, adapted quote, teaser/full-episode tracks, and real `generationSeconds`. |

### Native pipeline

| Method | Path | Feature |
|--------|------|---------|
| `GET`  | `/api/v1/options` | Supported genres and regions |
| `POST` | `/api/v1/plot-anchor` | F1 — extract locked invariants |
| `POST` | `/api/v1/transform` | F2&3 — genre + region rewrite |
| `POST` | `/api/v1/teaser` | F5 — suspense teaser |
| `POST` | `/api/v1/voice` | F4 — regional voice (mock by default) |
| `POST` | `/api/v1/adapt` | Full pipeline (F1 → F2&3 → F5 [→ F4]) |

Example:

```bash
curl -X POST http://localhost:8000/api/v1/adapt \
  -H "Content-Type: application/json" \
  -d '{"story_text":"Maya finds a locked diary under her grandmother'"'"'s floorboard...","genre":"Thriller","region":"Mumbai Tapri","synthesize_voice":false}'
```

---

## Notable features & recent changes

- **File-backed story — "The Tell-Tale Heart."** A catalog entry whose
  adaptation runs on the **full public-domain story text** read from
  `test_scripts/story.txt` (via `storyFile` in `frontend_compat.py`), rather
  than a one-line synopsis. This lets you verify the model genuinely transforms
  substantial input end-to-end. (`storyFile` is stripped from the public
  `/api/stories` shape.)
- **Story upload.** From the library, users can upload a `.txt` / `.docx`
  document (parsed client-side in `utils/storyDocument.js`) or an `.mp3` and run
  an adaptation against it. MP3 uploads are sent to `/api/v1/adapt`, transcribed
  with OpenAI, anchored and rewritten from that transcript, then synthesized as
  a new MP3 in the chosen language for the frontend player.
- **Full catalog sync.** The backend `/api/stories` catalog matches the 6-story
  frontend seed (+ The Tell-Tale Heart = 7).
- **Robust genre default.** Screen 2 defaults the genre from the selectable
  `genreOptions`, so stories with a non-selectable original genre (e.g. Action)
  don't send an invalid value.
- **Real generation timing.** `/api/adapt` reports actual elapsed seconds.
- **Repo hygiene.** Added `.gitignore` (`.venv/`, `__pycache__/`, `*.pyc`) and
  removed previously-committed build caches.

---

## Testing

```bash
cd backend
python -m unittest discover -s tests -v
```

The suite covers the frontend-compat contract (`/api/stories` shape and
`/api/adapt` response shape). Note: the adapt test makes a real LLM call, so it
requires a valid `OPENAI_API_KEY`.

---

## Known limitations

- **TTS is mocked by default** (`TTS_PROVIDER=mock`) — the transformed script
  and teaser are generated for real, but no audio file is produced unless you
  configure ElevenLabs/Azure. Playback then uses a simulated progress timer.
- **Region enum coverage.** The culture dropdown offers `Seoul Underground` and
  `Rio Favela`, which aren't in the backend `Region` enum yet; selecting them
  currently falls back to `Mumbai Tapri` in the compat route. (Intentionally
  left unchanged for now.)
- **Latency.** The BRD targets <10s teaser generation; very long source texts
  (e.g. the full Tell-Tale Heart) can push a full adaptation slightly past that.
