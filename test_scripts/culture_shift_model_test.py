#!/usr/bin/env python3
"""
CultureShift AI — Feature 2 & 3 Model Comparison Harness
=========================================================
Feature 2: Multi-Axis Transformation Matrix (Genre Shift)
Feature 3: Hyper-Local Idiom & Humor Mapper

Takes a story text + target genre + target cultural/regional axis,
runs the SAME transformation prompt across several Claude models,
and writes each model's output to its own file so you can eyeball
quality differences side by side.

USAGE
-----
1. Install the SDK:
     pip install anthropic --break-system-packages

2. Set your API key:
     export ANTHROPIC_API_KEY="sk-ant-..."

3. Edit the CONFIG block below (input text, genre, region, models to test),
   or pass a text file as an argument:
     python3 culture_shift_model_test.py my_story.txt

4. Run it:
     python3 culture_shift_model_test.py

Outputs land in ./culture_shift_outputs/<model_id>.md, plus a
comparison_summary.md with all outputs + timing + token usage side by side.
"""

import os
import sys
import json
import time
from pathlib import Path
from datetime import datetime

try:
    import anthropic
except ImportError:
    sys.exit(
        "Missing dependency. Run:\n"
        "    pip install anthropic --break-system-packages"
    )

# =============================================================================
# CONFIG — edit these for each test run
# =============================================================================

# Which models to compare. These are the current model ID strings as of
# July 2026. Swap/add/remove as needed — the harness loops over this list.
MODELS_TO_TEST = [
    "claude-haiku-4-5-20251001",   # fastest / cheapest — good latency baseline
    "claude-sonnet-5",             # balanced — likely production default
    "claude-opus-4-8",             # highest quality — best for nuanced idiom work
]

TARGET_GENRE = "Drama"                    # Horror, Comedy, Thriller, Romance, Sci-Fi, Drama
TARGET_CULTURE = "Modern Delhi"             # e.g. Rural Bhojpuri, Texas Country, South London Grime, Street Lagos Pidgin

# Fallback sample input if no file is passed as an argument.
SAMPLE_INPUT_TEXT = """
Sarah walked into the Starbucks on 5th Avenue, her hands shaking as she
scrolled through the voicemail again. "We need to talk," her ex-husband's
voice said. "It's about the house." She ordered a grande latte and sat by
the window, watching the yellow cabs crawl through Manhattan traffic,
dreading the conversation that was about to change everything.
"""

OUTPUT_DIR = Path("culture_shift_outputs")
MAX_TOKENS = 2000

# =============================================================================
# PROMPT — encodes the Feature 1 (invariants) + Feature 2/3 constraints from
# the BRD so every model is judged against the same acceptance criteria.
# =============================================================================

SYSTEM_PROMPT = """You are the Multi-Axis Transformation engine for CultureShift AI,
an audio story localization system.

You will be given:
- A source story
- A target GENRE
- A target CULTURAL/REGIONAL flavour

Your job has two locked constraints and two transformation tasks:

LOCKED CONSTRAINTS (must NOT change, per the Core Plot Anchor):
1. Inciting Incident — must remain the same event
2. Key Plot Beats — same sequence of major story turns
3. Character Motivations — characters want the same things for the same reasons
4. Climax — same core confrontation/turning point
5. Narrative Resolution — same ending outcome

TRANSFORMATION TASKS:
A. GENRE SHIFT (Feature 2): Rewrite the atmosphere, pacing, and stylistic
   tropes to authentically match the target genre. A Horror version should
   feel dread-laden and tense; a Comedy version should feel light and witty;
   etc. Do not just add a genre label — actually shift tone, sentence rhythm,
   and sensory detail to match.

B. HYPER-LOCAL IDIOM MAPPING (Feature 3): Replace every non-translatable
   metaphor, brand reference, food/drink item, and geographical reference
   with an equivalent that is authentic to the target culture/region. Do NOT
   do a literal/direct translation — find the true cultural equivalent (e.g.
   "grabbing a Starbucks in Manhattan" -> "drinking a cutting chai at a
   Mumbai tapri", not "grabbing a coffee in Mumbai"). Local slang, humor, and
   phrasing should sound like an authentic native speaker of that region
   wrote it, not a translated script.

OUTPUT FORMAT — respond with ONLY valid JSON, no markdown fences, no preamble:
{
  "transformed_script": "<the full rewritten story text>",
  "locked_invariants_check": {
    "inciting_incident_preserved": true/false,
    "key_plot_beats_preserved": true/false,
    "character_motivations_preserved": true/false,
    "climax_preserved": true/false,
    "narrative_resolution_preserved": true/false
  },
  "localized_elements": [
    {"original": "<original reference>", "localized": "<local equivalent>"}
  ]
}
"""

