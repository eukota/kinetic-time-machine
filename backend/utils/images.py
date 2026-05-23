import os
from PIL import Image

VARIANTS = [
    ("thumb", 400),
    ("medium", 900),
]


def generate_variants(src_path: str, dest_dir: str, photo_id: str) -> None:
    """Generate thumb (400px) and medium (900px) JPEG variants from src_path."""
    img = Image.open(src_path).convert("RGB")
    for name, max_width in VARIANTS:
        if img.width > max_width:
            ratio = max_width / img.width
            new_size = (max_width, int(img.height * ratio))
            resized = img.resize(new_size, Image.LANCZOS)
        else:
            resized = img
        out_path = os.path.join(dest_dir, f"{photo_id}_{name}.jpg")
        resized.save(out_path, "JPEG", quality=82, optimize=True)


def variant_path(file_path: str, variant: str) -> str:
    """Return the variant file path for a given original file_path and variant name."""
    base = file_path.rsplit(".", 1)[0]
    return f"{base}_{variant}.jpg"
