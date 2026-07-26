from fastapi import APIRouter, File, HTTPException, UploadFile

from app.services.speech_to_text import STTError
from app.services import speech_to_text

router = APIRouter(prefix="/api/source", tags=["Source extraction"])
MAX_AUDIO_BYTES = 25 * 1024 * 1024


@router.post("/transcribe")
async def transcribe_source_audio(audio_file: UploadFile = File(...)) -> dict[str, str]:
    if not (audio_file.content_type or "").startswith("audio/"):
        raise HTTPException(status_code=400, detail="The uploaded file must be audio.")
    if audio_file.size and audio_file.size > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Audio files must be 25 MB or smaller.")
    try:
        transcript = speech_to_text.transcribe(audio_file)
    except STTError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {"text": transcript, "method": "speech_to_text"}

