"""
Feature 4: Expressive Regional Voice & Accent Synthesizer

This module is a TTS *integration point*, not a TTS engine — per the BRD's
technical guidelines, it should call an accent-capable provider such as
ElevenLabs or Azure Neural TTS with region-specific voice IDs.

No TTS vendor credentials are required to run the base backend: with
TTS_PROVIDER=mock (the default), this returns a stub response so the rest
of the pipeline is fully runnable and testable end-to-end. Flip
TTS_PROVIDER to "elevenlabs" or "azure" and fill in the matching key in
environment variables to go live.
"""
import base64

import openai
import httpx

from app.config import get_settings
from app.schemas import Genre, Region, VoiceResponse, VoiceStyle

# Placeholder voice ID mapping. Replace with real voice IDs from your TTS
# provider once one is configured -- these are just stable, readable keys
# so the rest of the app has something concrete to reference.
REGION_VOICE_MAP: dict[Region, str] = {
    Region.rural_bhojpuri: "NhwTI3t2DXME1ogDNGJX",
    Region.texas_country: "VAnZB441uRGQ8uoZunqz",
    Region.south_london_grime: "Oe8Lhg3t63j9BsrTQBjx",
    Region.street_lagos_pidgin: "1aJyZpkt0vxhGPBnPyrs",
    Region.mumbai_tapri: "lbmRnV8aAoM7XNi7APGH",
    Region.seoul_underground: "default",
    Region.rio_favela: "default",
}

# Example voice ID mapping for OpenAI TTS. The available voices are 'alloy',
# 'echo', 'fable', 'onyx', 'nova', and 'shimmer'. This is a sample mapping.
OPENAI_REGION_VOICE_MAP: dict[Region, str] = {
    Region.rural_bhojpuri: "onyx",
    Region.texas_country: "nova",
    Region.south_london_grime: "shimmer",
    Region.street_lagos_pidgin: "alloy",
    Region.mumbai_tapri: "echo",
    Region.seoul_underground: "shimmer",
    Region.rio_favela: "nova",
}


def _mock_synthesize(text: str, region: Region, voice_id: str) -> VoiceResponse:
    return VoiceResponse(
        provider="mock",
        region=region,
        voice_id=voice_id,
        audio_format="none",
        audio_base64=None,
        audio_url=None,
        note=(
            "TTS_PROVIDER=mock: no audio was generated. Set TTS_PROVIDER=elevenlabs "
            "or TTS_PROVIDER=azure and set the matching API key environment variable to synthesize "
            "real audio for this text."
        ),
    )


def _elevenlabs_synthesize(text: str, region: Region, voice_id: str) -> VoiceResponse:
    settings = get_settings()
    if not settings.elevenlabs_api_key:
        raise RuntimeError("ELEVENLABS_API_KEY is not set in the app environment")

    print(f"Calling ElevenLabs TTS API for voice_id: {voice_id}")
    resp = httpx.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
        headers={
            "xi-api-key": settings.elevenlabs_api_key,
            "Content-Type": "application/json",
        },
        json={"text": text, "model_id": "eleven_multilingual_v2"},
        timeout=30.0,
    )
    print(f"ElevenLabs TTS response status: {resp.status_code}")
    resp.raise_for_status()
    audio_b64 = base64.b64encode(resp.content).decode("utf-8")
    return VoiceResponse(
        provider="elevenlabs",
        region=region,
        voice_id=voice_id,
        audio_format="mp3",
        audio_base64=audio_b64,
    )


def _azure_synthesize(text: str, region: Region, voice_id: str) -> VoiceResponse:
    settings = get_settings()
    if not settings.azure_speech_key or not settings.azure_speech_region:
        raise RuntimeError("AZURE_SPEECH_KEY / AZURE_SPEECH_REGION are not set in the app environment")

    ssml = f"""<speak version='1.0' xml:lang='en-US'>
<voice name='{voice_id}'>{text}</voice>
</speak>"""

    print(f"Calling Azure TTS API for voice_id: {voice_id}")
    resp = httpx.post(
        f"https://{settings.azure_speech_region}.tts.speech.microsoft.com/cognitiveservices/v1",
        headers={
            "Ocp-Apim-Subscription-Key": settings.azure_speech_key,
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": "audio-16khz-64kbitrate-mono-mp3",
        },
        content=ssml.encode("utf-8"),
        timeout=30.0,
    )
    print(f"Azure TTS response status: {resp.status_code}")
    resp.raise_for_status()
    audio_b64 = base64.b64encode(resp.content).decode("utf-8")
    return VoiceResponse(
        provider="azure",
        region=region,
        voice_id=voice_id,
        audio_format="mp3",
        audio_base64=audio_b64,
    )


