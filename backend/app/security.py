import base64
import hashlib
import hmac
import json
import os
import time

SECRET = os.environ.get("TASKFORGE_SECRET", "dev-secret-change-me")
_EXPIRY = 60 * 60 * 24 * 7  # 7 days


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 60_000)
    return f"pbkdf2${base64.urlsafe_b64encode(salt).decode()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        kind, salt_b64, hexdigest = stored.split("$")
        if kind != "pbkdf2":
            return False
        salt = base64.urlsafe_b64decode(salt_b64.encode())
        digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 60_000)
        return hmac.compare_digest(digest.hex(), hexdigest)
    except Exception:
        return False


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _unb64(data: str) -> bytes:
    pad = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + pad)


def create_token(user_id: int, role: str) -> str:
    payload = {"uid": user_id, "role": role, "exp": time.time() + _EXPIRY}
    raw = json.dumps(payload).encode()
    body = _b64(raw)
    sig = hmac.new(SECRET.encode(), body.encode(), hashlib.sha256).digest()
    return f"{body}.{_b64(sig)}"


def read_token(token: str):
    try:
        body, sig = token.split(".")
        expected = hmac.new(SECRET.encode(), body.encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(expected, _unb64(sig)):
            return None
        payload = json.loads(_unb64(body))
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None
