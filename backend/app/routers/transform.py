from fastapi import APIRouter, HTTPException

from app.schemas import TransformRequest, TransformResponse
from app.services import plot_anchor, transformer
from app.services.llm_client import LLMError

router = APIRouter(prefix="/api/v1/transform", tags=["Feature 2&3 · Multi-Axis Transformation"])


@router.post("", response_model=TransformResponse)
def transform(payload: TransformRequest) -> TransformResponse:
    try:
        print(f"Transforming story to genre '{payload.genre.value}' and region '{payload.region.value}'")
        invariants = payload.invariants or plot_anchor.extract_invariants(payload.story_text)
        print("Invariants secured, starting transformation.")
        transformed_script = transformer.transform_story(
            story_text=payload.story_text,
            genre=payload.genre,
            region=payload.region,
            invariants=invariants,
        )
    except LLMError as exc:
        print(f"LLMError in transform: {exc}")
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    print("Transformation successful.")
    return TransformResponse(
        invariants=invariants,
        genre=payload.genre,
        region=payload.region,
        transformed_script=transformed_script,
    )
