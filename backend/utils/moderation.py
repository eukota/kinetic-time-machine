"""Automated image moderation for upload-time approve / review / reject decisions."""
from __future__ import annotations

import base64
import io
import logging
import os
from dataclasses import dataclass
from enum import Enum

import httpx
from PIL import Image

from utils.images import open_oriented

logger = logging.getLogger(__name__)

# Rough bounding box for the KGC course (Humboldt County) — soft signal only
COURSE_LAT_MIN, COURSE_LAT_MAX = 40.45, 41.05
COURSE_LON_MIN, COURSE_LON_MAX = -124.55, -123.75

MIN_IMAGE_PX = 200
MODERATION_JPEG_MAX_PX = 1024

# OpenAI category scores at or above this → reject outright
_REJECT_CATEGORIES = frozenset({"sexual", "sexual/minors"})
# Flagged categories that aren't hard-reject → human review
_REVIEW_CATEGORIES = frozenset({
    "violence", "violence/graphic", "harassment", "harassment/threatening",
    "hate", "hate/threatening", "self-harm", "self-harm/intent",
    "self-harm/instructions", "illicit", "illicit/violent",
})


class Verdict(str, Enum):
    APPROVE = "approve"
    REVIEW = "review"
    REJECT = "reject"


@dataclass(frozen=True)
class ModerationResult:
    verdict: Verdict
    reason: str
    provider: str = "none"


def _mode() -> str:
    explicit = os.getenv("MODERATION_MODE", "").strip().lower()
    if explicit:
        return explicit
    if os.getenv("OPENAI_API_KEY", "").strip():
        return "openai"
    return "manual"


def _basic_checks(path: str) -> ModerationResult | None:
    """Return REJECT if the file fails basic validation; None if OK."""
    try:
        with Image.open(path) as img:
            img.verify()
        with Image.open(path) as img:
            w, h = img.size
            if w < MIN_IMAGE_PX or h < MIN_IMAGE_PX:
                return ModerationResult(
                    Verdict.REJECT,
                    f"Image too small ({w}×{h}px, minimum {MIN_IMAGE_PX}px)",
                    "basic",
                )
    except Exception as e:
        return ModerationResult(Verdict.REJECT, f"Unreadable image: {e}", "basic")
    return None


def _jpeg_bytes_for_api(path: str) -> bytes:
    img = open_oriented(path).convert("RGB")
    w, h = img.size
    if max(w, h) > MODERATION_JPEG_MAX_PX:
        img.thumbnail((MODERATION_JPEG_MAX_PX, MODERATION_JPEG_MAX_PX), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85, optimize=True)
    return buf.getvalue()


def _openai_moderate(path: str) -> ModerationResult:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        return ModerationResult(Verdict.REVIEW, "OpenAI API key not configured", "openai")

    jpeg = _jpeg_bytes_for_api(path)
    b64 = base64.standard_b64encode(jpeg).decode("ascii")

    try:
        r = httpx.post(
            "https://api.openai.com/v1/moderations",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": "omni-moderation-latest",
                "input": [{"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}}],
            },
            timeout=30.0,
        )
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        logger.warning("OpenAI moderation failed: %s", e)
        return ModerationResult(Verdict.REVIEW, f"Moderation service unavailable: {e}", "openai")

    results = data.get("results") or []
    if not results:
        return ModerationResult(Verdict.REVIEW, "Empty moderation response", "openai")

    result = results[0]
    categories = result.get("categories") or {}
    scores = result.get("category_scores") or {}

    for cat in _REJECT_CATEGORIES:
        if categories.get(cat):
            score = scores.get(cat, 0)
            return ModerationResult(
                Verdict.REJECT,
                f"Flagged: {cat} (score {score:.2f})",
                "openai",
            )

    flagged_review = [c for c in _REVIEW_CATEGORIES if categories.get(c)]
    if result.get("flagged") or flagged_review:
        label = ", ".join(flagged_review) if flagged_review else "policy"
        return ModerationResult(Verdict.REVIEW, f"Flagged for review: {label}", "openai")

    return ModerationResult(Verdict.APPROVE, "Passed automated safety check", "openai")


def _permissive_moderate(path: str) -> ModerationResult:
    """Dev-only: auto-approve anything passing basic image validation."""
    fail = _basic_checks(path)
    if fail:
        return fail
    return ModerationResult(Verdict.APPROVE, "Auto-approved (permissive mode)", "permissive")


def moderate_image(path: str, *, latitude: float | None = None, longitude: float | None = None) -> ModerationResult:
    """
    Decide whether an uploaded photo should go live immediately, wait for human review,
    or be rejected.

    MODERATION_MODE env:
      manual     — always queue for human review (default without OPENAI_API_KEY)
      openai     — OpenAI omni-moderation (default when OPENAI_API_KEY is set)
      permissive — basic checks only, auto-approve (local dev)
    """
    fail = _basic_checks(path)
    if fail:
        return fail

    mode = _mode()

    if mode == "manual":
        return ModerationResult(Verdict.REVIEW, "Awaiting manual review", "manual")

    if mode == "permissive":
        return _permissive_moderate(path)

    if mode == "openai":
        result = _openai_moderate(path)
        # Soft GPS hint: off-course photos that passed NSFW check still go to review
        if result.verdict == Verdict.APPROVE and latitude is not None and longitude is not None:
            on_course = (
                COURSE_LAT_MIN <= latitude <= COURSE_LAT_MAX
                and COURSE_LON_MIN <= longitude <= COURSE_LON_MAX
            )
            if not on_course:
                return ModerationResult(
                    Verdict.REVIEW,
                    f"GPS ({latitude:.4f}, {longitude:.4f}) outside course area",
                    "openai+gps",
                )
        return result

    logger.warning("Unknown MODERATION_MODE=%r, falling back to manual review", mode)
    return ModerationResult(Verdict.REVIEW, f"Unknown moderation mode: {mode}", "manual")
