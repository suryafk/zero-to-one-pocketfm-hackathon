import sys
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app


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

    def test_native_adapt_route_is_registered_at_documented_path(self) -> None:
        route_paths = {
            route.path
            for route in app.routes
            if "POST" in getattr(route, "methods", set())
        }

        self.assertIn("/api/v1/adapt", route_paths)
        self.assertNotIn("/api/v1/adapt/api/v1/adapt", route_paths)


if __name__ == "__main__":
    unittest.main()
