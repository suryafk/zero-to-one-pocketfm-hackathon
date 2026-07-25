"""
Full pipeline endpoint: runs Feature 1 -> Feature 2&3 -> Feature 5 (and
optionally Feature 4) in one call, mirroring the "Entertainment CEO Agent"
orchestration described in the BRD (P6: AI Agents).
"""
import logging
import time

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
logger = logging.getLogger(__name__)


@router.post("", response_model=AdaptResponse)
async def adapt(
    genre: Genre = Form(...),
    region: Region = Form(...),
    synthesize_voice: bool = Form(True),
    language: str = Form("English"),
    accent: str | None = Form(None),
    emotional_range: str | None = Form(None),
    intonation: str | None = Form(None),
    impressions: str | None = Form(None),
    speed_of_speech: str | None = Form(None),
    tone: str | None = Form(None),
    whispering: str | None = Form(None),
    story_text: str | None = Form(None),
    audio_file: UploadFile | None = File(None),
) -> AdaptResponse:
    request_started = time.perf_counter()
    voice_style = voice_synth.derive_voice_style(
        genre,
        region,
        {
            "accent": accent,
            "emotional_range": emotional_range,
            "intonation": intonation,
            "impressions": impressions,
            "speed_of_speech": speed_of_speech,
            "tone": tone,
            "whispering": whispering,
        },
    )
    logger.info(
        "Adaptation started | genre=%s region=%s language=%s synthesize_voice=%s input=%s",
        genre.value, region.value, language, synthesize_voice, "audio" if audio_file else "text",
    )
    if not story_text and not audio_file:
        logger.warning("Adaptation rejected | no story_text or audio_file supplied")
        raise HTTPException(status_code=400, detail="Either 'story_text' or 'audio_file' must be provided.")
    if story_text and audio_file:
        logger.warning("Adaptation rejected | both story_text and audio_file supplied")
        raise HTTPException(status_code=400, detail="Provide either 'story_text' or 'audio_file', not both.")

    try:
        transcript = None
        if audio_file:
            if not (audio_file.content_type or "").startswith("audio/"):
                logger.warning("Audio upload rejected | filename=%s content_type=%s", audio_file.filename, audio_file.content_type)
                raise HTTPException(status_code=400, detail="audio_file must be an audio upload.")
            if audio_file.size and audio_file.size > 25 * 1024 * 1024:
                logger.warning("Audio upload rejected | filename=%s size_bytes=%s exceeds 25 MB", audio_file.filename, audio_file.size)
                raise HTTPException(status_code=413, detail="Audio files must be 25 MB or smaller for OpenAI transcription.")
            logger.info("Step 1/4: transcription started | filename=%s size_bytes=%s", audio_file.filename, audio_file.size)
            story_text = speech_to_text.transcribe(audio_file)
            transcript = story_text
            logger.info("Step 1/4: transcription completed | transcript_characters=%s", len(transcript))

        logger.info("Step 2/4: plot-context extraction started | story_characters=%s", len(story_text))
        invariants = plot_anchor.extract_invariants(story_text)
        logger.info("Step 2/4: plot-context extraction completed | invariants=5")

        logger.info("Step 3/4: adaptation started | target_language=%s", language)
        transformed_script = transformer.transform_story(
            story_text=story_text,
            genre=genre,
            region=region,
            invariants=invariants,
            target_language=language,
        )
        logger.info("Step 3/4: adaptation completed | script_characters=%s", len(transformed_script))

        logger.info("Step 4/4: teaser generation started")
        teaser = teaser_service.generate_teaser(
            transformed_script=transformed_script,
            genre=genre,
            region=region,
        )
        logger.info("Step 4/4: teaser generation completed")
    except LLMError as exc:
        logger.exception("Adaptation failed | LLM step error")
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except STTError as exc:
        logger.exception("Adaptation failed | transcription error")
        raise HTTPException(status_code=502, detail=f"Speech-to-text failed: {exc}") from exc

    voice = None
    teaser_voice = None
    if synthesize_voice:
        logger.info("Voice synthesis started | script_characters=%s accent=%s tone=%s", len(transformed_script), voice_style.accent, voice_style.tone)
        try:
            voice = voice_synth.synthesize(
                text=transformed_script,
                region=region,
                voice_style=voice_style,
                language=language,
                genre=genre,
            )
            teaser_voice = voice_synth.synthesize(
                text="\n\n".join((teaser.hook, teaser.rising_tension, teaser.cliffhanger)),
                region=region,
                voice_style=voice_style,
                language=language,
                genre=genre,
            )
            logger.info(
                "Voice synthesis completed | provider=%s format=%s full_audio_generated=%s teaser_audio_generated=%s",
                voice.provider,
                voice.audio_format,
                bool(voice.audio_url or voice.audio_base64),
                bool(teaser_voice.audio_url or teaser_voice.audio_base64),
            )
        except Exception as exc:
            logger.exception("Adaptation failed | voice synthesis error")
            raise HTTPException(status_code=502, detail=f"Voice synthesis failed: {exc}") from exc
    else:
        logger.info("Voice synthesis skipped | synthesize_voice=false")

    logger.info("Adaptation completed | elapsed_seconds=%.2f", time.perf_counter() - request_started)

    return AdaptResponse(
        invariants=invariants,
        genre=genre,
        region=region,
        transformed_script=transformed_script,
        teaser=teaser,
        voice=voice,
        teaser_voice=teaser_voice,
        source_transcript=transcript,
        voice_style=voice_style,
    )
