import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base
from models import Team, Submission, Photo

@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

def test_team_creation(db):
    team = Team(name="Test Team", color="#FF0000")
    db.add(team)
    db.commit()
    db.refresh(team)
    assert team.name == "Test Team"
    assert team.color == "#FF0000"
    assert team.active is True

def test_submission_links_to_team(db):
    team = Team(name="Speedsters", color="#00FF00")
    db.add(team)
    db.commit()
    sub = Submission(team_id=team.id, latitude=38.3566, longitude=-122.6753)
    db.add(sub)
    db.commit()
    db.refresh(sub)
    assert sub.latitude == 38.3566
    assert sub.team_id == team.id

def test_submission_without_gps(db):
    sub = Submission(note="No GPS on this one")
    db.add(sub)
    db.commit()
    db.refresh(sub)
    assert sub.latitude is None
    assert sub.longitude is None
    assert sub.note == "No GPS on this one"

def test_photo_links_to_submission(db):
    sub = Submission(latitude=38.35, longitude=-122.67)
    db.add(sub)
    db.commit()
    photo = Photo(submission_id=sub.id, file_path=f"{sub.id}/photo1.jpg")
    db.add(photo)
    db.commit()
    db.refresh(photo)
    assert photo.submission_id == sub.id
    assert photo.file_path == f"{sub.id}/photo1.jpg"
