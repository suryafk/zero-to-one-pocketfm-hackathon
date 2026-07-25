"""
Full pipeline endpoint: runs Feature 1 -> Feature 2&3 -> Feature 5 (and
optionally Feature 4) in one call, mirroring the "Entertainment CEO Agent"
orchestration described in the BRD (P6: AI Agents).
"""
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.schemas import AdaptResponse, Genre, Region
from app.services import (
    plot_anchor,
    speech_to_text,
    teaser as teaser_service,
    transformer,
    voice_synth,
)
from app.services.llm_client import LLMError
from app.services.speech_to_text import STTError

router = APIRouter(prefix="/api/v1/adapt", tags=["Full pipeline · Entertainment CEO Agent"])


@router.post("", response_model=AdaptResponse)
async def adapt(
    genre: Genre = Form(...),
    region: Region = Form(...),
    synthesize_voice: bool = Form(False),
    story_text: str | None = Form(None),
    audio_file: UploadFile | None = File(None),
) -> AdaptResponse:
    if not story_text and not audio_file:
        raise HTTPException(status_code=400, detail="Either 'story_text' or 'audio_file' must be provided.")
    if story_text and audio_file:
        raise HTTPException(status_code=400, detail="Provide either 'story_text' or 'audio_file', not both.")

    try:
        if audio_file:
            story_text = await speech_to_text.transcribe(audio_file)

        invariants = plot_anchor.extract_invariants(story_text)

        transformed_script = transformer.transform_story(
            story_text=story_text,
            genre=genre,
            region=region,
            invariants=invariants,
        )

        teaser = teaser_service.generate_teaser(
            transformed_script=transformed_script,
            genre=genre,
            region=region,
        )
    except LLMError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except STTError as exc:
        raise HTTPException(status_code=502, detail=f"Speech-to-text failed: {exc}") from exc

    voice = None
    if synthesize_voice:
        try:
            voice = voice_synth.synthesize(text=transformed_script, region=region)
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Voice synthesis failed: {exc}") from exc

    return AdaptResponse(
        invariants=invariants,
        genre=genre,
        region=region,
        transformed_script=transformed_script,
        teaser=teaser,
        voice=voice,
    )
