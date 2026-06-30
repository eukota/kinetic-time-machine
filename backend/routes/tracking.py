from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
from database import get_db
from models import TrackingRequest, Team
from schemas import TrackingRequestCreate
from auth import require_admin
import uuid

router = APIRouter(prefix="/api", tags=["tracking"])


@router.post("/tracking-request")
def submit_tracking_request(
    req: TrackingRequestCreate,
    db: Session = Depends(get_db)
):
    """Submit a GPS tracking request for a team"""
    # Create new tracking request
    request = TrackingRequest(
        id=str(uuid.uuid4()),
        team_name=req.team_name.strip(),
        email=req.email.strip(),
        code=req.code.strip(),
        status="pending"
    )
    db.add(request)
    db.commit()
    db.refresh(request)

    return {
        "id": request.id,
        "status": "pending",
        "message": "Request submitted. Waiting for admin approval.",
    }


def _serialize_tracking_request(tr):
    """Serialize tracking request for API response"""
    return {
        "id": tr.id,
        "team_name": tr.team_name,
        "email": tr.email,
        "code": tr.code,
        "status": tr.status,
        "created_at": tr.created_at,
        "updated_at": tr.updated_at,
    }


@router.get("/admin/tracking-requests", dependencies=[Depends(require_admin)])
def list_tracking_requests(db: Session = Depends(get_db)):
    """List all pending tracking requests (admin only)"""
    items = (
        db.query(TrackingRequest)
        .filter(TrackingRequest.status == "pending")
        .order_by(desc(TrackingRequest.created_at))
        .all()
    )
    return [_serialize_tracking_request(tr) for tr in items]


@router.post("/admin/tracking-request/{request_id}/approve", dependencies=[Depends(require_admin)])
def approve_tracking_request(request_id: str, db: Session = Depends(get_db)):
    """Approve a tracking request and generate token (admin only)"""
    tracking_req = db.query(TrackingRequest).filter(TrackingRequest.id == request_id).first()
    if not tracking_req:
        raise HTTPException(status_code=404, detail="Tracking request not found")

    # Find or create team with the team_name from the request
    team = db.query(Team).filter(Team.code == tracking_req.code).first()

    # If team doesn't exist, create one
    if not team:
        team = Team(
            id=str(uuid.uuid4()),
            name=tracking_req.team_name,
            color="#000000",  # Default color
            code=tracking_req.code,
            active=True
        )
        db.add(team)
        db.commit()

    # Generate new token (32-char hex string from UUID)
    token = uuid.uuid4().hex
    team.current_token = token
    team.token_generated_at = datetime.utcnow()

    # Update tracking request status
    tracking_req.status = "approved"
    tracking_req.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(tracking_req)
    db.refresh(team)

    return {
        "id": tracking_req.id,
        "status": "approved",
        "team_id": team.id,
        "token": token,
        "message": "Request approved. Token generated.",
    }


@router.post("/admin/tracking-request/{request_id}/reject", dependencies=[Depends(require_admin)])
def reject_tracking_request(request_id: str, db: Session = Depends(get_db)):
    """Reject a tracking request (admin only)"""
    tracking_req = db.query(TrackingRequest).filter(TrackingRequest.id == request_id).first()
    if not tracking_req:
        raise HTTPException(status_code=404, detail="Tracking request not found")

    tracking_req.status = "rejected"
    tracking_req.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(tracking_req)

    return {
        "id": tracking_req.id,
        "status": "rejected",
        "message": "Request rejected.",
    }


@router.post("/admin/teams/{team_id}/token/reset", dependencies=[Depends(require_admin)])
def reset_team_token(team_id: str, db: Session = Depends(get_db)):
    """Generate a new token for a team (admin only)"""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Generate new token
    token = uuid.uuid4().hex
    team.current_token = token
    team.token_generated_at = datetime.utcnow()
    db.commit()
    db.refresh(team)

    return {
        "team_id": team.id,
        "token": token,
        "token_generated_at": team.token_generated_at,
        "message": "New token generated.",
    }


@router.post("/admin/teams/{team_id}/token/disable", dependencies=[Depends(require_admin)])
def disable_team_token(team_id: str, db: Session = Depends(get_db)):
    """Disable token for a team (admin only)"""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    team.current_token = None
    db.commit()
    db.refresh(team)

    return {
        "team_id": team.id,
        "token": None,
        "message": "Token disabled.",
    }


@router.get("/admin/teams/{team_id}/token", dependencies=[Depends(require_admin)])
def get_team_token_info(team_id: str, db: Session = Depends(get_db)):
    """Get token info for a team with last used data (admin only)"""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    return {
        "team_id": team.id,
        "team_name": team.name,
        "current_token": team.current_token,
        "token_generated_at": team.token_generated_at,
        "last_token_used_at": team.last_token_used_at,
        "last_location_lat": team.last_location_lat,
        "last_location_lon": team.last_location_lon,
    }
