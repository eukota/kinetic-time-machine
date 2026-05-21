from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from database import init_db
from routes import submissions, teams
from config import PHOTOS_DIR
import os

app = FastAPI(title="KGC Race Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

app.include_router(submissions.router)
app.include_router(teams.router)

if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/photos/{submission_id}/{filename}")
def serve_photo(submission_id: str, filename: str):
    path = os.path.join(PHOTOS_DIR, submission_id, filename)
    if not os.path.exists(path):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Photo not found")
    return FileResponse(path)

@app.get("/health")
def health():
    return {"status": "ok"}
