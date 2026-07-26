"""Application configuration sourced exclusively from process environment variables."""
import os
from dataclasses import dataclass, field
from functools import lru_cache


def _env(name: str, default: str = "") -> str:
    """Read an environment variable without loading a local settings file."""
    return os.getenv(name, default)


def _env_bool(name: str, default: bool = False) -> bool:
    value = _env(name, str(default)).strip().lower()
    return value in {"1", "true", "t", "yes", "y", "on"}


@dataclass(frozen=True)
class Settings:
    # --- OpenAI (LLM layer) ---
    openai_api_key: str = field(default_factory=lambda: _env("OPENAI_API_KEY"))
    openai_model: str = field(default_factory=lambda: _env("OPENAI_MODEL", "gpt-4o"))
    openai_tts_model: str = field(default_factory=lambda: _env("OPENAI_TTS_MODEL", "gpt-4o-mini-tts"))
    openai_stt_model: str = field(default_factory=lambda: _env("OPENAI_STT_MODEL", "gpt-4o-transcribe"))
    openai_video_model: str = field(default_factory=lambda: _env("OPENAI_VIDEO_MODEL", "sora-2"))
    video_generation_enabled: bool = field(default_factory=lambda: _env_bool("VIDEO_GENERATION_ENABLED"))

    # --- Speech ---
    tts_provider: str = field(default_factory=lambda: _env("TTS_PROVIDER", "openai"))
    stt_provider: str = field(default_factory=lambda: _env("STT_PROVIDER", "openai"))
    elevenlabs_api_key: str = field(default_factory=lambda: _env("ELEVENLABS_API_KEY"))
    azure_speech_key: str = field(default_factory=lambda: _env("AZURE_SPEECH_KEY"))
    azure_speech_region: str = field(default_factory=lambda: _env("AZURE_SPEECH_REGION"))

    # --- App ---
    cors_allow_origins: str = field(default_factory=lambda: _env("CORS_ALLOW_ORIGINS", "*"))


@lru_cache
def get_settings() -> Settings:
    """Return cached settings; call ``get_settings.cache_clear()`` in tests after env changes."""
    return Settings()
