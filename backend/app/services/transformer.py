"""
Feature 2 & 3: Multi-Axis Transformation Matrix + Hyper-Local Idiom & Humor Mapper

Rewrites a story simultaneously across a Genre axis and a Regional/Cultural
axis, while holding the five locked plot invariants fixed. Non-translatable
metaphors, jokes, food/drink, and geography are swapped for local equivalents
in the same pass (per the BRD, Features 2 and 3 sit in one architecture box).
"""
from app.schemas import Genre, PlotInvariants, Region
from app.services.llm_client import call_json

SYSTEM_PROMPT = """You are the Multi-Axis Transformation module of an audio story adaptation engine.
You rewrite a story simultaneously along two axes without ever breaking the five locked plot invariants
provided to you:

1. GENRE AXIS — rewrite pacing, atmosphere, and stylistic tropes to authentically match the target genre
   (e.g. Horror = dread and sensory detail, Comedy = comic timing and exaggeration, Thriller = urgency and
   short sentences, Romance = interiority and longing, Sci-Fi = speculative texture, Drama = emotional realism).

2. CULTURAL/REGIONAL AXIS — rewrite dialogue, idiom, humor, slang, food/drink references, and geography into
   authentic hyper-local equivalents for the target region. Do not literally translate generic references —
   replace them (e.g. "grabbing a coffee in Manhattan" becomes a regionally specific equivalent). Zero
   culturally out-of-place idioms should remain, and the original emotional weight must be preserved.

The five plot invariants (inciting incident, key plot beats, character motivations, climax, resolution)
must all still be identifiable in your rewrite. Do not alter them.

Respond with strict JSON only, no markdown fences, no preamble. Shape:
{"transformed_script": ""}

The transformed_script should be 150-220 words of narrative/dialogue.
"""


def transform_story(story_text: str, genre: Genre, region: Region, invariants: PlotInvariants) -> str:
    user_prompt = (
        f"LOCKED PLOT INVARIANTS:\n{invariants.model_dump_json(indent=2)}\n\n"
        f"ORIGINAL STORY TEXT:\n{story_text}\n\n"
        f"TARGET GENRE: {genre.value}\n"
        f"TARGET REGION: {region.value}"
    )
    data = call_json(SYSTEM_PROMPT, user_prompt, max_tokens=900)
    return data["transformed_script"]
