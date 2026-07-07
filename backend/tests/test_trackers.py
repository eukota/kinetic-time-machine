import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from fastapi.testclient import TestClient
from app import app
from models import Team, Tracker, TrackerLocation
from datetime import datetime, timedelta
from tests.conftest import TestingSessionLocal
import uuid

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


def _make_team(name, color, code, with_token=False):
    """Create a team (optionally with a tracker + unique token).

    Returns (team_id, token) where token is None when with_token is False.
    Tokens are unique per team so tests never collide on teams.current_token.
    """
    token = uuid.uuid4().hex if with_token else None
    db = TestingSessionLocal()
    team = Team(name=name, color=color, code=code, current_token=token)
    db.add(team)
    db.commit()
    team_id = team.id
    if with_token:
        db.add(Tracker(team_id=team_id, code=code, status="approved"))
        db.commit()
    db.close()
    return team_id, token


def _count_locations(team_id):
    db = TestingSessionLocal()
    n = db.query(TrackerLocation).filter(TrackerLocation.team_id == team_id).count()
    db.close()
    return n


def test_update_location_with_valid_token():
    """A location update with the team's token succeeds and is recorded."""
    team_id, token = _make_team("Test Team", "#FF0000", "TEAM-003", with_token=True)

    now = datetime.utcnow()
    r = client.post("/api/trackers/update-location", json={
        "team_id": team_id,
        "latitude": 38.3566,
        "longitude": -122.6753,
        "accuracy": 5.0,
        "timestamp": now.isoformat(),
        "token": token,
    })
    assert r.status_code == 200
    assert r.json()["status"] == "success"
    assert _count_locations(team_id) == 1


def test_update_location_without_token_is_rejected():
    """Regression: omitting the token must 401 and write nothing.

    This is the location-spoofing hole — anyone who knew a public team_id could
    post fake locations when the token was optional.
    """
    team_id, _ = _make_team("Test Team", "#FF0000", "TEAM-NOAUTH", with_token=True)

    now = datetime.utcnow()
    r = client.post("/api/trackers/update-location", json={
        "team_id": team_id,
        "latitude": 38.3566,
        "longitude": -122.6753,
        "accuracy": 5.0,
        "timestamp": now.isoformat(),
    })
    assert r.status_code == 422  # token is a required field
    assert _count_locations(team_id) == 0


def test_update_location_with_wrong_token_is_rejected():
    """A mismatched token must 401 and write nothing."""
    team_id, token = _make_team("Test Team", "#FF0000", "TEAM-WRONG", with_token=True)

    now = datetime.utcnow()
    r = client.post("/api/trackers/update-location", json={
        "team_id": team_id,
        "latitude": 38.3566,
        "longitude": -122.6753,
        "accuracy": 5.0,
        "timestamp": now.isoformat(),
        "token": "z" * 32,  # 'z' never appears in hex tokens, so guaranteed wrong
    })
    assert r.status_code == 401
    assert _count_locations(team_id) == 0


def test_update_location_team_without_token_is_rejected():
    """A team that holds no token cannot receive locations even if a token is sent."""
    team_id, _ = _make_team("No Token Team", "#FF0000", "TEAM-NT")  # no token

    now = datetime.utcnow()
    r = client.post("/api/trackers/update-location", json={
        "team_id": team_id,
        "latitude": 38.3566,
        "longitude": -122.6753,
        "accuracy": 5.0,
        "timestamp": now.isoformat(),
        "token": "a" * 32,
    })
    assert r.status_code == 401
    assert _count_locations(team_id) == 0


def test_update_location_nonexistent_team():
    """Test updating location for a nonexistent team"""
    now = datetime.utcnow()
    r = client.post("/api/trackers/update-location", json={
        "team_id": "nonexistent-id",
        "latitude": 38.3566,
        "longitude": -122.6753,
        "accuracy": 5.0,
        "timestamp": now.isoformat(),
        "token": "a" * 32,
    })
    assert r.status_code == 401


def test_get_current_locations_empty():
    """Test getting current locations when no tokened teams exist"""
    r = client.get("/api/trackers/current-locations")
    assert r.status_code == 200
    assert r.json() == []


def test_get_current_locations_with_tokened_teams():
    """Latest location is returned for every team that holds a token."""
    team1_id, _ = _make_team("Team A", "#FF0000", "TEAM-A", with_token=True)
    team2_id, _ = _make_team("Team B", "#00FF00", "TEAM-B", with_token=True)

    db = TestingSessionLocal()
    t1 = db.query(Tracker).filter(Tracker.team_id == team1_id).first()
    t2 = db.query(Tracker).filter(Tracker.team_id == team2_id).first()
    now = datetime.utcnow()
    db.add(TrackerLocation(tracker_id=t1.id, team_id=team1_id, latitude=38.3566,
                           longitude=-122.6753, accuracy=5.0, timestamp=now))
    db.add(TrackerLocation(tracker_id=t2.id, team_id=team2_id, latitude=39.0,
                           longitude=-121.0, accuracy=10.0, timestamp=now))
    db.commit()
    db.close()

    r = client.get("/api/trackers/current-locations")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 2
    locs = {item["team_id"]: item for item in data}
    assert locs[team1_id]["team_name"] == "Team A"
    assert locs[team1_id]["latitude"] == 38.3566
    assert locs[team2_id]["team_name"] == "Team B"
    assert locs[team2_id]["latitude"] == 39.0


def test_get_current_locations_ignores_teams_without_token():
    """A team whose token was never set (or was disabled) is excluded."""
    team_id, _ = _make_team("Team C", "#0000FF", "TEAM-C")  # no token

    db = TestingSessionLocal()
    tracker = Tracker(team_id=team_id, code="TEAM-C", status="approved")
    db.add(tracker)
    db.commit()
    db.add(TrackerLocation(tracker_id=tracker.id, team_id=team_id, latitude=38.0,
                           longitude=-122.0, accuracy=5.0, timestamp=datetime.utcnow()))
    db.commit()
    db.close()

    r = client.get("/api/trackers/current-locations")
    assert r.status_code == 200
    assert r.json() == []


def test_get_current_locations_latest_only():
    """Test that only the latest location is returned for each team"""
    team_id, _ = _make_team("Team D", "#FFFF00", "TEAM-D", with_token=True)

    db = TestingSessionLocal()
    tracker = db.query(Tracker).filter(Tracker.team_id == team_id).first()
    now = datetime.utcnow()
    db.add(TrackerLocation(tracker_id=tracker.id, team_id=team_id, latitude=38.0,
                           longitude=-122.0, accuracy=5.0, timestamp=now - timedelta(minutes=10)))
    db.add(TrackerLocation(tracker_id=tracker.id, team_id=team_id, latitude=38.5,
                           longitude=-122.5, accuracy=3.0, timestamp=now))
    db.commit()
    db.close()

    r = client.get("/api/trackers/current-locations")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert data[0]["latitude"] == 38.5
    assert data[0]["longitude"] == -122.5
    assert data[0]["accuracy"] == 3.0
