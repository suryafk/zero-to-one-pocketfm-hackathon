from fastapi import APIRouter, HTTPException

from app.schemas import TeaserRequest, TeaserResponse
from app.services import teaser as teaser_service
from app.services.llm_client import LLMError

router = APIRouter(prefix="/api/v1/teaser", tags=["Feature 5 · Suspense Teaser"])


@router.post("", response_model=TeaserResponse)
def generate_teaser(payload: TeaserRequest) -> TeaserResponse:
    try:
        teaser = teaser_service.generate_teaser(
            transformed_script=payload.transformed_script,
            genre=payload.genre,
            region=payload.region,
        )
    except LLMError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return TeaserResponse(teaser=teaser)
