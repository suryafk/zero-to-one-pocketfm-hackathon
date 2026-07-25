import re

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.services.audio_stream import get_audio_job

router = APIRouter(prefix="/api/audio", tags=["Streaming audio"])
AUDIO_KEY = re.compile(r"^[a-f0-9]{64}$")


@router.get("/{audio_key}")
def stream_audio(audio_key: str) -> StreamingResponse:
    if not AUDIO_KEY.fullmatch(audio_key):
        raise HTTPException(status_code=400, detail="Invalid audio id.")
    job = get_audio_job(audio_key)
    if not job:
        raise HTTPException(status_code=404, detail="Audio job not found or expired.")
    return StreamingResponse(
        job.iterate(),
        media_type="audio/mpeg",
        headers={"Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff"},
    )

