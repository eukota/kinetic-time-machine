from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
from datetime import datetime

try:
    import pillow_heif
    pillow_heif.register_heif_opener()
except ImportError:
    pass

GPS_IFD_TAG = 0x8825       # GPS info IFD pointer
DATETIME_ORIGINAL = 0x9003  # DateTimeOriginal tag


def extract_exif(image_path: str) -> dict:
    result = {"latitude": None, "longitude": None, "timestamp": None}
    try:
        image = Image.open(image_path)
        exif = image.getexif()
        if not exif:
            return result

        # Prefer DateTimeOriginal (shutter time), fall back to DateTime
        dt_str = exif.get(DATETIME_ORIGINAL)
        if not dt_str:
            dt_str = next(
                (exif[k] for k, v in TAGS.items() if v == "DateTime" and k in exif),
                None,
            )
        if dt_str:
            try:
                result["timestamp"] = datetime.strptime(dt_str, "%Y:%m:%d %H:%M:%S")
            except (ValueError, TypeError):
                pass

        # GPS from the dedicated GPS IFD (works for JPEG and HEIC)
        gps_ifd = exif.get_ifd(GPS_IFD_TAG)
        if gps_ifd:
            gps = {GPSTAGS.get(k, k): v for k, v in gps_ifd.items()}
            lat = _to_degrees(gps.get("GPSLatitude"))
            lon = _to_degrees(gps.get("GPSLongitude"))
            if lat is not None and lon is not None:
                if gps.get("GPSLatitudeRef") == "S":
                    lat = -lat
                if gps.get("GPSLongitudeRef") == "W":
                    lon = -lon
                result["latitude"] = lat
                result["longitude"] = lon

    except Exception as e:
        print(f"EXIF extraction error: {e}")

    return result


def _to_degrees(value) -> float | None:
    if value is None:
        return None
    try:
        d, m, s = value
        return float(d) + float(m) / 60.0 + float(s) / 3600.0
    except Exception:
        return None
