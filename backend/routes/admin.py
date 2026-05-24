from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from auth import require_admin
from config import PHOTOS_DIR
from database import get_db
from models import Submission, Team
from utils.images import variant_path_if_exists

import os, shutil


router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])


class SubmissionUpdate(BaseModel):
    team_id: str | None = None
    note: str | None = None


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
        "moderation_note": s.moderation_note,
        "photo_count": len(s.photos),
        "created_at": s.created_at,
        "first_photo": first,
        "first_photo_thumb": variant_path_if_exists(first, "thumb", PHOTOS_DIR),
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


@router.patch("/submissions/{submission_id}")
def update_submission(submission_id: str, body: SubmissionUpdate, db: Session = Depends(get_db)):
    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    if body.team_id is not None:
        if body.team_id == "":
            sub.team_id = None
        else:
            team = db.query(Team).filter(Team.id == body.team_id).first()
            if not team:
                raise HTTPException(status_code=400, detail="Team not found")
            sub.team_id = body.team_id

    if body.note is not None:
        sub.note = body.note.strip() or None

    db.commit()
    db.refresh(sub)
    return _serialize(sub)


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