USER_PROMPT_TEMPLATE = """SOURCE STORY:
{story}

TARGET GENRE: {genre}
TARGET CULTURAL/REGIONAL FLAVOUR: {culture}

Transform this story per your instructions. Respond with ONLY the JSON object."""


def load_input_text() -> str:
    if len(sys.argv) > 1:
        path = Path(sys.argv[1])
        if not path.exists():
            sys.exit(f"Input file not found: {path}")
        return path.read_text(encoding="utf-8")
    return SAMPLE_INPUT_TEXT.strip()


def run_model(client: anthropic.Anthropic, model: str, story: str) -> dict:
    """Call one model and return timing + usage + parsed (or raw) output."""
    user_prompt = USER_PROMPT_TEMPLATE.format(
        story=story, genre=TARGET_GENRE, culture=TARGET_CULTURE
    )

    start = time.time()
    try:
        response = client.messages.create(
            model=model,
            max_tokens=MAX_TOKENS,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )
        elapsed = time.time() - start

        raw_text = "".join(
            block.text for block in response.content if block.type == "text"
        )

        # Try to parse JSON; fall back to raw text if the model didn't comply.
        parsed = None
        cleaned = raw_text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError:
            pass

        return {
            "model": model,
            "success": True,
            "elapsed_seconds": round(elapsed, 2),
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
            "raw_text": raw_text,
            "parsed": parsed,
        }
    except Exception as e:
        return {
            "model": model,
            "success": False,
            "elapsed_seconds": round(time.time() - start, 2),
            "error": str(e),
        }


def write_model_output(result: dict):
    OUTPUT_DIR.mkdir(exist_ok=True)
    path = OUTPUT_DIR / f"{result['model']}.md"

    lines = [f"# Output — {result['model']}", ""]
    if not result["success"]:
        lines.append(f"**FAILED:** {result['error']}")
    else:
        lines.append(f"- Time: {result['elapsed_seconds']}s")
        lines.append(f"- Input tokens: {result['input_tokens']}")
        lines.append(f"- Output tokens: {result['output_tokens']}")
        lines.append("")
        if result["parsed"]:
            lines.append("## Transformed Script")
            lines.append(result["parsed"].get("transformed_script", "(missing)"))
            lines.append("")
            lines.append("## Locked Invariants Check")
            lines.append("```json")
            lines.append(json.dumps(result["parsed"].get("locked_invariants_check", {}), indent=2))
            lines.append("```")
            lines.append("")
            lines.append("## Localized Elements")
            for item in result["parsed"].get("localized_elements", []):
                lines.append(f"- **{item.get('original')}** -> **{item.get('localized')}**")
        else:
            lines.append("## Raw Output (JSON parse failed — model didn't follow schema)")
            lines.append("```")
            lines.append(result["raw_text"])
            lines.append("```")

    path.write_text("\n".join(lines), encoding="utf-8")
    return path


def write_summary(story: str, results: list):
    path = OUTPUT_DIR / "comparison_summary.md"
    lines = [
        "# CultureShift AI — Model Comparison Summary",
        f"Run: {datetime.now().isoformat(timespec='seconds')}",
        f"Genre: **{TARGET_GENRE}** | Culture: **{TARGET_CULTURE}**",
        "",
        "## Source Story",
        story.strip(),
        "",
        "## Results at a Glance",
        "",
        "| Model | Success | Time (s) | Input Tok | Output Tok | JSON Valid |",
        "|---|---|---|---|---|---|",
    ]
    for r in results:
        if r["success"]:
            lines.append(
                f"| {r['model']} | ✅ | {r['elapsed_seconds']} | {r['input_tokens']} | "
                f"{r['output_tokens']} | {'✅' if r['parsed'] else '❌'} |"
            )
        else:
            lines.append(f"| {r['model']} | ❌ | {r['elapsed_seconds']} | - | - | - |")

    lines.append("")
    lines.append("Full per-model outputs are in the sibling `.md` files in this folder.")
    path.write_text("\n".join(lines), encoding="utf-8")
    return path


def main():
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        sys.exit("Set ANTHROPIC_API_KEY in your environment before running this script.")

    client = anthropic.Anthropic(api_key=api_key)
    story = load_input_text()

    print(f"Testing {len(MODELS_TO_TEST)} models | Genre={TARGET_GENRE} | Culture={TARGET_CULTURE}\n")

    results = []
    for model in MODELS_TO_TEST:
        print(f"-> Running {model} ...", end=" ", flush=True)
        result = run_model(client, model, story)
        results.append(result)
        if result["success"]:
            print(f"done in {result['elapsed_seconds']}s "
                  f"({result['input_tokens']} in / {result['output_tokens']} out)")
        else:
            print(f"FAILED: {result['error']}")
        out_path = write_model_output(result)
        print(f"   written to {out_path}")

    summary_path = write_summary(story, results)
    print(f"\nSummary written to {summary_path}")


if __name__ == "__main__":
    main()
