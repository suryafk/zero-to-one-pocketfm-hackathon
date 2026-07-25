# CultureShift AI — Backend

Base FastAPI backend for the Multi-Axis Audio Story Adaptation Engine, matching the
pipeline in the BRD:

```
Input Story  ->  [F1] Plot Anchor  ->  [F2&3] Genre + Region Transform  ->  [F5] Teaser
                                                                        \->  [F4] Voice Synth
```

## Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # then add your OPENAI_API_KEY
```

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

- Interactive docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health

## Endpoints

| Method | Path                  | Feature                          | Description                                                  |
|--------|-----------------------|-----------------------------------|----------------------------------------------------------------|
| GET    | `/api/v1/options`     | —                                  | Supported genres and regions (for populating dropdowns)        |
| POST   | `/api/v1/plot-anchor` | F1 · Core Plot Anchor              | Extract the 5 locked plot invariants from raw story text       |
| POST   | `/api/v1/transform`   | F2&3 · Multi-Axis Transformation   | Rewrite story across genre + region axes, with local idioms    |
| POST   | `/api/v1/teaser`      | F5 · Suspense Teaser Generator     | Turn a transformed script into a 30–45s hook/tension/cliffhanger trailer |
| POST   | `/api/v1/voice`       | F4 · Regional Voice Synthesizer    | Text-to-speech in a region-tuned voice (mock by default)       |
| POST   | `/api/v1/adapt`       | Full pipeline (CEO Agent)          | Runs F1 → F2&3 → F5 (and optionally F4) in one call             |

### Example: full pipeline

```bash
curl -X POST http://localhost:8000/api/v1/adapt \
  -H "Content-Type: application/json" \
  -d '{
    "story_text": "Maya finds a locked diary under her late grandmother'"'"'s floorboard. Its final entry names a debt still owed to a man in town — and a promise Maya never knew she inherited. She decides to find him before sundown, though everyone warns her not to.",
    "genre": "Thriller",
    "region": "Mumbai Tapri",
    "synthesize_voice": false
  }'
```

Response shape:

```json
{
  "invariants": {
    "inciting_incident": "...",
    "key_plot_beats": "...",
    "character_motivations": "...",
    "climax": "...",
    "narrative_resolution": "..."
  },
  "genre": "Thriller",
  "region": "Mumbai Tapri",
  "transformed_script": "...",
  "teaser": { "hook": "...", "rising_tension": "...", "cliffhanger": "..." },
  "voice": null
}
```

## Notes on Feature 4 (Voice Synthesizer)

`TTS_PROVIDER=mock` lets the whole pipeline run with zero external
TTS credentials — `/api/v1/voice` and `/api/v1/adapt?synthesize_voice=true` will
return a stub response with `audio_base64: null` and a note explaining why.

To synthesize with OpenAI, set `TTS_PROVIDER=openai`,
`OPENAI_TTS_MODEL=gpt-4o-mini-tts`, and `OPENAI_API_KEY` in `.env`. The OpenAI
region → built-in voice mapping lives in `OPENAI_REGION_VOICE_MAP` in
`app/services/voice_synth.py`.

## MP3 upload flow

The native `POST /api/v1/adapt` endpoint accepts an `audio_file` multipart
field. With `STT_PROVIDER=openai` (the default), it transcribes the uploaded
MP3 using `OPENAI_STT_MODEL=gpt-4o-transcribe`, extracts the plot invariants
from that transcript, rewrites the story in the requested `language`, and—when
`synthesize_voice=true`—returns OpenAI TTS audio for the frontend player.

OpenAI transcription uploads must be 25 MB or smaller.

## Connecting the frontend demo

The React app in `../culture-shift-ai` talks to this backend through the
frontend-compatibility routes `GET /api/stories` and `POST /api/adapt`
(see `app/routers/frontend_compat.py`). In dev, Vite proxies `/api` to
`http://localhost:8000` (`culture-shift-ai/vite.config.js`), so running
`uvicorn` + `npm run dev` wires the two together with no code changes.

You can also call the native pipeline (`/api/v1/adapt`) directly, which in
turn calls OpenAI server-side. That call looks like:

```js
const res = await fetch("http://localhost:8000/api/v1/adapt", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ story_text: story, genre, region, synthesize_voice: false })
});
const data = await res.json();
// data.invariants, data.transformed_script, data.teaser
```

## Project structure

```
backend/
  app/
    main.py              # FastAPI app, CORS, router registration
    config.py             # env-based settings
    schemas.py            # Pydantic request/response models
    routers/
      plot_anchor.py      # F1
      transform.py        # F2 & F3
      teaser.py            # F5
      voice.py              # F4
      adapt.py               # full pipeline
      options.py              # genre/region lists
    services/
      llm_client.py        # OpenAI call + strict-JSON parsing (JSON mode)
      plot_anchor.py        # F1 logic
      transformer.py         # F2&3 logic
      teaser.py                # F5 logic
      voice_synth.py            # F4 logic (mock / ElevenLabs / Azure)
  requirements.txt
  .env.example
```

## Next steps for production

- Add request-level auth (API key or JWT) — there is none yet.
- Add response caching keyed on (story hash, genre, region) since transformations are deterministic-ish and re-runs are wasteful.
- Add automated invariant-consistency checking (the BRD's Feature 1 acceptance criteria) as a scoring step after `/transform`.
- Swap the in-memory `REGION_VOICE_MAP` for a config-driven mapping once real voice IDs are chosen.
