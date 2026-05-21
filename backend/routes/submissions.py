from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc
from database import get_db
from limiter import limiter
from models import Submission, Photo, Team
from utils.exif import extract_exif
from config import PHOTOS_DIR
from PIL import Image
import os, uuid, shutil

HEIC_SUFFIXES = {".heic", ".heif"}
MAX_UPLOAD_BYTES = 15 * 1024 * 1024   # 15 MB cap per photo
CHUNK_SIZE = 64 * 1024


router = APIRouter(prefix="/api/submissions", tags=["submissions"])

@router.post("/")
@limiter.limit("5/hour;30/day")
async def create_submission(
    request: Request,
    image: UploadFile = File(...),
    note: str = Form(None),
    team_name: str = Form(None),
    db: Session = Depends(get_db),
):
    # Early reject if Content-Length header says it's too big (cheap upfront check)
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_UPLOAD_BYTES + 1_000_000:
        raise HTTPException(status_code=413, detail="File too large (max 15 MB)")

    suffix = os.path.splitext(image.filename or "photo.jpg")[1] or ".jpg"
    temp_path = f"/tmp/{uuid.uuid4()}{suffix}"

    # Stream to disk with hard size cap — protects against lying Content-Length
    size = 0
    with open(temp_path, "wb") as f:
        while chunk := await image.read(CHUNK_SIZE):
            size += len(chunk)
            if size > MAX_UPLOAD_BYTES:
                f.close()
                try: os.unlink(temp_path)
                except OSError: pass
                raise HTTPException(status_code=413, detail="File too large (max 15 MB)")
            f.write(chunk)

    exif_data = extract_exif(temp_path)

    # Convert HEIC/HEIF → JPEG for browser compatibility (EXIF already extracted above)
    original_mime = image.content_type
    if suffix.lower() in HEIC_SUFFIXES:
        jpeg_path = temp_path[: temp_path.rfind(".")] + ".jpg"
        Image.open(temp_path).convert("RGB").save(jpeg_path, "JPEG", quality=88)
        os.unlink(temp_path)
        temp_path = jpeg_path
        suffix = ".jpg"

    submission = Submission(
        latitude=exif_data["latitude"],
        longitude=exif_data["longitude"],
        timestamp=exif_data["timestamp"],
        note=note,
    )

    if team_name:
        team = db.query(Team).filter(Team.name == team_name).first()
        if team:
            submission.team_id = team.id

    db.add(submission)
    db.flush()

    photo_id = str(uuid.uuid4())
    dest_dir = os.path.join(PHOTOS_DIR, submission.id)
    os.makedirs(dest_dir, exist_ok=True)
    dest_path = os.path.join(dest_dir, f"{photo_id}{suffix}")
    shutil.move(temp_path, dest_path)

    rel_path = f"{submission.id}/{photo_id}{suffix}"
    photo = Photo(submission_id=submission.id, file_path=rel_path, mime_type=original_mime)
    db.add(photo)
    db.commit()
    db.refresh(submission)

    return {
        "id": submission.id,
        "latitude": submission.latitude,
        "longitude": submission.longitude,
        "timestamp": submission.timestamp,
        "team_id": submission.team_id,
        "note": submission.note,
        "photo_count": len(submission.photos),
    }

@router.get("/")
def list_submissions(team_id: str = None, db: Session = Depends(get_db)):
    query = db.query(Submission).order_by(desc(Submission.created_at))
    if team_id:
        query = query.filter(Submission.team_id == team_id)
    subs = query.all()
    return [
        {
            "id": s.id,
            "latitude": s.latitude,
            "longitude": s.longitude,
            "timestamp": s.timestamp,
            "team_id": s.team_id,
            "note": s.note,
            "photo_count": len(s.photos),
            "created_at": s.created_at,
            "first_photo": s.photos[0].file_path if s.photos else None,
            "first_photo_mime": s.photos[0].mime_type if s.photos else None,
        }
        for s in subs
    ]

@router.get("/{submission_id}")
def get_submission(submission_id: str, db: Session = Depends(get_db)):
    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    return {
        "id": sub.id,
        "latitude": sub.latitude,
        "longitude": sub.longitude,
        "timestamp": sub.timestamp,
        "team_id": sub.team_id,
        "note": sub.note,
        "photos": [
            {"id": p.id, "file_path": p.file_path, "mime_type": p.mime_type, "uploaded_at": p.uploaded_at}
            for p in sub.photos
        ],
    }

@router.delete("/{submission_id}", status_code=204)
def delete_submission(submission_id: str, db: Session = Depends(get_db)):
    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    photo_dir = os.path.join(PHOTOS_DIR, submission_id)
    if os.path.exists(photo_dir):
        shutil.rmtree(photo_dir)
    db.delete(sub)
    db.commit()
