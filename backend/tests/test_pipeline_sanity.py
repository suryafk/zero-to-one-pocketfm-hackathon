"""Offline sanity tests for the adaptation and speech pipeline.

All LLM, transcription, and text-to-speech boundaries are mocked so this
suite never consumes API credits or requires network access.
"""
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app
from app.schemas import Genre, PlotInvariants, Region, Teaser, VoiceResponse
from app.services import voice_synth


INVARIANTS = PlotInvariants(
    inciting_incident="A letter reveals an old secret.",
    key_plot_beats="Letter, investigation, confrontation, resolution",
    character_motivations="The protagonist wants to protect her family.",
    climax="The secret is exposed during a confrontation.",
    narrative_resolution="The family reconciles after learning the truth.",
)
TEASER = Teaser(
    hook="A forgotten letter returns.",
    rising_tension="Every clue points back to the family.",
    cliffhanger="Who hid the truth?",
)


class PipelineSanityTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    @patch("app.routers.adapt.teaser_service.generate_teaser", return_value=TEASER)
    @patch("app.routers.adapt.transformer.transform_story", return_value="Adapted Hindi script.")
    @patch("app.routers.adapt.plot_anchor.extract_invariants", return_value=INVARIANTS)
    def test_text_adaptation_runs_context_transform_and_teaser(
        self, extract_invariants: MagicMock, transform_story: MagicMock, generate_teaser: MagicMock
    ) -> None:
        response = self.client.post(
            "/api/v1/adapt",
            data={
                "story_text": "Maya discovers a letter that exposes a decades-old family secret.",
                "genre": "Thriller",
                "region": "Mumbai Tapri",
                "language": "Hindi",
                "synthesize_voice": "false",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["transformed_script"], "Adapted Hindi script.")
        self.assertIsNone(response.json()["voice"])
        extract_invariants.assert_called_once()
        transform_story.assert_called_once_with(
            story_text="Maya discovers a letter that exposes a decades-old family secret.",
            genre=Genre.thriller,
            region=Region.mumbai_tapri,
            invariants=INVARIANTS,
            target_language="Hindi",
        )
        generate_teaser.assert_called_once()

    @patch("app.routers.adapt.teaser_service.generate_teaser", return_value=TEASER)
    @patch("app.routers.adapt.transformer.transform_story", return_value="Adapted story.")
    @patch("app.routers.adapt.plot_anchor.extract_invariants", return_value=INVARIANTS)
    @patch("app.routers.adapt.speech_to_text.transcribe", return_value="Transcript from the uploaded MP3.")
    def test_mp3_is_transcribed_then_adapted(
        self,
        transcribe: MagicMock,
        extract_invariants: MagicMock,
        transform_story: MagicMock,
        generate_teaser: MagicMock,
    ) -> None:
        response = self.client.post(
            "/api/v1/adapt",
            data={
                "genre": "Horror",
                "region": "Seoul Underground",
                "language": "Korean",
                "synthesize_voice": "false",
            },
            files={"audio_file": ("story.mp3", b"not-real-audio", "audio/mpeg")},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["source_transcript"], "Transcript from the uploaded MP3.")
        transcribe.assert_called_once()
        transform_story.assert_called_once_with(
            story_text="Transcript from the uploaded MP3.",
            genre=Genre.horror,
            region=Region.seoul_underground,
            invariants=INVARIANTS,
            target_language="Korean",
        )

    @patch("app.routers.adapt.teaser_service.generate_teaser", return_value=TEASER)
    @patch("app.routers.adapt.transformer.transform_story", return_value="Adapted story.")
    @patch("app.routers.adapt.plot_anchor.extract_invariants", return_value=INVARIANTS)
    @patch("app.routers.adapt.voice_synth.synthesize")
    def test_voice_style_request_fields_are_forwarded_to_tts(
        self,
        synthesize: MagicMock,
        extract_invariants: MagicMock,
        transform_story: MagicMock,
        generate_teaser: MagicMock,
    ) -> None:
        synthesize.return_value = VoiceResponse(
            provider="openai", region=Region.rio_favela, voice_id="nova", audio_format="mp3", audio_base64="YXVkaW8="
        )
        response = self.client.post(
            "/api/v1/adapt",
            data={
                "story_text": "A courier races across the city to expose a conspiracy.",
                "genre": "Thriller",
                "region": "Rio Favela",
                "language": "Portuguese",
                "synthesize_voice": "true",
                "accent": "Rio Portuguese",
                "emotional_range": "high tension",
                "intonation": "sharp rises",
                "impressions": "streetwise narrator",
                "speed_of_speech": "brisk",
                "tone": "urgent",
                "whispering": "whisper secrets",
            },
        )

        self.assertEqual(response.status_code, 200)
        style = response.json()["voice_style"]
        self.assertEqual(style["accent"], "Rio Portuguese")
        self.assertEqual(style["tone"], "urgent")
        self.assertEqual(synthesize.call_args.kwargs["voice_style"].speed_of_speech, "brisk")
        self.assertEqual(synthesize.call_args.kwargs["language"], "Portuguese")

    def test_openai_tts_sends_style_as_api_instructions(self) -> None:
        style = voice_synth.derive_voice_style(Genre.horror, Region.mumbai_tapri, {"tone": "ominous"})
        speech = MagicMock()
        speech.create.return_value = SimpleNamespace(content=b"mp3-bytes")
        client = MagicMock()
        client.audio.speech = speech
        settings = SimpleNamespace(openai_api_key="test-key", openai_tts_model="gpt-4o-mini-tts")

        with patch("app.services.voice_synth.get_settings", return_value=settings), patch(
            "app.services.voice_synth.openai.OpenAI", return_value=client
        ):
            result = voice_synth._openai_synthesize("A secret waits in the dark.", Region.mumbai_tapri, "echo", voice_synth._tts_instructions(style, "Hindi"))

        self.assertEqual(result.audio_format, "mp3")
        request = speech.create.call_args.kwargs
        self.assertIn("instructions", request["extra_body"])
        self.assertIn("Tone: ominous", request["extra_body"]["instructions"])

    def test_unknown_cultural_flavour_is_rejected_not_silently_replaced(self) -> None:
        response = self.client.post(
            "/api/adapt",
            json={
                "storyId": "shadow-of-mumbai",
                "genre": "Thriller",
                "culture": "Unknown Culture",
                "language": "Hindi",
            },
        )

        self.assertEqual(response.status_code, 422)
        self.assertIn("Unsupported Cultural Flavour", response.json()["detail"])


if __name__ == "__main__":
    unittest.main()
