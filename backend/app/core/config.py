"""Settings that decide who is trusted. Read from the environment, never hard-coded.

SECRET_KEY    Signs login tokens. Set it on Render to a long random string.
              If it is missing, a key is derived from DATABASE_URL (a secret that is not in the repo),
              so tokens are still unforgeable and survive restarts. A warning is logged.
ADMIN_EMAIL   The one admin account (default rabbi@edutrack.com).
"""
import hashlib
import logging
import os
import secrets

log = logging.getLogger("azs.config")

ALGORITHM = "HS256"
ADMIN_EMAIL = (os.getenv("ADMIN_EMAIL") or "rabbi@edutrack.com").strip().lower()

# Values that were once published in the public repository. They must never be trusted.
_PUBLISHED_KEYS = {
    "edutrack-super-secret-jwt-key-2025",
    "edutrack_academic_secret_jwt_key_2026",
}


def _load_secret_key() -> str:
    key = (os.getenv("SECRET_KEY") or "").strip()
    if key and key not in _PUBLISHED_KEYS and len(key) >= 16:
        return key

    reason = "is not set" if not key else "is a value that was published in the repository, or is too short"
    db_url = (os.getenv("DATABASE_URL") or "").strip()
    if db_url:
        log.warning("SECRET_KEY %s. Using a key derived from DATABASE_URL. Set SECRET_KEY on Render.", reason)
        return hashlib.sha256(("azs-jwt-v1|" + db_url).encode("utf-8")).hexdigest()

    log.warning("SECRET_KEY %s and DATABASE_URL is empty. Using a random key; logins reset on every restart.", reason)
    return secrets.token_hex(32)


SECRET_KEY = _load_secret_key()
