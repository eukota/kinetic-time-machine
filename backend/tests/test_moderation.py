import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import io
import pytest
from PIL import Image

from utils.moderation import Verdict, moderate_image


@pytest.fixture(autouse=True)
def manual_mode(monkeypatch):
    monkeypatch.setenv("MODERATION_MODE", "manual")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)


def _write_jpeg(path: str, size: tuple[int, int] = (400, 400), color="blue"):
    img = Image.new("RGB", size, color=color)
    img.save(path, format="JPEG")


def test_basic_reject_tiny_image(tmp_path):
    p = tmp_path / "tiny.jpg"
    _write_jpeg(str(p), size=(50, 50))
    result = moderate_image(str(p))
    assert result.verdict == Verdict.REJECT


def test_manual_mode_queues_for_review(tmp_path):
    p = tmp_path / "ok.jpg"
    _write_jpeg(str(p))
    result = moderate_image(str(p))
    assert result.verdict == Verdict.REVIEW
    assert result.provider == "manual"


def test_permissive_auto_approves(tmp_path, monkeypatch):
    monkeypatch.setenv("MODERATION_MODE", "permissive")
    p = tmp_path / "ok.jpg"
    _write_jpeg(str(p))
    result = moderate_image(str(p))
    assert result.verdict == Verdict.APPROVE


def test_openai_approve_when_clean(tmp_path, monkeypatch):
    monkeypatch.setenv("MODERATION_MODE", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    p = tmp_path / "ok.jpg"
    _write_jpeg(str(p))

    class FakeResp:
        def raise_for_status(self):
            pass

        def json(self):
            return {"results": [{"flagged": False, "categories": {}, "category_scores": {}}]}

    monkeypatch.setattr(
        "utils.moderation.httpx.post",
        lambda *a, **k: FakeResp(),
    )

    result = moderate_image(str(p), latitude=40.87, longitude=-124.09)
    assert result.verdict == Verdict.APPROVE


def test_openai_reject_sexual(tmp_path, monkeypatch):
    monkeypatch.setenv("MODERATION_MODE", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    p = tmp_path / "ok.jpg"
    _write_jpeg(str(p))

    class FakeResp:
        def raise_for_status(self):
            pass

        def json(self):
            return {
                "results": [{
                    "flagged": True,
                    "categories": {"sexual": True},
                    "category_scores": {"sexual": 0.99},
                }]
            }

    monkeypatch.setattr(
        "utils.moderation.httpx.post",
        lambda *a, **k: FakeResp(),
    )

    result = moderate_image(str(p))
    assert result.verdict == Verdict.REJECT


def test_gps_off_course_goes_to_review(tmp_path, monkeypatch):
    monkeypatch.setenv("MODERATION_MODE", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    p = tmp_path / "ok.jpg"
    _write_jpeg(str(p))

    class FakeResp:
        def raise_for_status(self):
            pass

        def json(self):
            return {"results": [{"flagged": False, "categories": {}, "category_scores": {}}]}

    monkeypatch.setattr(
        "utils.moderation.httpx.post",
        lambda *a, **k: FakeResp(),
    )

    # New York City — clearly off the Humboldt course
    result = moderate_image(str(p), latitude=40.71, longitude=-74.01)
    assert result.verdict == Verdict.REVIEW
    assert "GPS" in result.reason
