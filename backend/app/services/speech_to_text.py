"""
Speech-to-Text (STT) service for transcribing audio input.

This module integrates with an STT provider (OpenAI by default) to
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
        raise STTError("ELEVENLABS_API_KEY is not set in the app environment")

    files = {"file": (audio_file.filename, audio_file.file, audio_file.content_type)}

    print("Calling ElevenLabs STT API...")
    resp = httpx.post(
        "https://api.elevenlabs.io/v1/speech-to-text",
        headers={"xi-api-key": settings.elevenlabs_api_key},
        files=files,
        timeout=60.0,  # Transcription can take longer than other requests
    )

    try:
        resp.raise_for_status()
        print("ElevenLabs STT API call successful.")
        return resp.json()["text"]
    except httpx.HTTPStatusError as exc:
        try:
            error_details = exc.response.json().get("detail", {}).get("message", exc.response.text)
        except Exception:
            error_details = exc.response.text
        print(f"ElevenLabs STT API call failed: {error_details}")
        raise STTError(f"ElevenLabs STT API call failed: {error_details}") from exc
    except Exception as exc:
        print(f"Failed to process STT response: {exc}")
        raise STTError(f"Failed to process STT response: {exc}") from exc


def _openai_transcribe(audio_file: UploadFile) -> str:
    """Transcribe a completed uploaded audio file with OpenAI Audio API."""
    settings = get_settings()
    if not settings.openai_api_key:
        raise STTError("OPENAI_API_KEY is not set in the app environment")

    try:
        # UploadFile may already have been inspected, so make sure the SDK
        # reads the complete stream from its beginning.
        audio_file.file.seek(0)
        transcription = openai.OpenAI(api_key=settings.openai_api_key).audio.transcriptions.create(
            model=settings.openai_stt_model,
            file=(
                audio_file.filename or "uploaded-story.mp3",
                audio_file.file,
                audio_file.content_type or "audio/mpeg",
            ),
            response_format="json",
            prompt="This is a narrated story. Preserve names, dialogue, punctuation, and the original language.",
        )
        text = (transcription.text or "").strip()
        if not text:
            raise STTError("OpenAI returned an empty transcript.")
        return text
    except openai.APIError as exc:
        raise STTError(f"OpenAI transcription failed: {exc}") from exc
    except STTError:
        raise
    except Exception as exc:
        raise STTError(f"Failed to process OpenAI transcription: {exc}") from exc


def transcribe(audio_file: UploadFile) -> str:
    """Transcribes an audio file to text using the configured provider."""
    settings = get_settings()
    provider = settings.stt_provider

    print(f"Transcribing audio using '{provider}' provider.")
    if provider == "openai":
        return _openai_transcribe(audio_file)
    if provider == "elevenlabs":
        return _elevenlabs_transcribe(audio_file)

    raise NotImplementedError(f"STT provider '{provider}' is not supported.")
