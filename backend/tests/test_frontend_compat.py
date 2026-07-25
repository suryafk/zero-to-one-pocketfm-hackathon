import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app
from app.schemas import Genre, PlotInvariants, Region, Teaser, VoiceResponse


class FrontendCompatTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def test_stories_endpoint_returns_catalog(self) -> None:
        response = self.client.get("/api/stories")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertTrue(any(item["id"] == "shadow-of-mumbai" for item in data))

    def test_adapt_endpoint_returns_frontend_shape(self) -> None:
        response = self.client.post(
            "/api/adapt",
            json={
                "storyId": "shadow-of-mumbai",
                "genre": "Thriller",
                "culture": "Rural Bhojpuri",
                "language": "Hindi",
                "customPrompt": "Make it feel eerie.",
            },
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("invariants", data)
        self.assertIn("teaser", data)
        self.assertIn("fullEpisode", data)
        self.assertIsInstance(data["invariants"], list)
        self.assertIsInstance(data["teaser"], dict)
        self.assertIsInstance(data["fullEpisode"], dict)

    def test_frontend_adapt_returns_distinct_teaser_audio(self) -> None:
        synthesized_texts = []

        def synthesize(text, region, **_kwargs):
            synthesized_texts.append(text)
            audio = "ZnVsbA==" if len(synthesized_texts) == 1 else "dGVhc2Vy"
            return VoiceResponse(
                provider="test",
                region=region,
                voice_id="test-voice",
                audio_format="mp3",
                audio_base64=audio,
            )

        with (
            patch("app.routers.frontend_compat.get_settings", return_value=SimpleNamespace(openai_api_key=None)),
            patch("app.routers.frontend_compat.voice_synth.synthesize", side_effect=synthesize),
        ):
            response = self.client.post(
                "/api/adapt",
                json={
                    "storyId": "shadow-of-mumbai",
                    "genre": "Thriller",
                    "culture": "Rural Bhojpuri",
                    "language": "Hindi",
                    "synthesizeVoice": True,
                },
            )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["fullEpisode"]["audioUrl"], "data:audio/mp3;base64,ZnVsbA==")
        self.assertEqual(data["teaser"]["audioUrl"], "data:audio/mp3;base64,dGVhc2Vy")
        self.assertEqual(len(synthesized_texts), 2)
        self.assertIn("Who really wrote the letter", synthesized_texts[1])

    def test_native_adapt_returns_teaser_voice(self) -> None:
        invariants = PlotInvariants(
            inciting_incident="A letter returns.",
            key_plot_beats="Discovery and confrontation.",
            character_motivations="Find the truth.",
            climax="The writer is revealed.",
            narrative_resolution="The mystery is resolved.",
        )
        teaser = Teaser(
            hook="The letter came back.",
            rising_tension="Every clue points home.",
            cliffhanger="Who sent it?",
        )
        voices = [
            VoiceResponse(
                provider="test",
                region=Region.rural_bhojpuri,
                voice_id="test-voice",
                audio_format="mp3",
                audio_base64="ZnVsbA==",
            ),
            VoiceResponse(
                provider="test",
                region=Region.rural_bhojpuri,
                voice_id="test-voice",
                audio_format="mp3",
                audio_base64="dGVhc2Vy",
            ),
        ]

        with (
            patch("app.routers.adapt.plot_anchor.extract_invariants", return_value=invariants),
            patch("app.routers.adapt.transformer.transform_story", return_value="The adapted full episode."),
            patch("app.routers.adapt.teaser_service.generate_teaser", return_value=teaser) as generate_teaser,
            patch("app.routers.adapt.voice_synth.synthesize", side_effect=voices) as synthesize,
        ):
            response = self.client.post(
                "/api/v1/adapt",
                data={
                    "story_text": "A sufficiently long source story for adaptation.",
                    "genre": "Thriller",
                    "region": "Rural Bhojpuri",
                    "language": "Hindi",
                    "synthesize_voice": "true",
                },
            )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["voice"]["audio_base64"], "ZnVsbA==")
        self.assertEqual(data["teaser_voice"]["audio_base64"], "dGVhc2Vy")
        self.assertEqual(generate_teaser.call_args.kwargs["target_language"], "Hindi")
        self.assertEqual(synthesize.call_count, 2)
        self.assertEqual(synthesize.call_args_list[1].kwargs["text"], "The letter came back.\n\nEvery clue points home.\n\nWho sent it?")

    def test_teaser_prompt_keeps_selected_language_separate_from_region(self) -> None:
        from app.services import teaser as teaser_service

        generated = {
            "hook": "La carta regresó.",
            "rising_tension": "Cada pista apunta a casa.",
            "cliffhanger": "¿Quién la envió?",
        }
        with patch("app.services.teaser.call_json", return_value=generated) as call_json:
            result = teaser_service.generate_teaser(
                transformed_script="La historia transformada está escrita completamente en español.",
                genre=Genre.thriller,
                region=Region.rural_bhojpuri,
                target_language="Spanish",
            )

        prompt = call_json.call_args.args[1]
        self.assertIn("TARGET LANGUAGE: Spanish", prompt)
        self.assertIn("Write every teaser field only in Spanish", prompt)
        self.assertIn("must not override or mix with the target language", prompt)
        self.assertEqual(result.hook, "La carta regresó.")

    def test_native_adapt_route_is_registered_at_documented_path(self) -> None:
        route_paths = {
            route.path
            for route in app.routes
            if "POST" in getattr(route, "methods", set())
        }

        self.assertIn("/api/v1/adapt", route_paths)
        self.assertNotIn("/api/v1/adapt/api/v1/adapt", route_paths)

    def test_every_frontend_cultural_flavour_is_supported(self) -> None:
        from app.schemas import Region

        frontend_cultures = {
            "Rural Bhojpuri",
            "Mumbai Tapri",
            "Texas Country",
            "South London Grime",
            "Street Lagos Pidgin",
            "Seoul Underground",
            "Rio Favela",
        }
        self.assertSetEqual(frontend_cultures, {region.value for region in Region})


if __name__ == "__main__":
    unittest.main()
