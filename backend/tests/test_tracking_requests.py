import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from fastapi.testclient import TestClient
from app import app
from models import Team, TrackingRequest, TrackerLocation, Tracker
from datetime import datetime
from tests.conftest import TestingSessionLocal

client = TestClient(app)

@pytest.fixture(autouse=True)
def admin_token(monkeypatch):
    """Set admin token for testing"""
    import auth
    monkeypatch.setattr(auth, "ADMIN_TOKEN", "test-admin-token")

ADMIN_HEADERS = {"Authorization": "Bearer test-admin-token"}


@pytest.fixture(autouse=True)
def clear_tracking_data():
    """Clear tracking request and team data before and after each test"""
    db = TestingSessionLocal()
    db.query(TrackerLocation).delete()
    db.query(Tracker).delete()
    db.query(TrackingRequest).delete()
    db.query(Team).delete()
    db.commit()
    db.close()
    yield
    # Clean up after test
    db = TestingSessionLocal()
    db.query(TrackerLocation).delete()
    db.query(Tracker).delete()
    db.query(TrackingRequest).delete()
    db.query(Team).delete()
    db.commit()
    db.close()


class TestTrackingRequestSubmission:
    """Tests for POST /api/tracking-request"""

    def test_submit_tracking_request_success(self):
        """Test successful tracking request submission"""
        r = client.post(
            "/api/tracking-request",
            json={
                "team_name": "Test Team",
                "email": "team@example.com",
                "code": "TEAM-001"
            }
        )
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "pending"
        assert "id" in data
        assert data["message"] == "Request submitted. Waiting for admin approval."

    def test_submit_tracking_request_with_whitespace(self):
        """Test that whitespace is trimmed from submission"""
        r = client.post(
            "/api/tracking-request",
            json={
                "team_name": "  Test Team  ",
                "email": "  team@example.com  ",
                "code": "  TEAM-002  "
            }
        )
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "pending"

        # Verify the data was trimmed
        db = TestingSessionLocal()
        req = db.query(TrackingRequest).filter(TrackingRequest.id == data["id"]).first()
        assert req.team_name == "Test Team"
        assert req.email == "team@example.com"
        assert req.code == "TEAM-002"
        db.close()

    def test_submit_multiple_requests(self):
        """Test that multiple requests can be submitted"""
        r1 = client.post(
            "/api/tracking-request",
            json={
                "team_name": "Team A",
                "email": "a@example.com",
                "code": "TEAM-A"
            }
        )
        r2 = client.post(
            "/api/tracking-request",
            json={
                "team_name": "Team B",
                "email": "b@example.com",
                "code": "TEAM-B"
            }
        )
        assert r1.status_code == 200
        assert r2.status_code == 200
        assert r1.json()["id"] != r2.json()["id"]


class TestListTrackingRequests:
    """Tests for GET /api/admin/tracking-requests"""

    def test_list_pending_requests_empty(self):
        """Test listing pending requests when none exist"""
        r = client.get("/api/admin/tracking-requests", headers=ADMIN_HEADERS)
        assert r.status_code == 200
        assert r.json() == []

    def test_list_pending_requests_no_auth(self):
        """Test that listing requires admin auth"""
        r = client.get("/api/admin/tracking-requests")
        assert r.status_code == 401

    def test_list_pending_requests_invalid_auth(self):
        """Test that invalid token is rejected"""
        r = client.get(
            "/api/admin/tracking-requests",
            headers={"Authorization": "Bearer invalid-token"}
        )
        assert r.status_code == 401

    def test_list_pending_requests_multiple(self):
        """Test listing multiple pending requests"""
        # Submit multiple requests
        for i in range(3):
            client.post(
                "/api/tracking-request",
                json={
                    "team_name": f"Team {i}",
                    "email": f"team{i}@example.com",
                    "code": f"TEAM-{i}"
                }
            )

        r = client.get("/api/admin/tracking-requests", headers=ADMIN_HEADERS)
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 3
        # Should be ordered by created_at descending (newest first)
        assert data[0]["code"] == "TEAM-2"
        assert data[1]["code"] == "TEAM-1"
        assert data[2]["code"] == "TEAM-0"

    def test_list_pending_requests_excludes_approved(self):
        """Test that approved requests are not in pending list"""
        db = TestingSessionLocal()
        # Create pending request
        pending = TrackingRequest(
            team_name="Pending Team",
            email="pending@example.com",
            code="PENDING",
            status="pending"
        )
        # Create approved request
        approved = TrackingRequest(
            team_name="Approved Team",
            email="approved@example.com",
            code="APPROVED",
            status="approved"
        )
        db.add(pending)
        db.add(approved)
        db.commit()
        db.close()

        r = client.get("/api/admin/tracking-requests", headers=ADMIN_HEADERS)
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 1
        assert data[0]["code"] == "PENDING"


