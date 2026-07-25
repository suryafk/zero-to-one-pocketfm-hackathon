from fastapi import APIRouter, HTTPException

from app.schemas import TeaserRequest, TeaserResponse
from app.services import teaser as teaser_service
from app.services.llm_client import LLMError

router = APIRouter(prefix="/api/v1/teaser", tags=["Feature 5 · Suspense Teaser"])


@router.post("", response_model=TeaserResponse)
def generate_teaser(payload: TeaserRequest) -> TeaserResponse:
    try:
        print(f"Generating teaser for genre '{payload.genre.value}' and region '{payload.region.value}'")
        teaser = teaser_service.generate_teaser(
            transformed_script=payload.transformed_script,
            genre=payload.genre,
            region=payload.region,
        )
        print("Teaser generated successfully.")
    except LLMError as exc:
        print(f"LLMError in teaser: {exc}")
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return TeaserResponse(teaser=teaser)