def derive_voice_style(genre: Genre, region: Region, overrides: dict[str, str | None]) -> VoiceStyle:
    """Build a complete narration profile, keeping request values as overrides."""
    genre_defaults = {
        Genre.horror: ("wide, from uneasy restraint to sharp fear", "low, suspenseful rises", "intimate storyteller", "measured and deliberate", "dark and tense", "occasional quiet whispers at revelations"),
        Genre.comedy: ("lively and playful", "bouncy with comedic pauses", "warm, witty host", "brisk but clear", "light and mischievous", "never whisper"),
        Genre.thriller: ("controlled urgency", "crisp rises at danger and short pauses", "focused investigative narrator", "brisk and deliberate", "tense and urgent", "brief whispers for secrets"),
        Genre.romance: ("gentle and expressive", "soft, flowing contours", "intimate confidant", "unhurried", "warm and tender", "soft whispers for intimate moments"),
        Genre.sci_fi: ("restrained awe and concern", "precise with subtle rises", "cinematic future narrator", "steady", "curious and atmospheric", "quiet whispers for unknown discoveries"),
        Genre.drama: ("natural and emotionally grounded", "conversational, with reflective pauses", "empathetic storyteller", "natural pace", "earnest and human", "only when the scene calls for intimacy"),
    }
    emotional_range, intonation, impressions, speed, tone, whispering = genre_defaults[genre]
    defaults = {
        "accent": f"a natural, respectful {region.value} flavour",
        "emotional_range": emotional_range,
        "intonation": intonation,
        "impressions": impressions,
        "speed_of_speech": speed,
        "tone": tone,
        "whispering": whispering,
    }
    return VoiceStyle(**{key: overrides.get(key) or value for key, value in defaults.items()})


def _tts_instructions(style: VoiceStyle, language: str) -> str:
    return (
        f"Narrate in {language}. Accent: {style.accent}. Emotional range: {style.emotional_range}. "
        f"Intonation: {style.intonation}. Character impression: {style.impressions}. "
        f"Speed of speech: {style.speed_of_speech}. Tone: {style.tone}. Whispering: {style.whispering}."
    )


def _openai_synthesize(text: str, region: Region, voice_id: str, instructions: str) -> VoiceResponse:
    settings = get_settings()
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is not set in the app environment")

    client = openai.OpenAI(api_key=settings.openai_api_key)

    try:
        resp = client.audio.speech.create(
            model=settings.openai_tts_model,
            voice=voice_id,
            input=text,
            extra_body={"instructions": instructions},
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


def synthesize(
    text: str,
    region: Region,
    voice_style: VoiceStyle | None = None,
    language: str = "English",
    genre: Genre = Genre.drama,
    voice_id: str | None = None,
) -> VoiceResponse:
    settings = get_settings()
    voice_style = voice_style or derive_voice_style(genre, region, {})

    print(f"Synthesizing speech with provider: {settings.tts_provider}")
    if settings.tts_provider == "elevenlabs":
        resolved_voice_id = voice_id or REGION_VOICE_MAP.get(region, "default")
        return _elevenlabs_synthesize(text, region, resolved_voice_id)
    if settings.tts_provider == "openai":
        resolved_voice_id = voice_id or OPENAI_REGION_VOICE_MAP.get(region, "alloy")
        return _openai_synthesize(text, region, resolved_voice_id, _tts_instructions(voice_style, language))

    # Default to mock if no provider is matched or if it's explicitly set to "mock"
    resolved_voice_id = voice_id or REGION_VOICE_MAP.get(region, "default")
    return _mock_synthesize(text, region, resolved_voice_id)