class TestApproveTrackingRequest:
    """Tests for POST /api/admin/tracking-request/{id}/approve"""

    def test_approve_request_creates_team_and_generates_token(self):
        """Test approving a request creates team and generates token"""
        # Submit a request
        r_submit = client.post(
            "/api/tracking-request",
            json={
                "team_name": "New Team",
                "email": "new@example.com",
                "code": "NEW-TEAM"
            }
        )
        request_id = r_submit.json()["id"]

        # Approve the request
        r = client.post(
            f"/api/admin/tracking-request/{request_id}/approve",
            headers=ADMIN_HEADERS
        )
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "approved"
        assert "token" in data
        assert len(data["token"]) == 32  # UUID hex is 32 chars
        assert "team_id" in data

    def test_approve_request_no_auth(self):
        """Test that approving requires admin auth"""
        db = TestingSessionLocal()
        req = TrackingRequest(
            team_name="Test",
            email="test@example.com",
            code="TEST",
            status="pending"
        )
        db.add(req)
        db.commit()
        request_id = req.id
        db.close()

        r = client.post(f"/api/admin/tracking-request/{request_id}/approve")
        assert r.status_code == 401

    def test_approve_request_not_found(self):
        """Test approving a non-existent request"""
        r = client.post(
            "/api/admin/tracking-request/nonexistent-id/approve",
            headers=ADMIN_HEADERS
        )
        assert r.status_code == 404
        assert r.json()["detail"] == "Tracking request not found"

    def test_approve_request_updates_team_token(self):
        """Test that team gets token after approval"""
        r_submit = client.post(
            "/api/tracking-request",
            json={
                "team_name": "Team",
                "email": "team@example.com",
                "code": "TEAM"
            }
        )
        request_id = r_submit.json()["id"]

        r = client.post(
            f"/api/admin/tracking-request/{request_id}/approve",
            headers=ADMIN_HEADERS
        )
        team_id = r.json()["team_id"]
        token = r.json()["token"]

        # Verify team has the token
        db = TestingSessionLocal()
        team = db.query(Team).filter(Team.id == team_id).first()
        assert team.current_token == token
        assert team.token_generated_at is not None
        db.close()

    def test_approve_existing_team_updates_token(self):
        """Test approving request for existing team updates its token"""
        db = TestingSessionLocal()
        # Create existing team
        team = Team(name="Existing", color="#000000", code="EXISTING")
        db.add(team)
        db.commit()
        team_id = team.id
        db.close()

        # Submit request for same code
        r_submit = client.post(
            "/api/tracking-request",
            json={
                "team_name": "Existing Team",
                "email": "existing@example.com",
                "code": "EXISTING"
            }
        )
        request_id = r_submit.json()["id"]

        # Approve it
        r = client.post(
            f"/api/admin/tracking-request/{request_id}/approve",
            headers=ADMIN_HEADERS
        )
        assert r.status_code == 200
        assert r.json()["team_id"] == team_id


