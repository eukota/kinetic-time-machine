import os
from PIL import Image, ImageOps

VARIANTS = [
    ("thumb", 400),
    ("medium", 900),
]


def open_oriented(path: str) -> Image.Image:
    """Open an image and apply EXIF orientation so pixel data matches how it was shot."""
    return ImageOps.exif_transpose(Image.open(path))


def normalize_image(path: str, *, quality: int = 88) -> None:
    """Rewrite an image file with EXIF orientation baked into the pixels."""
    img = open_oriented(path)
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
    ext = os.path.splitext(path)[1].lower()
    if ext in (".jpg", ".jpeg"):
        img.save(path, "JPEG", quality=quality, optimize=True)
    elif ext == ".png":
        img.save(path, "PNG", optimize=True)
    elif ext == ".webp":
        img.save(path, "WEBP", quality=quality)
    else:
        img.save(path, "JPEG", quality=quality, optimize=True)


def generate_variants(src_path: str, dest_dir: str, photo_id: str) -> None:
    """Generate thumb (400px) and medium (900px) JPEG variants from src_path."""
    img = open_oriented(src_path).convert("RGB")
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


def variant_path_if_exists(file_path: str | None, variant: str, photos_dir: str) -> str | None:
    """Return variant path only when the file is on disk."""
    if not file_path:
        return None
    rel = variant_path(file_path, variant)
    if os.path.exists(os.path.join(photos_dir, rel)):
        return rel
    return None
