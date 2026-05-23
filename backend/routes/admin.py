from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from auth import require_admin
from config import PHOTOS_DIR
from database import get_db
from models import Submission
from utils.images import variant_path

import os, shutil


router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])


def _serialize(s):
    first = s.photos[0].file_path if s.photos else None
    return {
        "id": s.id,
        "latitude": s.latitude,
        "longitude": s.longitude,
        "timestamp": s.timestamp,
        "team_id": s.team_id,
        "note": s.note,
        "approved": s.approved,
        "photo_count": len(s.photos),
        "created_at": s.created_at,
        "first_photo": first,
        "first_photo_thumb": variant_path(first, "thumb") if first else None,
        "first_photo_mime": s.photos[0].mime_type if s.photos else None,
    }


@router.get("/submissions/pending")
def list_pending(db: Session = Depends(get_db)):
    items = (
        db.query(Submission)
        .filter(Submission.approved == False)
        .order_by(desc(Submission.created_at))
        .all()
    )
    return [_serialize(s) for s in items]


@router.get("/submissions/all")
def list_all(db: Session = Depends(get_db)):
    items = db.query(Submission).order_by(desc(Submission.created_at)).all()
    return [_serialize(s) for s in items]


@router.post("/submissions/{submission_id}/approve")
def approve(submission_id: str, db: Session = Depends(get_db)):
    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    sub.approved = True
    db.commit()
    return {"id": sub.id, "approved": True}


@router.delete("/submissions/{submission_id}", status_code=204)
def reject(submission_id: str, db: Session = Depends(get_db)):
    """Delete a submission (used for both rejecting pending and removing approved)."""
    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    photo_dir = os.path.join(PHOTOS_DIR, submission_id)
    if os.path.exists(photo_dir):
        shutil.rmtree(photo_dir)
    db.delete(sub)
    db.commit()
