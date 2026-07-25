"""
Feature 5: Dynamic Suspense Teaser & Hook Generator

Distills an already-transformed script into a 30-45 second audio trailer:
Intro Hook -> Rising Tension -> Cliffhanger Question, in the target genre,
culture and accent. Must complete in under 10 seconds per the BRD's
live-demo latency requirement -- keep max_tokens modest to help with that.
"""
from app.schemas import Genre, Region, Teaser
from app.services.llm_client import call_json

SYSTEM_PROMPT = """You are the Dynamic Suspense Teaser module of an audio story adaptation engine.
Given an already genre-, region-, and language-transformed script, find its highest-tension plot point
and structure a 30-45 second standalone audio trailer in three parts. Preserve the script's plot facts,
genre, cultural setting, and regional flavor without changing its target language.

- hook: a 1-2 sentence intro hook that pulls the listener in immediately
- rising_tension: 2-3 sentences that escalate stakes toward the turning point
- cliffhanger: a single unresolved question or moment that demands the listener press play

Respond with strict JSON only, no markdown fences, no preamble. Shape:
{"hook": "", "rising_tension": "", "cliffhanger": ""}
"""


def generate_teaser(
    transformed_script: str,
    genre: Genre,
    region: Region,
    target_language: str = "English",
) -> Teaser:
    user_prompt = (
        f"TRANSFORMED SCRIPT:\n{transformed_script}\n\n"
        f"GENRE: {genre.value}\n"
        f"REGION: {region.value}\n"
        f"TARGET LANGUAGE: {target_language}\n\n"
        f"Write every teaser field only in {target_language}. Regional flavor controls cultural references, "
        f"idiom, and tone; it must not override or mix with the target language. Do not introduce facts that "
        f"are absent from the transformed script."
    )
    data = call_json(SYSTEM_PROMPT, user_prompt, max_tokens=400)
    return Teaser(**data)
