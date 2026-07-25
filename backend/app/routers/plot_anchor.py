from fastapi import APIRouter, HTTPException

from app.schemas import PlotAnchorRequest, PlotAnchorResponse
from app.services import plot_anchor
from app.services.llm_client import LLMError

router = APIRouter(prefix="/api/v1/plot-anchor", tags=["Feature 1 · Core Plot Anchor"])


@router.post("", response_model=PlotAnchorResponse)
def extract_invariants(payload: PlotAnchorRequest) -> PlotAnchorResponse:
    try:
        print(f"Extracting invariants for story (first 50 chars): '{payload.story_text[:50]}...'")
        invariants = plot_anchor.extract_invariants(payload.story_text)
        print("Successfully extracted invariants.")
    except LLMError as exc:
        print(f"LLMError in plot_anchor: {exc}")
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return PlotAnchorResponse(invariants=invariants)
