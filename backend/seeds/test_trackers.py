"""Seed test trackers for local development and testing."""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from models import Team, Tracker, TrackerLocation
import uuid


def seed_test_trackers(db: Session, team_sample: list = None):
    """Seed test trackers for local development

    Creates 3 approved test trackers with location history.
    Trackers are created with "approved" status for immediate testing without
    requiring the admin approval step.
    """

    # Get teams starting with #001 for testing
    teams = db.query(Team).filter(Team.name.like('%#001%')).all() if not team_sample else team_sample
    if not teams:
        # Fallback to first 3 teams if #001 not found
        teams = db.query(Team).limit(3).all()

    if not teams:
        print("⚠ No teams found. Run seed_teams.py first.")
        return

    for idx, team in enumerate(teams):
        # Check if tracker already exists for this team
        existing = db.query(Tracker).filter(Tracker.team_id == team.id).first()
        if existing:
            print(f"  Skipped tracker for {team.name} (already exists)")
            continue

        # Create tracker with approved status for immediate testing
        tracker = Tracker(
            id=str(uuid.uuid4()),
            team_id=team.id,
            code=f"TEST-{idx+1:03d}",
            email=f"test{idx+1}@example.com",
            status="approved",
            approved_at=datetime.utcnow()
        )
        db.add(tracker)
        db.commit()
        db.refresh(tracker)

        # Create initial location history (Arcata, CA - Kinetic start point)
        # Simulates tracker movement with timestamps at 30-minute intervals
        base_lat = 40.8669
        base_lon = -124.0822

        for minutes in [0, 30, 60, 90]:
            loc = TrackerLocation(
                id=str(uuid.uuid4()),
                tracker_id=tracker.id,
                team_id=team.id,
                latitude=base_lat + (minutes / 10000),
                longitude=base_lon + (minutes / 10000),
                accuracy=10.0,
                timestamp=datetime.utcnow() - timedelta(minutes=minutes)
            )
            db.add(loc)

        db.commit()
        print(f"✓ Created test tracker for {team.name}")
