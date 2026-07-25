import base64
import hashlib
import json
import threading
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from typing import Iterator

import httpx

from app.config import get_settings
from app.schemas import Genre, Region, VoiceStyle
from app.services import voice_synth


@dataclass
class AudioJob:
    condition: threading.Condition = field(default_factory=threading.Condition)
    chunks: list[bytes] = field(default_factory=list)
    done: bool = False
    error: Exception | None = None

    def append(self, chunk: bytes) -> None:
        if not chunk:
            return
        with self.condition:
            self.chunks.append(chunk)
            self.condition.notify_all()

    def finish(self, error: Exception | None = None) -> None:
        with self.condition:
            self.error = error
            self.done = True
            self.condition.notify_all()

    def iterate(self) -> Iterator[bytes]:
        index = 0
        while True:
            with self.condition:
                while index >= len(self.chunks) and not self.done:
                    self.condition.wait(timeout=15)
                available = self.chunks[index:]
                index = len(self.chunks)
                done = self.done
                error = self.error
            yield from available
            if done:
                if error:
                    raise error
                return


_executor = ThreadPoolExecutor(max_workers=6, thread_name_prefix="tts")
_jobs: OrderedDict[str, AudioJob] = OrderedDict()
_jobs_lock = threading.Lock()
MAX_AUDIO_JOBS = 64


def _audio_key(text: str, region: Region, language: str, genre: Genre, style: VoiceStyle) -> str:
    settings = get_settings()
    payload = {
        "text": text,
        "region": region.value,
        "language": language,
        "genre": genre.value,
        "style": style.model_dump(),
        "provider": settings.tts_provider,
        "model": settings.openai_tts_model,
    }
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()


def _run_openai(job: AudioJob, text: str, region: Region, language: str, style: VoiceStyle) -> None:
    settings = get_settings()
    voice_id = voice_synth.OPENAI_REGION_VOICE_MAP.get(region, "alloy")
    instructions = voice_synth._tts_instructions(style, language)
    # Keep provider requests bounded and concatenate MP3 frame streams. This
    # also lets playback begin from the first section while later sections render.
    sections = []
    remaining = text.strip()
    while remaining:
        if len(remaining) <= 3500:
            sections.append(remaining)
            break
        boundary = max(remaining.rfind("\n", 0, 3500), remaining.rfind(". ", 0, 3500))
        if boundary < 1800:
            boundary = 3500
        sections.append(remaining[:boundary + 1].strip())
        remaining = remaining[boundary + 1:].strip()

    for section in sections:
        with httpx.stream(
            "POST",
            "https://api.openai.com/v1/audio/speech",
            headers={"Authorization": f"Bearer {settings.openai_api_key}"},
            json={
                "model": settings.openai_tts_model,
                "voice": voice_id,
                "input": section,
                "instructions": instructions,
                "response_format": "mp3",
            },
            timeout=120,
        ) as response:
            response.raise_for_status()
            for chunk in response.iter_bytes(chunk_size=16 * 1024):
                job.append(chunk)


def _run_fallback(job: AudioJob, text: str, region: Region, language: str, genre: Genre, style: VoiceStyle) -> None:
    voice = voice_synth.synthesize(text, region, style, language, genre)
    if voice.audio_base64:
        audio = base64.b64decode(voice.audio_base64)
        for offset in range(0, len(audio), 16 * 1024):
            job.append(audio[offset:offset + 16 * 1024])
    elif voice.audio_url:
        with httpx.stream("GET", voice.audio_url, timeout=120) as response:
            response.raise_for_status()
            for chunk in response.iter_bytes(chunk_size=16 * 1024):
                job.append(chunk)


def _produce(job: AudioJob, text: str, region: Region, language: str, genre: Genre, style: VoiceStyle) -> None:
    try:
        if get_settings().tts_provider == "openai":
            _run_openai(job, text, region, language, style)
        else:
            _run_fallback(job, text, region, language, genre, style)
        job.finish()
    except Exception as exc:
        job.finish(exc)


def get_or_start_audio(text: str, region: Region, language: str, genre: Genre, style: VoiceStyle) -> str:
    key = _audio_key(text, region, language, genre, style)
    with _jobs_lock:
        if key in _jobs:
            _jobs.move_to_end(key)
            return key
        job = AudioJob()
        _jobs[key] = job
        while len(_jobs) > MAX_AUDIO_JOBS:
            oldest_key, oldest_job = next(iter(_jobs.items()))
            if not oldest_job.done:
                break
            _jobs.pop(oldest_key)
    _executor.submit(_produce, job, text, region, language, genre, style)
    return key


def get_audio_job(key: str) -> AudioJob | None:
    with _jobs_lock:
        job = _jobs.get(key)
        if job:
            _jobs.move_to_end(key)
        return job
