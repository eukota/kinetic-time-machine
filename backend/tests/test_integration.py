import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from fastapi.testclient import TestClient
from app import app
from PIL import Image
import io

# Use conftest setup for database
from tests.conftest import TestingSessionLocal

client = TestClient(app)

@pytest.fixture(autouse=True)
def manual_moderation(monkeypatch):
    monkeypatch.setenv("MODERATION_MODE", "manual")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}

def test_list_teams_empty():
    r = client.get("/api/teams/")
    assert r.status_code == 200
    assert r.json() == []

def test_list_submissions_empty():
    r = client.get("/api/submissions/")
    assert r.status_code == 200
    assert r.json() == []

def _upload_test_jpeg(note: str = "test"):
    img = Image.new("RGB", (400, 400), color="blue")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return client.post(
        "/api/submissions/",
        files={"image": ("test.jpg", buf, "image/jpeg")},
        data={"note": note},
    )

def test_create_submission():
    r = _upload_test_jpeg("test note")
    assert r.status_code == 200
    data = r.json()
    assert data["note"] == "test note"
    assert data["latitude"] is None
    assert data["approved"] is False
    assert data["pending_review"] is True

def test_new_submission_hidden_from_public_list():
    # Pending submissions exist (from previous tests) but public list should be empty
    r = client.get("/api/submissions/")
    assert r.status_code == 200
    # All currently-created submissions are pending; public sees none
    assert all(False for _ in r.json())

def test_public_get_pending_returns_404():
    upload = _upload_test_jpeg("hidden")
    sid = upload.json()["id"]
    r = client.get(f"/api/submissions/{sid}")
    assert r.status_code == 404

def test_admin_endpoints_require_token(monkeypatch):
    # No token configured → 503
    r = client.get("/api/admin/submissions/pending")
    assert r.status_code in (401, 503)

def test_admin_approve_flow(monkeypatch):
    # Configure admin token
    import auth
    monkeypatch.setattr(auth, "ADMIN_TOKEN", "test-secret")

    upload = _upload_test_jpeg("admin flow")
    sid = upload.json()["id"]
    headers = {"Authorization": "Bearer test-secret"}

    # Wrong token rejected
    bad = client.get("/api/admin/submissions/pending", headers={"Authorization": "Bearer wrong"})
    assert bad.status_code == 401

    # Pending list includes the new submission
    pending = client.get("/api/admin/submissions/pending", headers=headers).json()
    assert any(s["id"] == sid for s in pending)

    # Approve it
    r = client.post(f"/api/admin/submissions/{sid}/approve", headers=headers)
    assert r.status_code == 200
    assert r.json()["approved"] is True

    # Public list now contains it
    public = client.get("/api/submissions/").json()
    assert any(s["id"] == sid for s in public)

def test_list_includes_first_photo(monkeypatch):
    import auth
    monkeypatch.setattr(auth, "ADMIN_TOKEN", "test-secret")
    upload = _upload_test_jpeg("photo fields")
    sid = upload.json()["id"]
    client.post(f"/api/admin/submissions/{sid}/approve", headers={"Authorization": "Bearer test-secret"})
    items = client.get("/api/submissions/").json()
    item = next(s for s in items if s["id"] == sid)
    assert "first_photo" in item
    assert "first_photo_mime" in item
    assert "created_at" in item

def test_permissive_auto_approves(monkeypatch):
    monkeypatch.setenv("MODERATION_MODE", "permissive")
    r = _upload_test_jpeg("auto approved")
    assert r.status_code == 200
    data = r.json()
    assert data["approved"] is True
    assert data["pending_review"] is False
    public = client.get("/api/submissions/").json()
    assert any(s["id"] == data["id"] for s in public)

def test_get_submission_not_found():
    r = client.get("/api/submissions/nonexistent-id")
    assert r.status_code == 404


