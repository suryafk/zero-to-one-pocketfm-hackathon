from fastapi import APIRouter, HTTPException

from app.schemas import VoiceRequest, VoiceResponse
from app.services import voice_synth

router = APIRouter(prefix="/api/v1/voice", tags=["Feature 4 · Regional Voice Synthesizer"])


@router.post("", response_model=VoiceResponse)
def synthesize(payload: VoiceRequest) -> VoiceResponse:
    try:
        return voice_synth.synthesize(text=payload.text, region=payload.region, voice_id=payload.voice_id)
    except Exception as exc:  # provider errors (httpx, missing keys, etc.)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
