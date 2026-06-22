from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime

from auth import require_admin
from config import PHOTOS_DIR, DATABASE_URL
from database import get_db
from models import Submission, Team, Photo, Tracker
from utils.images import variant_path_if_exists

import os, shutil


router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])


class SubmissionUpdate(BaseModel):
    team_id: str | None = None
    note: str | None = None
    attribution: str | None = None


class TrackerUpdate(BaseModel):
    status: str | None = None
    email: str | None = None


def _serialize(s):
    first = s.photos[0].file_path if s.photos else None
    return {
        "id": s.id,
        "latitude": s.latitude,
        "longitude": s.longitude,
        "timestamp": s.timestamp,
        "team_id": s.team_id,
        "note": s.note,
        "attribution": s.attribution,
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

    if body.attribution is not None:
        sub.attribution = body.attribution.strip() or None

    db.commit()
    db.refresh(sub)
    return _serialize(sub)


@router.get("/info")
def site_info(db: Session = Depends(get_db)):
    """Where am I? Helps tell prod from staging at a glance."""
    db_path = DATABASE_URL.replace("sqlite:///", "")
    db_size = None
    if os.path.exists(db_path):
        db_size = os.path.getsize(db_path)
    return {
        "env_name": os.getenv("ENV_NAME", "unknown"),
        "git_sha": os.getenv("GIT_SHA", "unknown"),
        "database_url": DATABASE_URL,
        "db_file_size_bytes": db_size,
        "photos_dir": PHOTOS_DIR,
        "team_count": db.query(Team).count(),
        "submission_count": db.query(Submission).count(),
        "photo_count": db.query(Photo).count(),
    }


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


# Tracker Admin Endpoints

def _serialize_tracker(t):
    """Serialize tracker for API response"""
    return {
        "id": t.id,
        "team_id": t.team_id,
        "code": t.code,
        "email": t.email,
        "status": t.status,
        "created_at": t.created_at,
        "approved_at": t.approved_at,
    }


@router.get("/trackers/pending")
def list_pending_trackers(db: Session = Depends(get_db)):
    """List all pending tracker registrations"""
    items = (
        db.query(Tracker)
        .filter(Tracker.status == "pending")
        .order_by(desc(Tracker.created_at))
        .all()
    )
    return [_serialize_tracker(t) for t in items]


@router.get("/trackers/all")
def list_all_trackers(db: Session = Depends(get_db)):
    """List all tracker registrations"""
    items = db.query(Tracker).order_by(desc(Tracker.created_at)).all()
    return [_serialize_tracker(t) for t in items]


@router.get("/trackers/{tracker_id}")
def get_tracker(tracker_id: str, db: Session = Depends(get_db)):
    """Get tracker details"""
    tracker = db.query(Tracker).filter(Tracker.id == tracker_id).first()
    if not tracker:
        raise HTTPException(status_code=404, detail="Tracker not found")
    return _serialize_tracker(tracker)


@router.post("/trackers/{tracker_id}/approve")
def approve_tracker(tracker_id: str, db: Session = Depends(get_db)):
    """Approve a pending tracker registration"""
    tracker = db.query(Tracker).filter(Tracker.id == tracker_id).first()
    if not tracker:
        raise HTTPException(status_code=404, detail="Tracker not found")

    tracker.status = "approved"
    tracker.approved_at = datetime.utcnow()
    db.commit()
    db.refresh(tracker)
    return _serialize_tracker(tracker)


@router.post("/trackers/{tracker_id}/reject")
def reject_tracker(tracker_id: str, db: Session = Depends(get_db)):
    """Reject a pending tracker registration"""
    tracker = db.query(Tracker).filter(Tracker.id == tracker_id).first()
    if not tracker:
        raise HTTPException(status_code=404, detail="Tracker not found")

    tracker.status = "rejected"
    db.commit()
    db.refresh(tracker)
    return _serialize_tracker(tracker)


@router.patch("/trackers/{tracker_id}")
def update_tracker(tracker_id: str, body: TrackerUpdate, db: Session = Depends(get_db)):
    """Update tracker details"""
    tracker = db.query(Tracker).filter(Tracker.id == tracker_id).first()
    if not tracker:
        raise HTTPException(status_code=404, detail="Tracker not found")

    if body.status is not None:
        tracker.status = body.status
        if body.status == "approved" and not tracker.approved_at:
            tracker.approved_at = datetime.utcnow()

    if body.email is not None:
        tracker.email = body.email.strip() or None

    db.commit()
    db.refresh(tracker)
    return _serialize_tracker(tracker)
