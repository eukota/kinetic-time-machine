import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from fastapi.testclient import TestClient
from app import app
from models import Team, Tracker, TrackerLocation
from datetime import datetime, timedelta
from tests.conftest import TestingSessionLocal

client = TestClient(app)


@pytest.fixture(autouse=True)
def clear_tracker_data():
    """Clear tracker and location data before and after each test"""
    db = TestingSessionLocal()
    # Delete all data in reverse order of dependencies
    db.query(TrackerLocation).delete()
    db.query(Tracker).delete()
    db.commit()
    db.close()
    yield
    # Clean up after test
    db = TestingSessionLocal()
    db.query(TrackerLocation).delete()
    db.query(Tracker).delete()
    db.commit()
    db.close()


def test_register_tracker_with_valid_code():
    """Test registering a tracker with a valid team code"""
    db = TestingSessionLocal()
    team = Team(name="Test Team", color="#FF0000", code="TEAM-001")
    db.add(team)
    db.commit()
    team_id = team.id
    db.close()

    r = client.post("/api/trackers/register", json={"code": "TEAM-001", "email": "test@example.com"})
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "pending"
    assert "tracker_id" in data
    assert data["message"] == "Registration submitted. Waiting for admin approval."


def test_register_tracker_with_invalid_code():
    """Test registering a tracker with an invalid team code"""
    r = client.post("/api/trackers/register", json={"code": "INVALID-CODE", "email": "test@example.com"})
    assert r.status_code == 404
    assert r.json()["detail"] == "Team code not found"


def test_register_tracker_duplicate():
    """Test registering a tracker twice for the same team"""
    db = TestingSessionLocal()
    team = Team(name="Test Team", color="#FF0000", code="TEAM-002")
    db.add(team)
    db.commit()
    team_id = team.id
    db.close()

    # First registration succeeds
    r1 = client.post("/api/trackers/register", json={"code": "TEAM-002", "email": "test@example.com"})
    assert r1.status_code == 200

    # Second registration fails
    r2 = client.post("/api/trackers/register", json={"code": "TEAM-002", "email": "test2@example.com"})
    assert r2.status_code == 400
    assert r2.json()["detail"] == "Tracker already registered for this team"


def test_update_location_approved_tracker():
    """Test updating location for an approved tracker"""
    db = TestingSessionLocal()
    team = Team(name="Test Team", color="#FF0000", code="TEAM-003")
    db.add(team)
    db.commit()
    team_id = team.id

    tracker = Tracker(team_id=team_id, code="TEAM-003", status="approved")
    db.add(tracker)
    db.commit()
    db.close()

    now = datetime.utcnow()
    r = client.post("/api/trackers/update-location", json={
        "team_id": team_id,
        "latitude": 38.3566,
        "longitude": -122.6753,
        "accuracy": 5.0,
        "timestamp": now.isoformat()
    })
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "success"
    assert data["message"] == "Location updated"


def test_update_location_unapproved_tracker():
    """Test updating location for an unapproved tracker fails"""
    db = TestingSessionLocal()
    team = Team(name="Test Team", color="#FF0000", code="TEAM-004")
    db.add(team)
    db.commit()
    team_id = team.id

    tracker = Tracker(team_id=team_id, code="TEAM-004", status="pending")
    db.add(tracker)
    db.commit()
    db.close()

    now = datetime.utcnow()
    r = client.post("/api/trackers/update-location", json={
        "team_id": team_id,
        "latitude": 38.3566,
        "longitude": -122.6753,
        "accuracy": 5.0,
        "timestamp": now.isoformat()
    })
    assert r.status_code == 403
    assert r.json()["detail"] == "Tracker not found or not approved"


def test_update_location_nonexistent_team():
    """Test updating location for a nonexistent team"""
    now = datetime.utcnow()
    r = client.post("/api/trackers/update-location", json={
        "team_id": "nonexistent-id",
        "latitude": 38.3566,
        "longitude": -122.6753,
        "accuracy": 5.0,
        "timestamp": now.isoformat()
    })
    assert r.status_code == 403
    assert r.json()["detail"] == "Tracker not found or not approved"


