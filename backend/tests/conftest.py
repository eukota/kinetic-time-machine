import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from database import Base, get_db
from app import app

# Create a single shared test database and session factory
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

# Set up the database schema once
Base.metadata.create_all(bind=engine)

# Override the dependency for all tests
app.dependency_overrides[get_db] = override_get_db

@pytest.fixture
def db():
    """Provide a database session for tests that need it"""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
