from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from database import get_db
from models import Tracker, TrackerLocation, Team
from schemas import (
    TrackerRegisterRequest,
    TrackerLocationUpdate,
    CurrentLocationResponse,
)
import uuid

router = APIRouter(prefix="/api/trackers", tags=["trackers"])


@router.post("/register")
def register_tracker(req: TrackerRegisterRequest, db: Session = Depends(get_db)):
    """Register a new tracker with a team code"""
    # Find team by code
    team = db.query(Team).filter(Team.code == req.code).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team code not found")

    # Check if tracker already exists for this team
    existing = db.query(Tracker).filter(Tracker.team_id == team.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Tracker already registered for this team")

    # Create new tracker record
    tracker = Tracker(
        id=str(uuid.uuid4()),
        team_id=team.id,
        code=req.code,
        email=req.email,
        status="pending"
    )
    db.add(tracker)
    db.commit()
    db.refresh(tracker)

    return {
        "status": "pending",
        "message": "Registration submitted. Waiting for admin approval.",
        "tracker_id": tracker.id
    }


@router.post("/update-location")
def update_location(req: TrackerLocationUpdate, db: Session = Depends(get_db)):
    """Submit current location for an approved tracker"""
    # Find tracker by team_id
    tracker = db.query(Tracker).filter(
        Tracker.team_id == req.team_id,
        Tracker.status == "approved"
    ).first()

    if not tracker:
        raise HTTPException(status_code=403, detail="Tracker not found or not approved")

    # Record the location
    location = TrackerLocation(
        id=str(uuid.uuid4()),
        tracker_id=tracker.id,
        team_id=req.team_id,
        latitude=req.latitude,
        longitude=req.longitude,
        accuracy=req.accuracy,
        timestamp=req.timestamp
    )
    db.add(location)
    db.commit()

    return {"status": "success", "message": "Location updated"}


@router.get("/current-locations")
def get_current_locations(db: Session = Depends(get_db)):
    """Get latest location for all approved trackers"""
    # Get all approved trackers with their latest location
    trackers = db.query(Tracker).filter(Tracker.status == "approved").all()

    result = []
    for tracker in trackers:
        # Get latest location
        latest = db.query(TrackerLocation).filter(
            TrackerLocation.tracker_id == tracker.id
        ).order_by(TrackerLocation.created_at.desc()).first()

        if latest:
            result.append({
                "team_id": tracker.team_id,
                "team_name": tracker.team.name,
                "latitude": latest.latitude,
                "longitude": latest.longitude,
                "accuracy": latest.accuracy,
                "timestamp": latest.timestamp,
                "status": "tracking"
            })

    return result
