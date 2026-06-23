#!/usr/bin/env python3
"""Master seed script for database initialization."""
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from database import SessionLocal, init_db
from seeds.seed_teams import seed_teams
from seeds.test_trackers import seed_test_trackers


def run_all_seeds():
    """Run all database seeds in order."""
    print("🌱 Starting database seeding...\n")

    init_db()
    db = SessionLocal()

    try:
        print("Seeding teams...")
        seed_teams(db)
        print()

        print("Seeding test trackers...")
        seed_test_trackers(db)
        print()

        print("✅ All seeds completed successfully!")

    finally:
        db.close()


if __name__ == "__main__":
    run_all_seeds()
