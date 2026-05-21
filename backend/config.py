import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./kgc_race.db")
PHOTOS_DIR = os.getenv("PHOTOS_DIR", os.path.join(os.path.dirname(__file__), "../data/photos"))

os.makedirs(PHOTOS_DIR, exist_ok=True)
