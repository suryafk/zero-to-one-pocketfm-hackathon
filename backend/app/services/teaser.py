"""
Feature 5: Dynamic Suspense Teaser & Hook Generator

Distills an already-transformed script into a 30-45 second audio trailer:
Intro Hook -> Rising Tension -> Cliffhanger Question, in the target genre,
culture and accent. Must complete in under 10 seconds per the BRD's
live-demo latency requirement -- keep max_tokens modest to help with that.
"""
from app.schemas import Genre, Region, Teaser
from app.services.llm_client import call_json

SYSTEM_PROMPT = """You are a master storyteller and suspense artist, crafting irresistible audio trailers. Your task is to create a 30-45 second trailer that gives a glimpse of the story's plot and leaves the listener desperate to hear more.

You will structure this trailer in four parts, all written in the script's genre, language, and regional voice:

-   **The Hook (1-2 sentences)**: Grab the listener's attention with a powerful opening that establishes the tone.
-   **The Plot Glimpse (2-3 sentences)**: Briefly introduce the main character and the central conflict. Give a hint of the story's world and what's at stake.
-   **The Rising Tension (2-3 sentences)**: Escalate the stakes. Build suspense by focusing on a critical moment or a difficult choice.
-   **The Cliffhanger (1 sentence)**: End with a heart-stopping question or an unresolved moment that demands the listener press play.

This trailer must be a perfect blend of plot and suspense, a captivating performance that respects the story's genre and culture.

Respond with strict JSON only, no markdown fences, no preamble. Shape:
{"hook": "", "plot_glimpse": "", "rising_tension": "", "cliffhanger": ""}
"""


def generate_teaser(
    transformed_script: str,
    genre: Genre,
    region: Region,
    target_language: str = "English",
) -> Teaser:
    user_prompt = (
        f"THE SCRIPT TO DISTILL:\n{transformed_script}\n\n"
        f"YOUR CANVAS:\n"
        f"GENRE: {genre.value}\n"
        f"REGION: {region.value}\n"
        f"TARGET LANGUAGE: {target_language}\n\n"
        f"Write every teaser field only in {target_language}. Regional flavor controls cultural references, "
        f"idiom, and tone; it must not override or mix with the target language. Do not introduce facts that "
        f"are absent from the transformed script."
    )
    data = call_json(SYSTEM_PROMPT, user_prompt, max_tokens=400)
    return Teaser(**data)