from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from database import Base

class Team(Base):
    __tablename__ = "teams"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, index=True)
    color = Column(String)
    active = Column(Boolean, default=True)
    submissions = relationship("Submission", back_populates="team")

class Submission(Base):
    __tablename__ = "submissions"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    team_id = Column(String, ForeignKey("teams.id"), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    timestamp = Column(DateTime, nullable=True)
    note = Column(Text, nullable=True)
    attribution = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    approved = Column(Boolean, default=False, nullable=False, index=True)
    moderation_note = Column(Text, nullable=True)
    team = relationship("Team", back_populates="submissions")
    photos = relationship("Photo", back_populates="submission", cascade="all, delete-orphan")

class Tracker(Base):
    __tablename__ = "trackers"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    team_id = Column(String, ForeignKey("teams.id"), nullable=False, index=True)
    code = Column(String, unique=True, nullable=False, index=True)  # e.g., "KINETIC-001"
    email = Column(String, nullable=True)
    status = Column(String, default="pending", nullable=False, index=True)  # pending, approved, rejected
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    team = relationship("Team", foreign_keys=[team_id])
    locations = relationship("TrackerLocation", back_populates="tracker", cascade="all, delete-orphan")

class TrackerLocation(Base):
    __tablename__ = "tracker_locations"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tracker_id = Column(String, ForeignKey("trackers.id"), nullable=False, index=True)
    team_id = Column(String, ForeignKey("teams.id"), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    accuracy = Column(Float, nullable=True)  # in meters
    timestamp = Column(DateTime, nullable=False)  # when location was recorded
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    tracker = relationship("Tracker", back_populates="locations")
    team = relationship("Team", foreign_keys=[team_id])

class Photo(Base):
    __tablename__ = "photos"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    submission_id = Column(String, ForeignKey("submissions.id"), nullable=False)
    file_path = Column(String)
    mime_type = Column(String, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    submission = relationship("Submission", back_populates="photos")
