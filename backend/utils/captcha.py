import os
import httpx

# If HCAPTCHA_SECRET is unset, captcha is disabled (dev mode).
HCAPTCHA_SECRET = os.getenv("HCAPTCHA_SECRET", "").strip()
HCAPTCHA_VERIFY_URL = "https://api.hcaptcha.com/siteverify"


async def verify_captcha(token: str | None, remote_ip: str | None = None) -> bool:
    """Verify an hCaptcha token. Returns True if disabled (no secret) or valid."""
    if not HCAPTCHA_SECRET:
        return True   # disabled
    if not token:
        return False
    data = {"secret": HCAPTCHA_SECRET, "response": token}
    if remote_ip:
        data["remoteip"] = remote_ip
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.post(HCAPTCHA_VERIFY_URL, data=data)
        return bool(r.json().get("success"))
    except Exception:
        # Fail closed — if hCaptcha is unreachable, reject the upload
        return False
