from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from config import DATABASE_URL

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
    _migrate()

def _migrate():
    with engine.connect() as conn:
        cols = [r[1] for r in conn.exec_driver_sql("PRAGMA table_info(photos)")]
        if "mime_type" not in cols:
            conn.exec_driver_sql("ALTER TABLE photos ADD COLUMN mime_type TEXT")
            conn.commit()
        # Backfill mime_type from file extension for existing rows
        _EXT_MAP = {".heic": "image/heic", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}
        rows = conn.exec_driver_sql("SELECT id, file_path FROM photos WHERE mime_type IS NULL").fetchall()
        for photo_id, file_path in rows:
            if file_path:
                ext = file_path[file_path.rfind("."):].lower()
                mime = _EXT_MAP.get(ext)
                if mime:
                    conn.exec_driver_sql("UPDATE photos SET mime_type=? WHERE id=?", (mime, photo_id))
        conn.commit()

        # Migration: add `approved` column to submissions
        sub_cols = [r[1] for r in conn.exec_driver_sql("PRAGMA table_info(submissions)")]
        if "approved" not in sub_cols:
            # New column defaults to 0 (False); we'll auto-approve all existing rows
            # so the queue isn't suddenly flooded with old submissions
            conn.exec_driver_sql("ALTER TABLE submissions ADD COLUMN approved INTEGER NOT NULL DEFAULT 0")
            conn.exec_driver_sql("UPDATE submissions SET approved=1")
            conn.commit()

        sub_cols = [r[1] for r in conn.exec_driver_sql("PRAGMA table_info(submissions)")]
        if "moderation_note" not in sub_cols:
            conn.exec_driver_sql("ALTER TABLE submissions ADD COLUMN moderation_note TEXT")
            conn.commit()

        sub_cols = [r[1] for r in conn.exec_driver_sql("PRAGMA table_info(submissions)")]
        if "attribution" not in sub_cols:
            conn.exec_driver_sql("ALTER TABLE submissions ADD COLUMN attribution TEXT")
            conn.commit()

        # Migration: add `code` column to teams for tracker registration
        team_cols = [r[1] for r in conn.exec_driver_sql("PRAGMA table_info(teams)")]
        if "code" not in team_cols:
            conn.exec_driver_sql("ALTER TABLE teams ADD COLUMN code TEXT UNIQUE")
            conn.commit()

        # Migration: add token management columns to teams
        team_cols = [r[1] for r in conn.exec_driver_sql("PRAGMA table_info(teams)")]
        if "current_token" not in team_cols:
            conn.exec_driver_sql("ALTER TABLE teams ADD COLUMN current_token TEXT")
            conn.commit()

        team_cols = [r[1] for r in conn.exec_driver_sql("PRAGMA table_info(teams)")]
        if "token_generated_at" not in team_cols:
            conn.exec_driver_sql("ALTER TABLE teams ADD COLUMN token_generated_at TEXT")
            conn.commit()

        team_cols = [r[1] for r in conn.exec_driver_sql("PRAGMA table_info(teams)")]
        if "last_token_used_at" not in team_cols:
            conn.exec_driver_sql("ALTER TABLE teams ADD COLUMN last_token_used_at TEXT")
            conn.commit()

        team_cols = [r[1] for r in conn.exec_driver_sql("PRAGMA table_info(teams)")]
        if "last_location_lat" not in team_cols:
            conn.exec_driver_sql("ALTER TABLE teams ADD COLUMN last_location_lat REAL")
            conn.commit()

        team_cols = [r[1] for r in conn.exec_driver_sql("PRAGMA table_info(teams)")]
        if "last_location_lon" not in team_cols:
            conn.exec_driver_sql("ALTER TABLE teams ADD COLUMN last_location_lon REAL")
            conn.commit()