class TestRejectTrackingRequest:
    """Tests for POST /api/admin/tracking-request/{id}/reject"""

    def test_reject_request_success(self):
        """Test rejecting a tracking request"""
        r_submit = client.post(
            "/api/tracking-request",
            json={
                "team_name": "Team",
                "email": "team@example.com",
                "code": "TEAM"
            }
        )
        request_id = r_submit.json()["id"]

        r = client.post(
            f"/api/admin/tracking-request/{request_id}/reject",
            headers=ADMIN_HEADERS
        )
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "rejected"
        assert data["id"] == request_id

    def test_reject_request_no_auth(self):
        """Test that rejecting requires admin auth"""
        db = TestingSessionLocal()
        req = TrackingRequest(
            team_name="Test",
            email="test@example.com",
            code="TEST",
            status="pending"
        )
        db.add(req)
        db.commit()
        request_id = req.id
        db.close()

        r = client.post(f"/api/admin/tracking-request/{request_id}/reject")
        assert r.status_code == 401

    def test_reject_request_not_found(self):
        """Test rejecting a non-existent request"""
        r = client.post(
            "/api/admin/tracking-request/nonexistent-id/reject",
            headers=ADMIN_HEADERS
        )
        assert r.status_code == 404
        assert r.json()["detail"] == "Tracking request not found"


class TestTeamTokenManagement:
    """Tests for token management endpoints"""

    @pytest.fixture
    def team_with_token(self):
        """Create a team with a token"""
        db = TestingSessionLocal()
        team = Team(
            name="Token Team",
            color="#000000",
            code="TOKEN-TEAM",
            current_token="test-token-" + "a" * 22,  # 32 chars
        )
        db.add(team)
        db.commit()
        team_id = team.id
        db.close()
        return team_id

    def test_reset_token_success(self, team_with_token):
        """Test resetting a team's token"""
        r = client.post(
            f"/api/admin/teams/{team_with_token}/token/reset",
            headers=ADMIN_HEADERS
        )
        assert r.status_code == 200
        data = r.json()
        assert data["team_id"] == team_with_token
        assert "token" in data
        assert len(data["token"]) == 32
        assert data["token"] != "test-token-" + "a" * 22

    def test_reset_token_no_auth(self, team_with_token):
        """Test that resetting token requires admin auth"""
        r = client.post(f"/api/admin/teams/{team_with_token}/token/reset")
        assert r.status_code == 401

    def test_reset_token_not_found(self):
        """Test resetting token for non-existent team"""
        r = client.post(
            "/api/admin/teams/nonexistent-id/token/reset",
            headers=ADMIN_HEADERS
        )
        assert r.status_code == 404
        assert r.json()["detail"] == "Team not found"

    def test_disable_token_success(self, team_with_token):
        """Test disabling a team's token"""
        r = client.post(
            f"/api/admin/teams/{team_with_token}/token/disable",
            headers=ADMIN_HEADERS
        )
        assert r.status_code == 200
        data = r.json()
        assert data["team_id"] == team_with_token
        assert data["token"] is None

        # Verify token is actually disabled
        db = TestingSessionLocal()
        team = db.query(Team).filter(Team.id == team_with_token).first()
        assert team.current_token is None
        db.close()

    def test_disable_token_no_auth(self, team_with_token):
        """Test that disabling token requires admin auth"""
        r = client.post(f"/api/admin/teams/{team_with_token}/token/disable")
        assert r.status_code == 401

    def test_disable_token_not_found(self):
        """Test disabling token for non-existent team"""
        r = client.post(
            "/api/admin/teams/nonexistent-id/token/disable",
            headers=ADMIN_HEADERS
        )
        assert r.status_code == 404
        assert r.json()["detail"] == "Team not found"

    def test_get_token_info_success(self, team_with_token):
        """Test getting token info for a team"""
        r = client.get(
            f"/api/admin/teams/{team_with_token}/token",
            headers=ADMIN_HEADERS
        )
        assert r.status_code == 200
        data = r.json()
        assert data["team_id"] == team_with_token
        assert data["current_token"] == "test-token-" + "a" * 22
        assert data["team_name"] == "Token Team"

    def test_get_token_info_no_auth(self, team_with_token):
        """Test that getting token info requires admin auth"""
        r = client.get(f"/api/admin/teams/{team_with_token}/token")
        assert r.status_code == 401

    def test_get_token_info_not_found(self):
        """Test getting token info for non-existent team"""
        r = client.get(
            "/api/admin/teams/nonexistent-id/token",
            headers=ADMIN_HEADERS
        )
        assert r.status_code == 404
        assert r.json()["detail"] == "Team not found"


