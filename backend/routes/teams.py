from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Team, Tracker, TrackerLocation, Submission, Photo

router = APIRouter(prefix="/api/teams", tags=["teams"])

@router.get("/")
def list_teams(db: Session = Depends(get_db)):
    teams = db.query(Team).filter(Team.active == True).all()
    return [{"id": t.id, "name": t.name, "color": t.color} for t in teams]

@router.get("/{team_id}/detail")
def get_team_detail(team_id: str, db: Session = Depends(get_db)):
    """Get team info with current tracker location and recent photos"""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Get current location
    current_location = None
    tracker = db.query(Tracker).filter(
        Tracker.team_id == team_id,
        Tracker.status == "approved"
    ).first()

    if tracker:
        latest = db.query(TrackerLocation).filter(
            TrackerLocation.tracker_id == tracker.id
        ).order_by(TrackerLocation.created_at.desc()).first()

        if latest:
            current_location = {
                "latitude": latest.latitude,
                "longitude": latest.longitude,
                "accuracy": latest.accuracy,
                "timestamp": latest.timestamp
            }

    # Get recent photos (last 20)
    submissions = db.query(Submission).filter(
        Submission.team_id == team_id,
        Submission.approved == True
    ).order_by(Submission.created_at.desc()).limit(20).all()

    photos = []
    for submission in submissions:
        for photo in submission.photos:
            photos.append({
                "id": photo.id,
                "url": f"/api/photos/{photo.id}",
                "timestamp": submission.timestamp,
                "note": submission.note
            })

    return {
        "id": team.id,
        "name": team.name,
        "color": team.color,
        "current_location": current_location,
        "photos": photos
    }
