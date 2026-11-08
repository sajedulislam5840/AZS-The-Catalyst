"""Checks for the links the admin pastes. Materials must be Google Drive, lectures must be YouTube."""
import re
from urllib.parse import parse_qs, urlparse

_ID = r"[A-Za-z0-9_-]{10,}"
_DRIVE_HOSTS = {"drive.google.com"}
_DOCS_HOSTS = {"docs.google.com"}
_YOUTUBE_HOSTS = {"www.youtube.com", "youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be", "www.youtu.be"}

DRIVE_HELP = (
    "শুধু Google Drive লিংক দেওয়া যাবে। Drive-এ ফাইলটি খুলে Share → "
    "'Anyone with the link' (Viewer) করে লিংকটি কপি করো।"
)
YOUTUBE_HELP = "শুধু YouTube লিংক দেওয়া যাবে (youtube.com বা youtu.be)।"


def _parse(url: str):
    url = (url or "").strip()
    parsed = urlparse(url)
    if parsed.scheme != "https" or not parsed.hostname:
        raise ValueError("লিংকটি https:// দিয়ে শুরু হতে হবে।")
    return parsed


def normalize_drive_url(url: str) -> str:
    """Return a clean viewer link, or raise ValueError."""
    parsed = _parse(url)
    host = parsed.hostname.lower()
    path = parsed.path
    query = parse_qs(parsed.query)

    if host in _DRIVE_HOSTS:
        m = re.search(rf"/file/d/({_ID})", path) or re.search(rf"/folders/({_ID})", path)
        if m and "/folders/" in path:
            return f"https://drive.google.com/drive/folders/{m.group(1)}"
        if m:
            return f"https://drive.google.com/file/d/{m.group(1)}/view"
        file_id = (query.get("id") or [""])[0]
        if re.fullmatch(_ID, file_id) and path.rstrip("/") in ("/open", "/uc"):
            return f"https://drive.google.com/file/d/{file_id}/view"
        raise ValueError(DRIVE_HELP)

    if host in _DOCS_HOSTS:
        m = re.fullmatch(rf"/(document|presentation|spreadsheets|forms)/d/({_ID})(/.*)?", path)
        if m:
            return f"https://docs.google.com/{m.group(1)}/d/{m.group(2)}/{'viewform' if m.group(1) == 'forms' else 'preview'}"
        raise ValueError(DRIVE_HELP)

    raise ValueError(DRIVE_HELP)


def validate_youtube_url(url: str) -> str:
    parsed = _parse(url)
    host = parsed.hostname.lower()
    if host not in _YOUTUBE_HOSTS:
        raise ValueError(YOUTUBE_HELP)
    if host.endswith("youtu.be"):
        ok = bool(re.fullmatch(r"/[A-Za-z0-9_-]{6,}", parsed.path))
    else:
        vid = (parse_qs(parsed.query).get("v") or [""])[0]
        ok = bool(re.fullmatch(r"[A-Za-z0-9_-]{6,}", vid)) or bool(
            re.match(r"/(embed|shorts|live)/[A-Za-z0-9_-]{6,}", parsed.path)
        )
    if not ok:
        raise ValueError(YOUTUBE_HELP)
    return url.strip()
