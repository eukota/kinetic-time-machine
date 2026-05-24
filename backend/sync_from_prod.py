#!/usr/bin/env python3
"""Sync approved submissions + photos from production over HTTPS (no SSH required)."""
import json
import os
import sys
import urllib.request
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))

from config import PHOTOS_DIR, DATABASE_URL
from database import SessionLocal, init_db
from models import Photo, Submission, Team

PROD_URL = os.getenv("PROD_URL", "https://kinetic.eukota.com").rstrip("/")
UA = "kinetic-time-machine-sync/1.0"


def fetch_json(path: str):
    req = urllib.request.Request(f"{PROD_URL}{path}", headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def download_file(url: str, dest: str) -> bool:
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return True
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=120) as r, open(dest, "wb") as f:
            f.write(r.read())
        return True
    except Exception as e:
        print(f"  skip download {url}: {e}")
        return False


def parse_dt(value: str | None):
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)


def main():
    print(f"Syncing from {PROD_URL} → {DATABASE_URL}")
    init_db()
    db = SessionLocal()

    teams = fetch_json("/api/teams/")
    print(f"{len(teams)} teams")
    for t in teams:
        row = db.get(Team, t["id"]) or Team(id=t["id"])
        row.name = t["name"]
        row.color = t["color"]
        row.active = True
        db.merge(row)
    db.commit()

    summaries = fetch_json("/api/submissions/")
    print(f"{len(summaries)} approved submissions")

    photos_ok = photos_skip = 0
    for s in summaries:
        detail = fetch_json(f"/api/submissions/{s['id']}")
        sub = db.get(Submission, s["id"]) or Submission(id=s["id"])
        sub.team_id = s.get("team_id")
        sub.latitude = s.get("latitude")
        sub.longitude = s.get("longitude")
        sub.timestamp = parse_dt(s.get("timestamp"))
        sub.note = s.get("note")
        sub.created_at = parse_dt(s.get("created_at")) or datetime.utcnow()
        sub.approved = True
        db.merge(sub)

        for p in detail.get("photos") or []:
            rel_paths = {p["file_path"]}
            for key in ("thumb_path", "display_path", "medium_path"):
                variant = p.get(key)
                if variant:
                    rel_paths.add(variant)

            for rel in rel_paths:
                dest = os.path.join(PHOTOS_DIR, rel)
                if download_file(f"{PROD_URL}/photos/{rel}", dest):
                    photos_ok += 1
                else:
                    photos_skip += 1

            photo = db.get(Photo, p["id"]) or Photo(id=p["id"])
            photo.submission_id = s["id"]
            photo.file_path = rel
            photo.mime_type = p.get("mime_type")
            photo.uploaded_at = parse_dt(p.get("uploaded_at")) or datetime.utcnow()
            db.merge(photo)

        print(f"  ok  {s['id']} ({len(detail.get('photos') or [])} photos)")

    db.commit()
    db.close()
    print(f"\nDone — {photos_ok} photos downloaded, {photos_skip} skipped")


if __name__ == "__main__":
    main()
