from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
from datetime import datetime

def extract_exif(image_path: str) -> dict:
    result = {"latitude": None, "longitude": None, "timestamp": None}
    try:
        image = Image.open(image_path)
        raw_exif = image._getexif()
        if not raw_exif:
            return result
        exif = {TAGS.get(k, k): v for k, v in raw_exif.items()}
        if "DateTime" in exif:
            try:
                result["timestamp"] = datetime.strptime(exif["DateTime"], "%Y:%m:%d %H:%M:%S")
            except ValueError:
                pass
        if "GPSInfo" in exif:
            gps_raw = {GPSTAGS.get(k, k): v for k, v in exif["GPSInfo"].items()}
            lat = _to_degrees(gps_raw.get("GPSLatitude"))
            lon = _to_degrees(gps_raw.get("GPSLongitude"))
            if lat is not None and lon is not None:
                if gps_raw.get("GPSLatitudeRef") == "S":
                    lat = -lat
                if gps_raw.get("GPSLongitudeRef") == "W":
                    lon = -lon
                result["latitude"] = lat
                result["longitude"] = lon
    except Exception as e:
        print(f"EXIF extraction error: {e}")
    return result

def _to_degrees(value) -> float | None:
    if value is None or len(value) != 3:
        return None
    d, m, s = value
    return float(d) + float(m) / 60.0 + float(s) / 3600.0
