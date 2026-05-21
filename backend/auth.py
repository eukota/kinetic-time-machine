import os
import secrets
from fastapi import Header, HTTPException

# Admin token is set via env var. If unset, admin endpoints are completely disabled
# (returns 503) — safer than allowing access with no auth.
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "").strip()


def require_admin(authorization: str | None = Header(default=None)):
    """Verify Bearer token matches ADMIN_TOKEN. Constant-time comparison."""
    if not ADMIN_TOKEN:
        raise HTTPException(status_code=503, detail="Admin disabled — ADMIN_TOKEN not configured")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.removeprefix("Bearer ").strip()
    if not secrets.compare_digest(token, ADMIN_TOKEN):
        raise HTTPException(status_code=401, detail="Invalid token")