def test_admin_update_submission_team_and_note(monkeypatch):
    from models import Team, Submission

    import auth
    monkeypatch.setattr(auth, "ADMIN_TOKEN", "test-secret")
    headers = {"Authorization": "Bearer test-secret"}

    db = TestingSessionLocal()
    team = Team(name="Test Racers", color="#D62828")
    db.add(team)
    db.flush()
    sub = Submission(note="original caption", approved=True)
    db.add(sub)
    db.commit()
    team_id = team.id
    sid = sub.id
    db.close()

    r = client.patch(
        f"/api/admin/submissions/{sid}",
        headers=headers,
        json={"team_id": team_id, "note": "updated caption"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["team_id"] == team_id
    assert data["note"] == "updated caption"

    r2 = client.patch(
        f"/api/admin/submissions/{sid}",
        headers=headers,
        json={"team_id": "", "note": ""},
    )
    assert r2.status_code == 200
    assert r2.json()["team_id"] is None
    assert r2.json()["note"] is None


def test_admin_list_pending_trackers(monkeypatch):
    """Test listing pending tracker registrations"""
    from models import Team, Tracker

    import auth
    monkeypatch.setattr(auth, "ADMIN_TOKEN", "test-secret")
    headers = {"Authorization": "Bearer test-secret"}

    db = TestingSessionLocal()
    team = Team(name="Tracker Team", color="#FF0000", code="TRACKER-001")
    db.add(team)
    db.commit()

    # Create pending tracker
    tracker = Tracker(team_id=team.id, code="TRACKER-001", email="tracker@example.com", status="pending")
    db.add(tracker)
    db.commit()
    tracker_id = tracker.id
    db.close()

    r = client.get("/api/admin/trackers/pending", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert len(data) > 0
    assert any(t["id"] == tracker_id for t in data)


def test_admin_approve_tracker(monkeypatch):
    """Test approving a pending tracker registration"""
    from models import Team, Tracker

    import auth
    monkeypatch.setattr(auth, "ADMIN_TOKEN", "test-secret")
    headers = {"Authorization": "Bearer test-secret"}

    db = TestingSessionLocal()
    team = Team(name="Tracker Team 2", color="#00FF00", code="TRACKER-002")
    db.add(team)
    db.commit()

    tracker = Tracker(team_id=team.id, code="TRACKER-002", email="tracker2@example.com", status="pending")
    db.add(tracker)
    db.commit()
    tracker_id = tracker.id
    db.close()

    r = client.post(f"/api/admin/trackers/{tracker_id}/approve", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "approved"
    assert data["approved_at"] is not None

    # Verify tracker can now update locations
    db = TestingSessionLocal()
    tracker = db.query(Tracker).filter(Tracker.id == tracker_id).first()
    assert tracker.status == "approved"
    assert tracker.approved_at is not None
    db.close()


def test_admin_reject_tracker(monkeypatch):
    """Test rejecting a pending tracker registration"""
    from models import Team, Tracker

    import auth
    monkeypatch.setattr(auth, "ADMIN_TOKEN", "test-secret")
    headers = {"Authorization": "Bearer test-secret"}

    db = TestingSessionLocal()
    team = Team(name="Tracker Team 3", color="#0000FF", code="TRACKER-003")
    db.add(team)
    db.commit()

    tracker = Tracker(team_id=team.id, code="TRACKER-003", email="tracker3@example.com", status="pending")
    db.add(tracker)
    db.commit()
    tracker_id = tracker.id
    db.close()

    r = client.post(f"/api/admin/trackers/{tracker_id}/reject", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "rejected"

    # Verify tracker status is rejected
    db = TestingSessionLocal()
    tracker = db.query(Tracker).filter(Tracker.id == tracker_id).first()
    assert tracker.status == "rejected"
    db.close()


def test_admin_get_tracker(monkeypatch):
    """Test retrieving tracker details"""
    from models import Team, Tracker

    import auth
    monkeypatch.setattr(auth, "ADMIN_TOKEN", "test-secret")
    headers = {"Authorization": "Bearer test-secret"}

    db = TestingSessionLocal()
    team = Team(name="Tracker Team 4", color="#FFFF00", code="TRACKER-004")
    db.add(team)
    db.commit()

    tracker = Tracker(team_id=team.id, code="TRACKER-004", email="tracker4@example.com", status="pending")
    db.add(tracker)
    db.commit()
    tracker_id = tracker.id
    team_id = team.id
    db.close()

    r = client.get(f"/api/admin/trackers/{tracker_id}", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert data["id"] == tracker_id
    assert data["team_id"] == team_id
    assert data["code"] == "TRACKER-004"
    assert data["email"] == "tracker4@example.com"
    assert data["status"] == "pending"
