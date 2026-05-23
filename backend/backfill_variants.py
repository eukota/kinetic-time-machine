#!/usr/bin/env python3
"""One-shot backfill: generate thumb/medium variants for photos uploaded before this feature."""
import os, sys

sys.path.insert(0, os.path.dirname(__file__))

from config import PHOTOS_DIR
from utils.images import generate_variants

ok = skipped = errors = 0

for submission_id in sorted(os.listdir(PHOTOS_DIR)):
    sub_dir = os.path.join(PHOTOS_DIR, submission_id)
    if not os.path.isdir(sub_dir):
        continue
    for fname in sorted(os.listdir(sub_dir)):
        if "_thumb" in fname or "_medium" in fname:
            continue
        photo_id = os.path.splitext(fname)[0]
        thumb = os.path.join(sub_dir, f"{photo_id}_thumb.jpg")
        if os.path.exists(thumb):
            skipped += 1
            continue
        src = os.path.join(sub_dir, fname)
        try:
            generate_variants(src, sub_dir, photo_id)
            print(f"  ok  {submission_id}/{fname}")
            ok += 1
        except Exception as e:
            print(f"  ERR {submission_id}/{fname}: {e}")
            errors += 1

print(f"\n{ok} generated, {skipped} already existed, {errors} errors")
