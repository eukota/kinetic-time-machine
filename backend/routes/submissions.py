from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from database import get_db
from models import Submission, Photo, Team
from utils.exif import extract_exif
from config import PHOTOS_DIR
import os, uuid, shutil

router = APIRouter(prefix="/api/submissions", tags=["submissions"])

@router.post("/")
async def create_submission(
    image: UploadFile = File(...),
    note: str = Form(None),
    team_name: str = Form(None),
    db: Session = Depends(get_db),
):
    suffix = os.path.splitext(image.filename or "photo.jpg")[1] or ".jpg"
    temp_path = f"/tmp/{uuid.uuid4()}{suffix}"
    with open(temp_path, "wb") as f:
        shutil.copyfileobj(image.file, f)

    exif_data = extract_exif(temp_path)

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
    os.rename(temp_path, dest_path)

    rel_path = f"{submission.id}/{photo_id}{suffix}"
    photo = Photo(submission_id=submission.id, file_path=rel_path)
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
            {"id": p.id, "file_path": p.file_path, "uploaded_at": p.uploaded_at}
            for p in sub.photos
        ],
    }
