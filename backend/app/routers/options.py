from fastapi import APIRouter

from app.schemas import Genre, Region, REGION_LANGUAGES

router = APIRouter(prefix="/api/v1/options", tags=["Options"])


@router.get("")
def get_options() -> dict[str, list[str]]:
    return {
        "genres": [g.value for g in Genre],
        "regions": [r.value for r in Region],
        "region_languages": {region.value: list(languages) for region, languages in REGION_LANGUAGES.items()},
    }
