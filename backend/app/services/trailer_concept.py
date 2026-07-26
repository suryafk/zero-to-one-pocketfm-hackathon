from app.services.llm_client import call_json

SYSTEM_PROMPT = """You are a trailer editor for an audio-fiction platform.
Read the complete adapted story and extract a concise, spoiler-safe creative concept for a 20-second video trailer.
Represent the story as a whole: its central premise, world, protagonist's emotional goal, genre, and stakes.
Create excitement without revealing major twists, the climax, culprit, ending, or resolution.
Build toward an unresolved question or danger that makes the audience want to hear the complete story.
Do not quote long passages from the story. Do not introduce plot facts that are not present.
Write trailer_summary, voiceover_script, suspense_line, and call_to_action entirely in the requested target language.
The call_to_action must be a natural translation of: "Hear the complete story to know what happens next."

Return these JSON fields:
{
  "trailer_summary": "One exciting spoiler-free summary, maximum 45 words",
  "voiceover_script": "A complete 30-40 word narration ending in an unresolved hook; do not include the final call to action",
  "visual_arc": ["opening visual beat", "escalating visual beat", "unresolved final visual beat"],
  "mood": "visual tone, lighting, pace, and animation style",
  "suspense_line": "A short unresolved hook immediately before the final call to action",
  "call_to_action": "Localized invitation to hear the complete story"
}
"""


def extract_trailer_concept(story_text: str, title: str, genre: str, culture: str, language: str) -> dict:
    prompt = (
        f"TITLE: {title}\nGENRE: {genre}\nCULTURAL SETTING: {culture}\n"
        f"TARGET LANGUAGE: {language}\n\n"
        f"COMPLETE ADAPTED STORY:\n{story_text}"
    )
    concept = call_json(SYSTEM_PROMPT, prompt, max_tokens=500)
    visual_arc = concept.get("visual_arc")
    if not isinstance(visual_arc, list) or len(visual_arc) != 3:
        raise ValueError("Trailer concept must contain exactly three visual beats.")
    if not concept.get("suspense_line"):
        raise ValueError("Trailer concept must contain a suspense line.")
    if not concept.get("call_to_action"):
        raise ValueError("Trailer concept must contain a localized call to action.")
    summary_words = str(concept.get("trailer_summary", "")).split()
    voiceover_words = str(concept.get("voiceover_script", "")).split()
    if not summary_words or len(summary_words) > 45:
        raise ValueError("Trailer summary must contain no more than 45 words.")
    if not voiceover_words or len(voiceover_words) > 45:
        raise ValueError("Trailer voiceover must contain no more than 45 words.")
    return concept
