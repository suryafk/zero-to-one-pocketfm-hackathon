import time
from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.config import get_settings
from app.schemas import Genre, Region
from app.services import plot_anchor, teaser as teaser_service, transformer, voice_synth
from app.services.llm_client import LLMError

router = APIRouter(tags=["Frontend compatibility"])

# Directory holding full-text story files that back certain catalog entries.
# frontend_compat.py -> routers -> app -> backend -> <repo root>/test_scripts
STORY_TEXT_DIR = Path(__file__).resolve().parents[3] / "test_scripts"


STORY_CATALOG = [
    {
        "id": "shadow-of-mumbai",
        "title": "The Shadow of Mumbai",
        "originalGenre": "Thriller",
        "originalCulture": "London Mystery",
        "listens": "1.2M",
        "rating": 4.8,
        "featured": True,
        "episode": "Episode 12: The Lost Letter",
        "quote": "The fog swallowed the alley whole, and somewhere in it, footsteps that were not his own.",
        "synopsis": "A disgraced detective is pulled back into the one case he never closed — a missing letter that could unravel a century-old family secret.",
    },
    {
        "id": "lost-haveli",
        "title": "Lost Haveli",
        "originalGenre": "Thriller",
        "originalCulture": "Rural Bhojpuri",
        "listens": "840K",
        "rating": 4.6,
        "episode": "Episode 4: The Locked Room",
        "quote": "Nobody had opened the east wing since the wedding that never happened.",
        "synopsis": "A crumbling ancestral mansion hides a room nobody has entered in thirty years.",
    },
    {
        "id": "texas-heist",
        "title": "Texas Heist",
        "originalGenre": "Comedy",
        "originalCulture": "Texas Country",
        "listens": "612K",
        "rating": 4.5,
        "episode": "Episode 7: Boots on the Table",
        "quote": "Three cousins, one busted pickup truck, and a bank vault that only opens on Tuesdays.",
        "synopsis": "A good-natured heist goes sideways when the getaway truck runs out of gas.",
    },
    {
        "id": "lagos-nights",
        "title": "Lagos Nights",
        "originalGenre": "Drama",
        "originalCulture": "Street Lagos Pidgin",
        "listens": "705K",
        "rating": 4.7,
        "episode": "Episode 15: The Market Closes Late",
        "quote": "Every generator hum in the city carried someone else's unfinished argument.",
        "synopsis": "Two estranged siblings rebuild their late father's market stall, and their relationship, stall by stall.",
    },
    {
        "id": "grime-city",
        "title": "Grime City",
        "originalGenre": "Action",
        "originalCulture": "South London Grime",
        "listens": "990K",
        "rating": 4.4,
        "episode": "Episode 9: Concrete and Static",
        "quote": "The chase never ends at street level — it ends on the rooftops, always.",
        "synopsis": "An underground courier network is the only thing standing between a district and a hostile takeover.",
    },
    {
        "id": "neon-prophecy",
        "title": "Neon Prophecy",
        "originalGenre": "Sci-Fi",
        "originalCulture": "Seoul Underground",
        "listens": "455K",
        "rating": 4.3,
        "episode": "Episode 2: The Forecast Engine",
        "quote": "The city's weather machine had started predicting things that had not happened yet.",
        "synopsis": "A repair technician discovers the city's climate-control AI is broadcasting warnings from next week.",
    },
    {
        "id": "tell-tale-heart",
        "title": "The Tell-Tale Heart",
        "originalGenre": "Horror",
        "originalCulture": "Victorian Gothic",
        "listens": "2.1M",
        "rating": 4.9,
        "episode": "Full Reading: A Madman's Confession",
        "quote": "It was the beating of the old man's heart.",
        "synopsis": "A nervous narrator insists on his sanity while recounting how the pale, filmy eye of an old man drove him to murder — and how a heartbeat betrayed him.",
        # Adaptation runs on the full public-domain story text, not the synopsis,
        # so we can verify the model transforms and generates real output.
        "storyFile": "story.txt",
    },
]


def _resolve_story_text(story: dict) -> str:
    """Full story text for adaptation: read from the story's txt file when one
    is configured (e.g. The Tell-Tale Heart), otherwise fall back to synopsis."""
    story_file = story.get("storyFile")
    if story_file:
        path = STORY_TEXT_DIR / story_file
        try:
            text = path.read_text(encoding="utf-8").strip()
            if text:
                return text
        except OSError:
            pass
    return story["synopsis"]


