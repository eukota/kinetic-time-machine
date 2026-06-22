from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from database import init_db
from limiter import limiter
from routes import submissions, teams, admin, trackers
from config import PHOTOS_DIR
import os

app = FastAPI(title="Kinetic Time Machine API")

# Rate limiting (slowapi) — shared limiter, registered for the route decorators to find
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

app.include_router(submissions.router)
app.include_router(teams.router)
app.include_router(admin.router)
app.include_router(trackers.router)

if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/photos/{submission_id}/{filename}")
def serve_photo(submission_id: str, filename: str):
    path = os.path.join(PHOTOS_DIR, submission_id, filename)
    if not os.path.exists(path):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Photo not found")
    headers = {}
    if "_thumb" in filename or "_display" in filename or "_medium" in filename:
        headers["Cache-Control"] = "public, max-age=31536000, immutable"
    return FileResponse(path, headers=headers)

@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/config")
def public_config():
    """Public runtime config — frontend fetches this to know what features are enabled."""
    return {
        "hcaptcha_sitekey": os.getenv("HCAPTCHA_SITEKEY", "") or None,
        "auto_moderation": os.getenv("MODERATION_MODE", "").strip().lower()
        not in ("", "manual"),
    }
