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

import httpx

from app.config import get_settings
from app.schemas import Region, VoiceResponse

# Placeholder voice ID mapping. Replace with real voice IDs from your TTS
# provider once one is configured -- these are just stable, readable keys
# so the rest of the app has something concrete to reference.
REGION_VOICE_MAP: dict[Region, str] = {
    Region.rural_bhojpuri: "bhojpuri_rural_m01",
    Region.texas_country: "texas_country_f01",
    Region.south_london_grime: "s_london_grime_m01",
    Region.street_lagos_pidgin: "lagos_pidgin_m01",
    Region.mumbai_tapri: "mumbai_tapri_f01",
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
            "or TTS_PROVIDER=azure and add the matching API key in .env to synthesize "
            "real audio for this text."
        ),
    )


def _elevenlabs_synthesize(text: str, region: Region, voice_id: str) -> VoiceResponse:
    settings = get_settings()
    if not settings.elevenlabs_api_key:
        raise RuntimeError("ELEVENLABS_API_KEY is not set in .env")

    resp = httpx.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
        headers={
            "xi-api-key": settings.elevenlabs_api_key,
            "Content-Type": "application/json",
        },
        json={"text": text, "model_id": "eleven_multilingual_v2"},
        timeout=30.0,
    )
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
        raise RuntimeError("AZURE_SPEECH_KEY / AZURE_SPEECH_REGION are not set in .env")

    ssml = f"""<speak version='1.0' xml:lang='en-US'>
<voice name='{voice_id}'>{text}</voice>
</speak>"""

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
    resp.raise_for_status()
    audio_b64 = base64.b64encode(resp.content).decode("utf-8")
    return VoiceResponse(
        provider="azure",
        region=region,
        voice_id=voice_id,
        audio_format="mp3",
        audio_base64=audio_b64,
    )


def synthesize(text: str, region: Region, voice_id: str | None = None) -> VoiceResponse:
    settings = get_settings()
    resolved_voice_id = voice_id or REGION_VOICE_MAP.get(region, "default")

    if settings.tts_provider == "elevenlabs":
        return _elevenlabs_synthesize(text, region, resolved_voice_id)
    if settings.tts_provider == "azure":
        return _azure_synthesize(text, region, resolved_voice_id)
    return _mock_synthesize(text, region, resolved_voice_id)
