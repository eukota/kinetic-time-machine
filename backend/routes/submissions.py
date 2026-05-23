from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from sqlalchemy.orm import Session
from sqlalchemy import desc, extract, func
from database import get_db
from limiter import limiter
from models import Submission, Photo, Team
from utils.exif import extract_exif
from utils.captcha import verify_captcha
from config import PHOTOS_DIR
from utils.images import generate_variants, normalize_image, open_oriented, variant_path_if_exists
from utils.moderation import Verdict, moderate_image
import os, uuid, shutil

HEIC_SUFFIXES = {".heic", ".heif"}
MAX_UPLOAD_BYTES = 15 * 1024 * 1024   # 15 MB cap per photo
CHUNK_SIZE = 64 * 1024


router = APIRouter(prefix="/api/submissions", tags=["submissions"])

@router.post("/")
@limiter.limit("5/hour;30/day")
async def create_submission(
    request: Request,
    image: UploadFile = File(...),
    note: str = Form(None),
    team_name: str = Form(None),
    captcha_token: str = Form(None),
    db: Session = Depends(get_db),
):
    # hCaptcha — if HCAPTCHA_SECRET is set on the server, require a valid token
    client_ip = request.client.host if request.client else None
    if not await verify_captcha(captcha_token, client_ip):
        raise HTTPException(status_code=400, detail="Captcha verification failed")

    # Early reject if Content-Length header says it's too big (cheap upfront check)
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_UPLOAD_BYTES + 1_000_000:
        raise HTTPException(status_code=413, detail="File too large (max 15 MB)")

    suffix = os.path.splitext(image.filename or "photo.jpg")[1] or ".jpg"
    temp_path = f"/tmp/{uuid.uuid4()}{suffix}"

    # Stream to disk with hard size cap — protects against lying Content-Length
    size = 0
    with open(temp_path, "wb") as f:
        while chunk := await image.read(CHUNK_SIZE):
            size += len(chunk)
            if size > MAX_UPLOAD_BYTES:
                f.close()
                try: os.unlink(temp_path)
                except OSError: pass
                raise HTTPException(status_code=413, detail="File too large (max 15 MB)")
            f.write(chunk)

    exif_data = extract_exif(temp_path)

    # Convert HEIC/HEIF → JPEG for browser compatibility (EXIF already extracted above)
    original_mime = image.content_type
    if suffix.lower() in HEIC_SUFFIXES:
        jpeg_path = temp_path[: temp_path.rfind(".")] + ".jpg"
        open_oriented(temp_path).convert("RGB").save(jpeg_path, "JPEG", quality=88, optimize=True)
        os.unlink(temp_path)
        temp_path = jpeg_path
        suffix = ".jpg"
    else:
        normalize_image(temp_path)

    submission = Submission(
        latitude=exif_data["latitude"],
        longitude=exif_data["longitude"],
        timestamp=exif_data["timestamp"],
        note=note,
    )

    if team_name:
        team = db.query(Team).filter(Team.name == team_name).first()
        if team:
            submission.team_id = team.id

    db.add(submission)
    db.flush()

    photo_id = str(uuid.uuid4())
    dest_dir = os.path.join(PHOTOS_DIR, submission.id)
    os.makedirs(dest_dir, exist_ok=True)
    dest_path = os.path.join(dest_dir, f"{photo_id}{suffix}")
    shutil.move(temp_path, dest_path)
    await run_in_threadpool(generate_variants, dest_path, dest_dir, photo_id)

    mod = moderate_image(
        dest_path,
        latitude=submission.latitude,
        longitude=submission.longitude,
    )

    if mod.verdict == Verdict.REJECT:
        shutil.rmtree(dest_dir, ignore_errors=True)
        raise HTTPException(
            status_code=422,
            detail="Photo didn't pass safety review. Please submit a family-friendly race photo.",
        )

    submission.approved = mod.verdict == Verdict.APPROVE
    submission.moderation_note = f"[{mod.provider}] {mod.reason}"

    rel_path = f"{submission.id}/{photo_id}{suffix}"
    photo = Photo(submission_id=submission.id, file_path=rel_path, mime_type=original_mime)
    db.add(photo)
    db.commit()
    db.refresh(submission)

    return {
        "id": submission.id,
        "latitude": submission.latitude,
        "longitude": submission.longitude,
        "timestamp": submission.timestamp,
        "team_id": submission.team_id,
        "note": submission.note,
        "photo_count": len(submission.photos),
        "approved": submission.approved,
        "pending_review": not submission.approved,
        "moderation_note": submission.moderation_note,
    }

def _serialize_submission_summary(s):
    first = s.photos[0].file_path if s.photos else None
    return {
        "id": s.id,
        "latitude": s.latitude,
        "longitude": s.longitude,
        "timestamp": s.timestamp,
        "team_id": s.team_id,
        "note": s.note,
        "photo_count": len(s.photos),
        "created_at": s.created_at,
        "first_photo": first,
        "first_photo_thumb": variant_path_if_exists(first, "thumb", PHOTOS_DIR),
        "first_photo_display": variant_path_if_exists(first, "display", PHOTOS_DIR),
        "first_photo_medium": variant_path_if_exists(first, "medium", PHOTOS_DIR),
        "first_photo_mime": s.photos[0].mime_type if s.photos else None,
    }


@router.get("/")
def list_submissions(team_id: str = None, year: int = None, db: Session = Depends(get_db)):
    # Public list — only approved submissions are visible
    query = (
        db.query(Submission)
        .filter(Submission.approved == True)
        .order_by(desc(Submission.created_at))
    )
    if team_id:
        query = query.filter(Submission.team_id == team_id)
    if year is not None:
        submitted_at = func.coalesce(Submission.timestamp, Submission.created_at)
        query = query.filter(extract("year", submitted_at) == year)
    return [_serialize_submission_summary(s) for s in query.all()]

@router.get("/{submission_id}")
def get_submission(submission_id: str, db: Session = Depends(get_db)):
    sub = (
        db.query(Submission)
        .filter(Submission.id == submission_id, Submission.approved == True)
        .first()
    )
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    return {
        "id": sub.id,
        "latitude": sub.latitude,
        "longitude": sub.longitude,
        "timestamp": sub.timestamp,
        "team_id": sub.team_id,
        "note": sub.note,
        "photos": [
            {
                "id": p.id,
                "file_path": p.file_path,
                "thumb_path": variant_path_if_exists(p.file_path, "thumb", PHOTOS_DIR),
                "display_path": variant_path_if_exists(p.file_path, "display", PHOTOS_DIR),
                "medium_path": variant_path_if_exists(p.file_path, "medium", PHOTOS_DIR),
                "mime_type": p.mime_type,
                "uploaded_at": p.uploaded_at,
            }
            for p in sub.photos
        ],
    }
