from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
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

    # Validate team_id consistency (defensive check)
    if tracker.team_id != req.team_id:
        raise HTTPException(status_code=400, detail="Team ID mismatch")

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

    # If token is provided, validate it and log token usage
    if req.token:
        team = db.query(Team).filter(Team.id == req.team_id).first()
        if team and team.current_token == req.token:
            # Log token usage
            team.last_token_used_at = datetime.utcnow()
            team.last_location_lat = req.latitude
            team.last_location_lon = req.longitude
        elif team:
            # Token provided but doesn't match
            raise HTTPException(status_code=401, detail="Invalid token")

    db.commit()

    return {"status": "success", "message": "Location updated"}


@router.get("/current-locations")
def get_current_locations(db: Session = Depends(get_db)):
    """Get latest location for all approved trackers"""
    # Subquery to find latest location per tracker
    subq = (
        db.query(
            TrackerLocation.tracker_id,
            func.max(TrackerLocation.created_at).label("latest_time")
        )
        .group_by(TrackerLocation.tracker_id)
        .subquery()
    )

    # Get latest locations with team info in a single optimized query
    locations = (
        db.query(TrackerLocation, Team.name)
        .join(subq, and_(
            TrackerLocation.tracker_id == subq.c.tracker_id,
            TrackerLocation.created_at == subq.c.latest_time
        ))
        .join(Team, TrackerLocation.team_id == Team.id)
        .join(Tracker, TrackerLocation.tracker_id == Tracker.id)
        .filter(Tracker.status == "approved")
        .all()
    )

    result = []
    for location, team_name in locations:
        result.append({
            "team_id": location.team_id,
            "team_name": team_name,
            "latitude": location.latitude,
            "longitude": location.longitude,
            "accuracy": location.accuracy,
            "timestamp": location.timestamp,
            "status": "tracking"
        })

    return result
