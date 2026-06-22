import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from fastapi.testclient import TestClient
from app import app
from models import Team, Tracker, TrackerLocation, Submission, Photo
from tests.conftest import TestingSessionLocal
from datetime import datetime

client = TestClient(app)

@pytest.fixture
def sample_team(db):
    """Create a sample team"""
    team = Team(name="Test Team", color="#FF5733")
    db.add(team)
    db.commit()
    db.refresh(team)
    return team

@pytest.fixture
def approved_tracker(db, sample_team):
    """Create an approved tracker for a team"""
    tracker = Tracker(
        team_id=sample_team.id,
        code="TEST-001",
        status="approved"
    )
    db.add(tracker)
    db.commit()
    db.refresh(tracker)
    return tracker

@pytest.fixture
def location(db, approved_tracker, sample_team):
    """Create a tracker location"""
    loc = TrackerLocation(
        tracker_id=approved_tracker.id,
        team_id=sample_team.id,
        latitude=40.7128,
        longitude=-74.0060,
        accuracy=10.5,
        timestamp=datetime.utcnow()
    )
    db.add(loc)
    db.commit()
    db.refresh(loc)
    return loc

@pytest.fixture
def submission(db, sample_team):
    """Create an approved submission"""
    sub = Submission(
        team_id=sample_team.id,
        approved=True,
        timestamp=None,
        note="Test submission"
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub

@pytest.fixture
def photo(db, submission):
    """Create a photo for a submission"""
    p = Photo(
        submission_id=submission.id,
        file_path="/photos/test.jpg",
        mime_type="image/jpeg"
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p

@pytest.fixture
def unapproved_submission(db, sample_team):
    """Create an unapproved submission"""
    sub = Submission(
        team_id=sample_team.id,
        approved=False,
        timestamp=None,
        note="Unapproved"
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub

def test_get_team_detail_success(sample_team):
    """Test getting team detail for team with no trackers or photos"""
    response = client.get(f"/api/teams/{sample_team.id}/detail")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == sample_team.id
    assert data["name"] == sample_team.name
    assert data["color"] == sample_team.color
    assert data["current_location"] is None
    assert data["photos"] == []

def test_get_team_not_found():
    """Test getting detail for non-existent team"""
    response = client.get("/api/teams/nonexistent-id/detail")
    assert response.status_code == 404

def test_get_team_detail_with_location(sample_team, approved_tracker, location):
    """Test getting team detail with current tracker location"""
    response = client.get(f"/api/teams/{sample_team.id}/detail")
    assert response.status_code == 200
    data = response.json()
    assert data["current_location"] is not None
    assert data["current_location"]["latitude"] == location.latitude
    assert data["current_location"]["longitude"] == location.longitude
    assert data["current_location"]["accuracy"] == location.accuracy

def test_get_team_detail_with_photos(sample_team, submission, photo):
    """Test getting team detail with approved submissions and photos"""
    response = client.get(f"/api/teams/{sample_team.id}/detail")
    assert response.status_code == 200
    data = response.json()
    assert len(data["photos"]) == 1
    assert data["photos"][0]["id"] == photo.id
    assert data["photos"][0]["url"] == f"/api/photos/{photo.id}"

def test_get_team_detail_filters_unapproved_submissions(sample_team, unapproved_submission):
    """Test that unapproved submissions are not included in photos"""
    response = client.get(f"/api/teams/{sample_team.id}/detail")
    assert response.status_code == 200
    data = response.json()
    assert data["photos"] == []

def test_get_team_detail_multiple_photos(db, sample_team, submission):
    """Test getting team detail with multiple photos in one submission"""
    # Add multiple photos to the same submission
    p1 = Photo(submission_id=submission.id, file_path="/photos/test1.jpg", mime_type="image/jpeg")
    p2 = Photo(submission_id=submission.id, file_path="/photos/test2.jpg", mime_type="image/jpeg")
    db.add(p1)
    db.add(p2)
    db.commit()
    db.refresh(p1)
    db.refresh(p2)

    response = client.get(f"/api/teams/{sample_team.id}/detail")
    assert response.status_code == 200
    data = response.json()
    assert len(data["photos"]) == 2
    photo_ids = [p["id"] for p in data["photos"]]
    assert p1.id in photo_ids
    assert p2.id in photo_ids

def test_get_team_detail_multiple_submissions(db, sample_team):
    """Test getting team detail with multiple submissions"""
    sub1 = Submission(team_id=sample_team.id, approved=True, note="Sub 1")
    sub2 = Submission(team_id=sample_team.id, approved=True, note="Sub 2")
    db.add(sub1)
    db.add(sub2)
    db.commit()
    db.refresh(sub1)
    db.refresh(sub2)

    p1 = Photo(submission_id=sub1.id, file_path="/photos/test1.jpg", mime_type="image/jpeg")
    p2 = Photo(submission_id=sub2.id, file_path="/photos/test2.jpg", mime_type="image/jpeg")
    db.add(p1)
    db.add(p2)
    db.commit()
    db.refresh(p1)
    db.refresh(p2)

    response = client.get(f"/api/teams/{sample_team.id}/detail")
    assert response.status_code == 200
    data = response.json()
    assert len(data["photos"]) == 2
