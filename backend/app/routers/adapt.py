"""
Full pipeline endpoint: runs Feature 1 -> Feature 2&3 -> Feature 5 (and
optionally Feature 4) in one call, mirroring the "Entertainment CEO Agent"
orchestration described in the BRD (P6: AI Agents).
"""
from fastapi import APIRouter, HTTPException

from app.schemas import AdaptRequest, AdaptResponse
from app.services import plot_anchor, teaser as teaser_service, transformer, voice_synth
from app.services.llm_client import LLMError

router = APIRouter(prefix="/api/v1/adapt", tags=["Full pipeline · Entertainment CEO Agent"])


@router.post("", response_model=AdaptResponse)
def adapt(payload: AdaptRequest) -> AdaptResponse:
    try:
        invariants = plot_anchor.extract_invariants(payload.story_text)

        transformed_script = transformer.transform_story(
            story_text=payload.story_text,
            genre=payload.genre,
            region=payload.region,
            invariants=invariants,
        )

        teaser = teaser_service.generate_teaser(
            transformed_script=transformed_script,
            genre=payload.genre,
            region=payload.region,
        )
    except LLMError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    voice = None
    if payload.synthesize_voice:
        try:
            voice = voice_synth.synthesize(text=transformed_script, region=payload.region)
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Voice synthesis failed: {exc}") from exc

    return AdaptResponse(
        invariants=invariants,
        genre=payload.genre,
        region=payload.region,
        transformed_script=transformed_script,
        teaser=teaser,
        voice=voice,
    )
