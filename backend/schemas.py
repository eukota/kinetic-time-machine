from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class TrackingRequestCreate(BaseModel):
    team_name: str = Field(..., min_length=1)
    email: str = Field(..., min_length=1)
    code: str = Field(..., min_length=1)


class TrackerLocationUpdate(BaseModel):
    team_id: str
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    accuracy: Optional[float] = None
    timestamp: datetime
    token: str = Field(..., min_length=1)


class TrackerLocationResponse(BaseModel):
    team_id: str
    latitude: float
    longitude: float
    accuracy: Optional[float]
    timestamp: datetime


class CurrentLocationResponse(BaseModel):
    team_id: str
    team_name: str
    latitude: float
    longitude: float
    accuracy: Optional[float]
    timestamp: datetime
    status: str  # "tracking"


class TeamDetailResponse(BaseModel):
    id: str
    name: str
    color: str
    current_location: Optional[CurrentLocationResponse]
    recent_photos: list  # Will be populated from photo submissions
