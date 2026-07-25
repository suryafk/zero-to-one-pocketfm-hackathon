from fastapi import APIRouter, HTTPException

from app.schemas import PlotAnchorRequest, PlotAnchorResponse
from app.services import plot_anchor
from app.services.llm_client import LLMError

router = APIRouter(prefix="/api/v1/plot-anchor", tags=["Feature 1 · Core Plot Anchor"])


@router.post("", response_model=PlotAnchorResponse)
def extract_invariants(payload: PlotAnchorRequest) -> PlotAnchorResponse:
    try:
        invariants = plot_anchor.extract_invariants(payload.story_text)
    except LLMError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return PlotAnchorResponse(invariants=invariants)
