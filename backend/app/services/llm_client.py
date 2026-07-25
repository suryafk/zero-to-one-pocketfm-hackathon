"""
Thin wrapper around the OpenAI SDK.

Centralizes prompt-calling and strict-JSON parsing so every service module
(plot anchor, transformer, teaser) shares one path, per the BRD's
"Prompting Layer" guideline (system prompts with target persona
guidelines) and "LLM Layer" guideline (strict JSON schemas).

Uses OpenAI's native JSON mode (response_format={"type": "json_object"})
so the model is constrained to return valid JSON directly, rather than
relying on markdown-fence stripping.
"""
import json
from typing import Any

import openai

from app.config import get_settings


class LLMError(RuntimeError):
    pass


def _client() -> openai.OpenAI:
    settings = get_settings()
    api_key = settings.openai_api_key.strip()
    if not api_key or api_key in {"sk-...", "your-api-key-here"}:
        raise LLMError(
            "OPENAI_API_KEY is missing or still a placeholder. "
            "Add a valid key to backend/.env and restart the server."
        )
    return openai.OpenAI(api_key=api_key)


def call_json(system_prompt: str, user_prompt: str, max_tokens: int = 1200) -> dict[str, Any]:
    """
    Calls the model with a system prompt that mandates strict-JSON output,
    then parses the response. Raises LLMError on any failure so routers can
    translate it into a clean HTTP error.
    """
    settings = get_settings()
    client = _client()

    # Reinforce the JSON requirement in the system prompt -- OpenAI's JSON
    # mode requires the word "JSON" to appear in the prompt somewhere.
    json_system_prompt = system_prompt.strip() + "\n\nAlways respond with a single valid JSON object."

    try:
        completion = client.chat.completions.create(
            model=settings.openai_model,
            max_tokens=max_tokens,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": json_system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
    except openai.APIError as exc:
        raise LLMError(f"OpenAI API call failed: {exc}") from exc

    raw = (completion.choices[0].message.content or "").strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise LLMError(f"Model did not return valid JSON: {exc}\nRaw output: {raw[:500]}") from exc
