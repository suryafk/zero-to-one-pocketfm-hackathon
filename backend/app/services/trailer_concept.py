from app.services.llm_client import call_json

SYSTEM_PROMPT = """You are a trailer editor for an audio-fiction platform.
Read the complete adapted story and extract a spoiler-safe creative concept for a 15-20 second video trailer.
Represent the story as a whole: its central premise, world, protagonist's emotional goal, genre, and stakes.
Create excitement without revealing major twists, the climax, culprit, ending, or resolution.
Do not quote long passages from the story. Do not introduce plot facts that are not present.

Return these JSON fields:
{
  "premise": "A concise spoiler-free overview of the whole story",
  "visual_arc": ["opening visual beat", "escalating visual beat", "unresolved final visual beat"],
  "mood": "visual tone, lighting, pace, and animation style"
}
"""


def extract_trailer_concept(story_text: str, title: str, genre: str, culture: str) -> dict:
    prompt = (
        f"TITLE: {title}\nGENRE: {genre}\nCULTURAL SETTING: {culture}\n\n"
        f"COMPLETE ADAPTED STORY:\n{story_text}"
    )
    concept = call_json(SYSTEM_PROMPT, prompt, max_tokens=500)
    visual_arc = concept.get("visual_arc")
    if not isinstance(visual_arc, list) or len(visual_arc) != 3:
        raise ValueError("Trailer concept must contain exactly three visual beats.")
    return concept

