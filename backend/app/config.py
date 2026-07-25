"""
Application configuration.

Reads settings from environment variables / a .env file. Copy `.env.example`
to `.env` and fill in your keys before running the server.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- OpenAI (LLM layer) ---
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"

    # --- TTS layer (Feature 4) ---
    # "mock" returns a stubbed response with no external call, useful for local dev
    # and hackathon demos without TTS credentials. Swap in "elevenlabs" or "azure"
    # once you have keys.
    tts_provider: str = "mock"
    # "elevenlabs" or "openai" (when uncommented).
    stt_provider: str = "elevenlabs"

    elevenlabs_api_key: str = ""
    azure_speech_key: str = ""
    azure_speech_region: str = ""

    # --- App ---
    cors_allow_origins: str = "*"  # comma-separated list, or "*" for all


@lru_cache
def get_settings() -> Settings:
    return Settings()
