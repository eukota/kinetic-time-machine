from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Team

router = APIRouter(prefix="/api/teams", tags=["teams"])

@router.get("/")
def list_teams(db: Session = Depends(get_db)):
    teams = db.query(Team).filter(Team.active == True).all()
    return [{"id": t.id, "name": t.name, "color": t.color} for t in teams]
