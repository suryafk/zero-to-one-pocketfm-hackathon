import asyncio
import logging
import re

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.config import get_settings
from app.services.llm_client import LLMError
from app.services.trailer_concept import extract_trailer_concept

router = APIRouter(prefix="/api/video-trailers", tags=["Video trailers"])
OPENAI_VIDEOS_URL = "https://api.openai.com/v1/videos"
VIDEO_ID_PATTERN = re.compile(r"^video_[A-Za-z0-9]+$")
logger = logging.getLogger(__name__)
RETRYABLE_STATUS_CODES = {408, 409, 429, 500, 502, 503, 504}


@router.get("-enabled")
def video_trailer_capability() -> dict[str, bool]:
    return {"enabled": get_settings().video_generation_enabled}


class VideoTrailerRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    genre: str = Field(..., min_length=1, max_length=50)
    culture: str = Field(..., min_length=1, max_length=100)
    language: str = Field(default="English", min_length=1, max_length=50)
    story_text: str = Field(..., min_length=20, max_length=50000)


def _require_enabled() -> None:
    if not get_settings().video_generation_enabled:
        raise HTTPException(status_code=403, detail="Video generation is disabled for this environment.")


def _headers() -> dict[str, str]:
    api_key = get_settings().openai_api_key
    if not api_key:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY is not configured.")
    return {"Authorization": f"Bearer {api_key}"}


def _validate_video_id(video_id: str) -> None:
    if not VIDEO_ID_PATTERN.fullmatch(video_id):
        raise HTTPException(status_code=400, detail="Invalid video id.")


def _upstream_error(response: httpx.Response) -> HTTPException:
    try:
        detail = response.json().get("error", {}).get("message") or response.text
    except ValueError:
        detail = response.text
    return HTTPException(status_code=response.status_code, detail=f"Video provider: {detail[:500]}")


async def _get_upstream_with_retry(url: str, timeout: float) -> httpx.Response:
    """Retry safe GET requests only; never duplicate a billable create POST."""
    last_response = None
    last_error = None
    async with httpx.AsyncClient(timeout=timeout) as client:
        for attempt in range(3):
            try:
                response = await client.get(url, headers=_headers())
                last_response = response
                if response.is_success or response.status_code not in RETRYABLE_STATUS_CODES:
                    return response
                logger.warning(
                    "Video provider GET retry | url=%s status=%s attempt=%s",
                    url, response.status_code, attempt + 1,
                )
            except httpx.HTTPError as exc:
                last_error = exc
                logger.warning("Video provider GET transport retry | url=%s attempt=%s error=%s", url, attempt + 1, exc)
            if attempt < 2:
                await asyncio.sleep(1.5 * (attempt + 1))
    if last_response is not None:
        return last_response
    raise HTTPException(status_code=502, detail=f"Could not reach the video provider after retries: {last_error}")


@router.post("")
async def create_video_trailer(payload: VideoTrailerRequest) -> dict:
    _require_enabled()
    try:
        concept = extract_trailer_concept(
            payload.story_text, payload.title, payload.genre, payload.culture, payload.language
        )
    except (LLMError, ValueError) as exc:
        raise HTTPException(status_code=502, detail=f"Trailer concept extraction failed: {exc}") from exc
    beats = concept["visual_arc"]
    prompt = (
        f"Create a cinematic animated audio-story trailer for '{payload.title}', reimagined as {payload.genre} "
        f"in a {payload.culture} setting. Family-friendly fictional characters only; no real people, logos, "
        "copyrighted characters, captions, or on-screen text. Use expressive stylized animation, coherent recurring "
        "characters, dramatic lighting, smooth camera motion, and three connected visual beats. Do not reveal twists, "
        "the climax, culprit, or ending. Keep the edit concise and follow this exact timeline: "
        f"0-5 seconds, establish this premise: {concept['trailer_summary']}. "
        f"5-11 seconds, opening and escalation: {beats[0]}; {beats[1]}. "
        f"11-16 seconds, unresolved cliffhanger: {beats[2]}; {concept['suspense_line']}. "
        "16-20 seconds, stop the action and hold on a clean dramatic end card. "
        f"All narration, character speech, audible words, and end-card text must be in {payload.language}. "
        f"Do not speak English unless the target language is English. Visual mood: {concept['mood']}. "
        f"Voiceover for the first 16 seconds, spoken naturally in {payload.language}: {concept['voiceover_script']}. "
        f"During the final four seconds, clearly show and say exactly: '{concept['call_to_action']}'"
    )
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                OPENAI_VIDEOS_URL,
                headers=_headers(),
                files={
                    "model": (None, get_settings().openai_video_model),
                    "prompt": (None, prompt),
                    "size": (None, "1280x720"),
                    "seconds": (None, "20"),
                },
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Could not reach the video provider: {exc}") from exc
    if not response.is_success:
        raise _upstream_error(response)
    job = response.json()
    job["trailer_concept"] = concept
    return job


@router.get("/{video_id}")
async def get_video_trailer(video_id: str) -> dict:
    _require_enabled()
    _validate_video_id(video_id)
    response = await _get_upstream_with_retry(f"{OPENAI_VIDEOS_URL}/{video_id}", timeout=30)
    if not response.is_success:
        raise _upstream_error(response)
    return response.json()


@router.get("/{video_id}/content")
async def get_video_trailer_content(video_id: str) -> Response:
    _require_enabled()
    _validate_video_id(video_id)
    response = await _get_upstream_with_retry(f"{OPENAI_VIDEOS_URL}/{video_id}/content", timeout=120)
    if not response.is_success:
        raise _upstream_error(response)
    return Response(
        content=response.content,
        media_type=response.headers.get("content-type", "video/mp4"),
        headers={"Content-Disposition": f'inline; filename="{video_id}.mp4"'},
    )
