from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime
import secrets
from database import get_db
from limiter import limiter
from models import Tracker, TrackerLocation, Team
from schemas import TrackerLocationUpdate
import uuid

router = APIRouter(prefix="/api/trackers", tags=["trackers"])


@router.post("/update-location")
@limiter.limit("30/minute")
def update_location(request: Request, req: TrackerLocationUpdate, db: Session = Depends(get_db)):
    """Submit current location for a team. The team's token is the credential:
    it must be present and match teams.current_token (constant-time)."""
    # Validate the token up front — nothing is written on a failed auth.
    team = db.query(Team).filter(Team.id == req.team_id).first()
    if (
        not team
        or not team.current_token
        or not secrets.compare_digest(req.token, team.current_token)
    ):
        raise HTTPException(status_code=401, detail="Invalid or missing token")

    # Resolve (or lazily create) a tracker row purely for historical FK
    # continuity — it is no longer the credential.
    tracker = db.query(Tracker).filter(Tracker.team_id == req.team_id).first()
    if not tracker:
        tracker = Tracker(
            id=str(uuid.uuid4()),
            team_id=req.team_id,
            code=req.team_id,  # team ID is unique; used as the tracker code
            status="approved",
            approved_at=datetime.utcnow(),
        )
        db.add(tracker)
        db.flush()

    # Record the location.
    location = TrackerLocation(
        id=str(uuid.uuid4()),
        tracker_id=tracker.id,
        team_id=req.team_id,
        latitude=req.latitude,
        longitude=req.longitude,
        accuracy=req.accuracy,
        timestamp=req.timestamp,
    )
    db.add(location)

    # Log token usage / last-known position.
    team.last_token_used_at = datetime.utcnow()
    team.last_location_lat = req.latitude
    team.last_location_lon = req.longitude

    db.commit()

    return {"status": "success", "message": "Location updated"}


@router.get("/current-locations")
def get_current_locations(db: Session = Depends(get_db)):
    """Get latest location for every team that currently holds a token."""
    # Subquery to find latest location per tracker
    subq = (
        db.query(
            TrackerLocation.tracker_id,
            func.max(TrackerLocation.created_at).label("latest_time")
        )
        .group_by(TrackerLocation.tracker_id)
        .subquery()
    )

    # A team is trackable when it holds a token. Historical locations from a
    # team whose token was disabled (set to null) are excluded.
    locations = (
        db.query(TrackerLocation, Team.name)
        .join(subq, and_(
            TrackerLocation.tracker_id == subq.c.tracker_id,
            TrackerLocation.created_at == subq.c.latest_time
        ))
        .join(Team, TrackerLocation.team_id == Team.id)
        .filter(Team.current_token.isnot(None))
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