class TestTokenLogging:
    """Tests for token usage logging in location updates"""

    def test_location_update_logs_token_usage(self):
        """Test that location updates log token usage"""
        db = TestingSessionLocal()
        team = Team(name="Team", color="#000000", code="TEAM")
        db.add(team)
        db.commit()
        team_id = team.id

        tracker = Tracker(team_id=team_id, code="TEAM", status="approved")
        db.add(tracker)
        db.commit()

        # Generate and set token
        team.current_token = "a" * 32
        team.token_generated_at = datetime.utcnow()
        db.commit()
        db.close()

        # Update location with token
        now = datetime.utcnow()
        r = client.post(
            "/api/trackers/update-location",
            json={
                "team_id": team_id,
                "latitude": 38.3566,
                "longitude": -122.6753,
                "accuracy": 5.0,
                "timestamp": now.isoformat(),
                "token": "a" * 32
            }
        )
        assert r.status_code == 200

        # Verify token usage was logged
        db = TestingSessionLocal()
        team = db.query(Team).filter(Team.id == team_id).first()
        assert team.last_token_used_at is not None
        assert team.last_location_lat == 38.3566
        assert team.last_location_lon == -122.6753
        db.close()

    def test_location_update_with_invalid_token(self):
        """Test that invalid token is rejected"""
        db = TestingSessionLocal()
        team = Team(name="Team", color="#000000", code="TEAM")
        db.add(team)
        db.commit()
        team_id = team.id

        tracker = Tracker(team_id=team_id, code="TEAM", status="approved")
        db.add(tracker)
        db.commit()

        team.current_token = "a" * 32
        db.commit()
        db.close()

        # Try to update with wrong token
        now = datetime.utcnow()
        r = client.post(
            "/api/trackers/update-location",
            json={
                "team_id": team_id,
                "latitude": 38.3566,
                "longitude": -122.6753,
                "accuracy": 5.0,
                "timestamp": now.isoformat(),
                "token": "b" * 32
            }
        )
        assert r.status_code == 401
        assert r.json()["detail"] == "Invalid or missing token"

    def test_location_update_without_token_is_rejected(self):
        """Regression: the token is required — omitting it must be rejected."""
        db = TestingSessionLocal()
        team = Team(name="Team", color="#000000", code="TEAM", current_token="a" * 32)
        db.add(team)
        db.commit()
        team_id = team.id

        tracker = Tracker(team_id=team_id, code="TEAM", status="approved")
        db.add(tracker)
        db.commit()
        db.close()

        # Update location without token (must be rejected — 422 missing field)
        now = datetime.utcnow()
        r = client.post(
            "/api/trackers/update-location",
            json={
                "team_id": team_id,
                "latitude": 38.3566,
                "longitude": -122.6753,
                "accuracy": 5.0,
                "timestamp": now.isoformat()
            }
        )
        assert r.status_code == 422
        # And nothing was written
        db = TestingSessionLocal()
        assert db.query(TrackerLocation).filter(TrackerLocation.team_id == team_id).count() == 0
        db.close()

    def test_location_update_logs_last_location_coords(self):
        """Test that last location coordinates are logged with token"""
        db = TestingSessionLocal()
        team = Team(name="Team", color="#000000", code="TEAM")
        db.add(team)
        db.commit()
        team_id = team.id

        tracker = Tracker(team_id=team_id, code="TEAM", status="approved")
        db.add(tracker)
        db.commit()

        team.current_token = "c" * 32
        db.commit()
        db.close()

        # Send multiple locations
        now = datetime.utcnow()
        locations = [
            (38.1, -122.1),
            (38.2, -122.2),
            (38.3, -122.3),
        ]

        for lat, lon in locations:
            r = client.post(
                "/api/trackers/update-location",
                json={
                    "team_id": team_id,
                    "latitude": lat,
                    "longitude": lon,
                    "accuracy": 5.0,
                    "timestamp": now.isoformat(),
                    "token": "c" * 32
                }
            )
            assert r.status_code == 200

        # Verify last location is the most recent
        db = TestingSessionLocal()
        team = db.query(Team).filter(Team.id == team_id).first()
        assert team.last_location_lat == 38.3
        assert team.last_location_lon == -122.3
        db.close()
