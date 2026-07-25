"""
Feature 1: Core Plot Anchor (Invariants Engine)

Extracts and locks the five structural invariants of a story before any
genre or cultural rewrite takes place, per the BRD's acceptance criteria
that transformed output must remain 100% consistent with these five.
"""
from app.schemas import PlotInvariants
from app.services.llm_client import call_json

SYSTEM_PROMPT = """You are the Core Plot Anchor module of an audio story adaptation engine.
Your only job is structural extraction — you do not rewrite, embellish, or judge the story.

Given raw story text, extract exactly five plot invariants:
- inciting_incident: the event that sets the story in motion
- key_plot_beats: the essential sequence of events, as a short comma-separated list
- character_motivations: what drives the main character(s), in one sentence
- climax: the story's highest-stakes turning point
- narrative_resolution: how the story concludes

Respond with strict JSON only. No markdown fences, no preamble, no commentary.
Shape:
{"inciting_incident": "", "key_plot_beats": "", "character_motivations": "", "climax": "", "narrative_resolution": ""}
"""


def extract_invariants(story_text: str) -> PlotInvariants:
    data = call_json(SYSTEM_PROMPT, f"STORY TEXT:\n{story_text}", max_tokens=500)
    return PlotInvariants(**data)
