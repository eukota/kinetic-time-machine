import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from PIL import Image

from utils.images import normalize_image, open_oriented


def test_open_oriented_applies_transpose(tmp_path, monkeypatch):
    src = tmp_path / "rotated.jpg"
    img = Image.new("RGB", (200, 100), color="red")
    img.save(src, format="JPEG")

    def fake_transpose(image):
        return image.transpose(Image.Transpose.ROTATE_90)

    monkeypatch.setattr("utils.images.ImageOps.exif_transpose", fake_transpose)

    out = open_oriented(str(src))
    assert out.size == (100, 200)


def test_normalize_image_rewrites_file(tmp_path):
    src = tmp_path / "photo.jpg"
    Image.new("RGB", (300, 200), color="blue").save(src)
    normalize_image(str(src))
    with Image.open(src) as img:
        assert img.size == (300, 200)
