"""
Speech-to-Text (STT) service for transcribing audio input.

This module integrates with an STT provider (initially ElevenLabs) to
convert user-provided audio into text, which can then be fed into the
story adaptation pipeline.
"""
import httpx
import openai
from fastapi import UploadFile

from app.config import get_settings


class STTError(RuntimeError):
    pass


def _elevenlabs_transcribe(audio_file: UploadFile) -> str:
    """Calls the ElevenLabs Speech-to-Text API."""
    settings = get_settings()
    if not settings.elevenlabs_api_key:
        raise STTError("ELEVENLABS_API_KEY is not set in .env")

    files = {"file": (audio_file.filename, audio_file.file, audio_file.content_type)}

    resp = httpx.post(
        "https://api.elevenlabs.io/v1/speech-to-text",
        headers={"xi-api-key": settings.elevenlabs_api_key},
        files=files,
        timeout=60.0,  # Transcription can take longer than other requests
    )

    try:
        resp.raise_for_status()
        return resp.json()["text"]
    except httpx.HTTPStatusError as exc:
        try:
            error_details = exc.response.json().get("detail", {}).get("message", exc.response.text)
        except Exception:
            error_details = exc.response.text
        raise STTError(f"ElevenLabs STT API call failed: {error_details}") from exc
    except Exception as exc:
        raise STTError(f"Failed to process STT response: {exc}") from exc


# --- Commented out OpenAI STT implementation ---
# def _openai_transcribe(audio_file: UploadFile) -> str:
#     """Calls the OpenAI Whisper API for Speech-to-Text."""
#     settings = get_settings()
#     if not settings.openai_api_key:
#         raise STTError("OPENAI_API_KEY is not set in .env")
#
#     client = openai.OpenAI(api_key=settings.openai_api_key)
#
#     try:
#         # The file object must be passed directly to the SDK.
#         # Note: The file handle will be closed by FastAPI after the request.
#         transcription = client.audio.transcriptions.create(
#             model="whisper-1",
#             file=audio_file.file,
#         )
#         return transcription.text
#     except openai.APIError as exc:
#         raise STTError(f"OpenAI STT API call failed: {exc}") from exc
#     except Exception as exc:
#         raise STTError(f"Failed to process OpenAI STT response: {exc}") from exc


def transcribe(audio_file: UploadFile) -> str:
    """Transcribes an audio file to text using the configured provider."""
    settings = get_settings()
    provider = settings.stt_provider

    if provider == "elevenlabs":
        return _elevenlabs_transcribe(audio_file)
    # if provider == "openai":
    #     return _openai_transcribe(audio_file)

    raise NotImplementedError(f"STT provider '{provider}' is not supported.")