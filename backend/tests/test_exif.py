import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from PIL import Image
from utils.exif import extract_exif

@pytest.fixture
def plain_image(tmp_path):
    img = Image.new("RGB", (100, 100), color="red")
    path = str(tmp_path / "plain.jpg")
    img.save(path)
    return path

def test_no_exif_returns_nones(plain_image):
    result = extract_exif(plain_image)
    assert result["latitude"] is None
    assert result["longitude"] is None
    assert result["timestamp"] is None

def test_missing_file_returns_nones():
    result = extract_exif("/nonexistent/path.jpg")
    assert result["latitude"] is None
    assert result["longitude"] is None
    assert result["timestamp"] is None
