"""
Feature 4: Expressive Regional Voice & Accent Synthesizer

This module is a TTS *integration point*, not a TTS engine — per the BRD's
technical guidelines, it should call an accent-capable provider such as
ElevenLabs or Azure Neural TTS with region-specific voice IDs.

No TTS vendor credentials are required to run the base backend: with
TTS_PROVIDER=mock (the default), this returns a stub response so the rest
of the pipeline is fully runnable and testable end-to-end. Flip
TTS_PROVIDER to "elevenlabs" or "azure" and fill in the matching key in
.env to go live.
"""
import base64

import openai
import httpx

from app.config import get_settings
from app.schemas import Region, VoiceResponse

OPENAI_REGION_VOICE_MAP: dict[Region, str] = {
    Region.rural_bhojpuri: "onyx",
    Region.texas_country: "nova",
    Region.south_london_grime: "shimmer",
    Region.street_lagos_pidgin: "alloy",
    Region.mumbai_tapri: "echo",
}

def _openai_synthesize(text: str, region: Region, voice_id: str) -> VoiceResponse:
    settings = get_settings()
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is not set in .env")

    client = openai.OpenAI(api_key=settings.openai_api_key)

    try:
        resp = client.audio.speech.create(
            model=settings.openai_tts_model,
            voice=voice_id,
            input=text,
            response_format="mp3",
        )
    except openai.APIError as exc:
        raise RuntimeError(f"OpenAI TTS API call failed: {exc}") from exc

    audio_b64 = base64.b64encode(resp.content).decode("utf-8")
    return VoiceResponse(
        provider="openai",
        region=region,
        voice_id=voice_id,
        audio_format="mp3",
        audio_base64=audio_b64,
    )


def synthesize(text: str, region: Region, voice_id: str | None = None) -> VoiceResponse:
    resolved_voice_id = voice_id or OPENAI_REGION_VOICE_MAP.get(region, "alloy")
    return _openai_synthesize(text, region, resolved_voice_id)
