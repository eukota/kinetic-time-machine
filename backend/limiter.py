from slowapi import Limiter
from starlette.requests import Request


def get_real_ip(request: Request) -> str:
    """Resolve the real client IP, honoring X-Forwarded-For when behind Caddy/nginx."""
    xff = request.headers.get("x-forwarded-for")
    if xff:
        # First entry in X-Forwarded-For is the original client.
        return xff.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


limiter = Limiter(key_func=get_real_ip)