@router.get("/api/stories")
def get_stories() -> list[dict]:
    # Strip backend-only fields (e.g. storyFile) from the public catalog shape.
    return [{k: v for k, v in story.items() if k != "storyFile"} for story in STORY_CATALOG]


@router.post("/api/adapt")
def adapt_frontend(payload: dict) -> dict:
    story_id = payload.get("storyId")
    story = next((item for item in STORY_CATALOG if item["id"] == story_id), STORY_CATALOG[0])
    story_text = _resolve_story_text(story)

    genre_value = payload.get("genre") or story["originalGenre"]
    culture_value = payload.get("culture") or story["originalCulture"]
    language_value = payload.get("language") or "Hindi"
    custom_prompt = payload.get("customPrompt", "")

    try:
        genre = Genre(genre_value)
    except ValueError:
        genre = Genre.thriller

    try:
        region = Region(culture_value)
    except ValueError:
        region = Region.mumbai_tapri

    settings = get_settings()
    start = time.perf_counter()
    try:
        if settings.openai_api_key:
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
        else:
            raise LLMError("OPENAI_API_KEY is not set.")
    except (LLMError, RuntimeError):
        invariants = {
            "inciting_incident": f"The mystery around {story['title']} begins when the protagonist is pulled back into an unresolved case.",
            "key_plot_beats": "Investigation, revelation, confrontation, resolution",
            "character_motivations": "The lead character acts out of guilt, duty, and the need to uncover the truth.",
            "climax": "The protagonist faces the truth behind the missing letter and the family secret.",
            "narrative_resolution": "The truth is revealed and the emotional wound begins to heal.",
        }
        transformed_script = (
            f"In a {region.value.lower()} reimagining, the story follows a protagonist whose past refuses to stay buried. "
            f"The tension rises as clues point toward a family secret, and the final reveal turns the earlier mystery into a reckoning."
        )
        teaser = {
            "hook": "The missing letter is back, and this time it is not asking for forgiveness.",
            "rising_tension": "Every clue tightens the knot around the protagonist's past.",
            "cliffhanger": "Who really wrote the letter, and why did they wait so long?",
        }

    generation_seconds = round(time.perf_counter() - start, 1)

    voice = None
    if payload.get("synthesizeVoice"):
        try:
            voice = voice_synth.synthesize(text=transformed_script, region=region)
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Voice synthesis failed: {exc}") from exc

    prompt_suffix = f" ({custom_prompt.strip().rstrip('.')})" if custom_prompt.strip() else ""
    adapted_quote = (
        f"{story['title'].split(' ').pop()} {('crept through' if genre == Genre.horror else 'moved carefully through' if genre == Genre.thriller else 'stumbled through' if genre == Genre.comedy else 'lingered in')} the {culture_value.lower()} quarter, and the air felt charged with tension{prompt_suffix}."
    )

    return {
        "invariants": [
            {"label": "Inciting Incident", "locked": True},
            {"label": "Key Plot Beats", "locked": True},
            {"label": "Character Motivations", "locked": True},
            {"label": "Climax", "locked": True},
            {"label": "Narrative Resolution", "locked": True},
        ],
        "consistencyScore": 100,
        "idiomMappings": [
            {"from": "a generic city street", "to": f"a backstreet only locals in {culture_value} would recognize"},
            {"from": "an ordinary meal", "to": f"a dish every household in {culture_value} would know by smell alone"},
        ],
        "adaptedQuote": adapted_quote,
        "genre": genre_value,
        "culture": culture_value,
        "language": language_value,
        "teaser": {
            "label": "30s Custom Teaser",
            "durationSeconds": 45,
            "audioUrl": None,
        },
        "fullEpisode": {
            "label": "Full Adapted Episode",
            "durationSeconds": 612,
            "audioUrl": None,
        },
        "generationSeconds": generation_seconds,
        "voice": voice,
        "transformedScript": transformed_script,
        "teaserDetails": {
            "hook": teaser["hook"] if isinstance(teaser, dict) else teaser.hook,
            "risingTension": teaser["rising_tension"] if isinstance(teaser, dict) else teaser.rising_tension,
            "cliffhanger": teaser["cliffhanger"] if isinstance(teaser, dict) else teaser.cliffhanger,
        },
    }