def test_get_current_locations_empty():
    """Test getting current locations when no approved trackers exist"""
    r = client.get("/api/trackers/current-locations")
    assert r.status_code == 200
    assert r.json() == []


def test_get_current_locations_with_approved_trackers():
    """Test getting current locations for approved trackers"""
    db = TestingSessionLocal()

    # Create two teams with approved trackers
    team1 = Team(name="Team A", color="#FF0000", code="TEAM-A")
    team2 = Team(name="Team B", color="#00FF00", code="TEAM-B")
    db.add(team1)
    db.add(team2)
    db.commit()

    team1_id = team1.id
    team2_id = team2.id

    tracker1 = Tracker(team_id=team1_id, code="TEAM-A", status="approved")
    tracker2 = Tracker(team_id=team2_id, code="TEAM-B", status="approved")
    db.add(tracker1)
    db.add(tracker2)
    db.commit()

    # Add locations for both trackers
    now = datetime.utcnow()
    loc1 = TrackerLocation(
        tracker_id=tracker1.id,
        team_id=team1_id,
        latitude=38.3566,
        longitude=-122.6753,
        accuracy=5.0,
        timestamp=now
    )
    loc2 = TrackerLocation(
        tracker_id=tracker2.id,
        team_id=team2_id,
        latitude=39.0,
        longitude=-121.0,
        accuracy=10.0,
        timestamp=now
    )
    db.add(loc1)
    db.add(loc2)
    db.commit()
    db.close()

    r = client.get("/api/trackers/current-locations")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 2

    # Check that locations are returned
    locs = {item["team_id"]: item for item in data}
    assert team1_id in locs
    assert team2_id in locs
    assert locs[team1_id]["team_name"] == "Team A"
    assert locs[team1_id]["latitude"] == 38.3566
    assert locs[team2_id]["team_name"] == "Team B"
    assert locs[team2_id]["latitude"] == 39.0


def test_get_current_locations_ignores_pending_trackers():
    """Test that pending trackers are excluded from current locations"""
    db = TestingSessionLocal()

    team = Team(name="Team C", color="#0000FF", code="TEAM-C")
    db.add(team)
    db.commit()

    # Create a pending tracker (should not be included)
    tracker_pending = Tracker(team_id=team.id, code="TEAM-C", status="pending")
    db.add(tracker_pending)
    db.commit()

    now = datetime.utcnow()
    loc = TrackerLocation(
        tracker_id=tracker_pending.id,
        team_id=team.id,
        latitude=38.0,
        longitude=-122.0,
        accuracy=5.0,
        timestamp=now
    )
    db.add(loc)
    db.commit()
    db.close()

    r = client.get("/api/trackers/current-locations")
    assert r.status_code == 200
    assert r.json() == []


def test_get_current_locations_latest_only():
    """Test that only the latest location is returned for each tracker"""
    db = TestingSessionLocal()

    team = Team(name="Team D", color="#FFFF00", code="TEAM-D")
    db.add(team)
    db.commit()

    tracker = Tracker(team_id=team.id, code="TEAM-D", status="approved")
    db.add(tracker)
    db.commit()

    # Add multiple locations
    now = datetime.utcnow()
    loc1 = TrackerLocation(
        tracker_id=tracker.id,
        team_id=team.id,
        latitude=38.0,
        longitude=-122.0,
        accuracy=5.0,
        timestamp=now - timedelta(minutes=10)
    )
    loc2 = TrackerLocation(
        tracker_id=tracker.id,
        team_id=team.id,
        latitude=38.5,
        longitude=-122.5,
        accuracy=3.0,
        timestamp=now
    )
    db.add(loc1)
    db.add(loc2)
    db.commit()
    db.close()

    r = client.get("/api/trackers/current-locations")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    # Should return the latest location
    assert data[0]["latitude"] == 38.5
    assert data[0]["longitude"] == -122.5
    assert data[0]["accuracy"] == 3.0
