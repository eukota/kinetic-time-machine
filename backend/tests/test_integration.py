import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from database import Base, get_db
from app import app
from PIL import Image
import io

engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
Base.metadata.create_all(bind=engine)

client = TestClient(app)

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

def test_create_submission():
    img = Image.new("RGB", (100, 100), color="blue")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    r = client.post(
        "/api/submissions/",
        files={"image": ("test.jpg", buf, "image/jpeg")},
        data={"note": "test note"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["note"] == "test note"
    assert data["latitude"] is None

def test_get_submission_not_found():
    r = client.get("/api/submissions/nonexistent-id")
    assert r.status_code == 404
