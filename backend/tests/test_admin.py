"""Tests for admin security, subscriptions, notifications, content links and the student overview.

Run from the backend folder:
    DATABASE_URL=sqlite+aiosqlite:///./test.db pytest tests
"""
import asyncio
import os
import uuid
from datetime import date, datetime, timedelta

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./test_unused.db")

from app.api.v1.academic import router as academic_router  # noqa: E402
from app.api.v1.admin_academic import router as admin_router  # noqa: E402
from app.api.v1.auth import LOGIN_FAILURES, create_access_token, get_password_hash  # noqa: E402
from app.api.v1.auth import router as auth_router  # noqa: E402
from app.api.v1.notifications import router as notifications_router  # noqa: E402
from app.core import config  # noqa: E402
from app.core.database import Base, get_db  # noqa: E402
from app.models.academic import Material, Notice, SubjectEnum, VideoLecture  # noqa: E402,F401
from app.models.billing import Notification, SubscriptionPayment  # noqa: E402,F401
from app.models.chat import ChatMessage, ChatSession  # noqa: E402,F401
from app.models.progress import LectureProgress, StudyActivity  # noqa: E402,F401
from app.models.user import User  # noqa: E402
from app.services import links  # noqa: E402
from app.services.student_progress import summarize_progress  # noqa: E402
from app.services.subscription import (  # noqa: E402
    RenewalError,
    ensure_expiry_notifications,
    renew_student,
    undo_payment,
)

NOW = datetime(2026, 11, 8, 12, 0, 0)
DRIVE = "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view?usp=sharing"
YT = "https://youtu.be/dQw4w9WgXcQ"


def run(coro):
    return asyncio.run(coro)


# ======================================================================= pure helpers

def test_secret_key_never_uses_published_or_missing_value(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://u:pw@host/db")
    monkeypatch.delenv("SECRET_KEY", raising=False)
    derived = config._load_secret_key()
    assert derived not in config._PUBLISHED_KEYS and len(derived) == 64
    assert config._load_secret_key() == derived  # stable across restarts

    monkeypatch.setenv("SECRET_KEY", "edutrack-super-secret-jwt-key-2025")  # the one in the public repo
    assert config._load_secret_key() == derived
    monkeypatch.setenv("SECRET_KEY", "short")
    assert config._load_secret_key() == derived
    monkeypatch.setenv("SECRET_KEY", "a-long-random-secret-from-render")
    assert config._load_secret_key() == "a-long-random-secret-from-render"


@pytest.mark.parametrize(
    "raw,expected",
    [
        (DRIVE, "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view"),
        ("https://drive.google.com/open?id=1AbCdEfGhIjKlMnOp", "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view"),
        ("https://drive.google.com/uc?export=download&id=1AbCdEfGhIjKlMnOp", "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view"),
        ("https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOp?usp=sharing", "https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOp"),
        ("https://docs.google.com/document/d/1AbCdEfGhIjKlMnOp/edit?usp=sharing", "https://docs.google.com/document/d/1AbCdEfGhIjKlMnOp/preview"),
    ],
)
def test_drive_links_are_cleaned(raw, expected):
    assert links.normalize_drive_url(raw) == expected


@pytest.mark.parametrize(
    "bad",
    [
        "http://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view",  # not https
        "https://evil.com/file/d/1AbCdEfGhIjKlMnOp/view",
        "https://drive.google.com.evil.com/file/d/1AbCdEfGhIjKlMnOp/view",
        "https://example.com/x.pdf",
        "https://drive.google.com/",
        "javascript:alert(1)",
        "",
    ],
)
def test_non_drive_links_are_rejected(bad):
    with pytest.raises(ValueError):
        links.normalize_drive_url(bad)


def test_youtube_links():
    for ok in (YT, "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3", "https://www.youtube.com/embed/dQw4w9WgXcQ"):
        assert links.validate_youtube_url(ok) == ok
    for bad in ("https://vimeo.com/123456789", "https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ", "https://www.youtube.com/", "http://youtu.be/dQw4w9WgXcQ"):
        with pytest.raises(ValueError):
            links.validate_youtube_url(bad)


def test_summarize_progress():
    lecs = [
        {"id": "a", "title": "L1", "subject": "PHYSICS", "chapter": "Motion", "lecture_no": 1},
        {"id": "b", "title": "L2", "subject": "PHYSICS", "chapter": "Motion", "lecture_no": 2},
        {"id": "c", "title": "L3", "subject": "CHEMISTRY", "chapter": "Bonds", "lecture_no": 1},
        {"id": "d", "title": "L4", "subject": "CHEMISTRY", "chapter": "Bonds", "lecture_no": 2},
    ]
    prog = [
        {"lecture_id": "a", "completed": True, "position": 100, "duration": 100, "updated_at": datetime(2026, 11, 7, 9)},
        {"lecture_id": "b", "completed": False, "position": 30, "duration": 120, "updated_at": datetime(2026, 11, 8, 9)},
        {"lecture_id": "gone", "completed": True, "position": 0, "duration": 0, "updated_at": datetime(2026, 11, 8, 10)},  # deleted lecture
    ]
    out = summarize_progress(lecs, prog, ["2026-11-06", "2026-11-07", "2026-11-08"], 2, 1, date(2026, 11, 8))
    assert (out["total_lectures"], out["completed_lectures"], out["percent"]) == (4, 1, 25)
    phys = next(s for s in out["subjects"] if s["subject"] == "PHYSICS")
    assert phys["percent"] == 50 and phys["chapters"][0]["completed"] == 1
    assert next(s for s in out["subjects"] if s["subject"] == "CHEMISTRY")["percent"] == 0
    assert out["streak"] == 3 and out["active_days_28"] == 3 and out["notes_count"] == 2 and out["plans_count"] == 1
    assert [r["title"] for r in out["recent"]] == ["L2", "L1"]  # newest first, deleted lecture skipped
    assert out["recent"][0]["watched_percent"] == 25 and out["recent"][1]["watched_percent"] == 100
    assert out["last_active"].startswith("2026-11-08")


def test_streak_survives_an_evening_check():
    out = summarize_progress([], [], ["2026-11-06", "2026-11-07"], 0, 0, date(2026, 11, 8))  # nothing yet today
    assert out["streak"] == 2
    assert summarize_progress([], [], ["2026-11-01"], 0, 0, date(2026, 11, 8))["streak"] == 0
    empty = summarize_progress([], [], [], 0, 0, date(2026, 11, 8))
    assert empty["percent"] == 0 and empty["last_active"] is None


# ======================================================================= database fixtures

@pytest.fixture(autouse=True)
def reset_throttle():
    LOGIN_FAILURES.clear()


class Env:
    def __init__(self, client, maker):
        self.client, self.maker = client, maker

    def seed(self, *objs):
        async def go():
            async with self.maker() as s:
                s.add_all(objs)
                await s.commit()

        run(go())

    def query(self, fn):
        async def go():
            async with self.maker() as s:
                return await fn(s)

        return run(go())

    @staticmethod
    def auth(email, **kw):
        return {"Authorization": f"Bearer {create_access_token({'sub': email}, **kw)}"}


def student(email, name="Student", *, end=None, approved=None, batch="B1", created=None, pw="secret-pass-1"):
    return User(
        id=uuid.uuid4(),
        email=email,
        full_name=name,
        password_hash=get_password_hash(pw),
        is_active=True,
        is_approved=(end is not None) if approved is None else approved,
        subscription_end_date=end,
        batch_no=batch,
        created_at=created or datetime.utcnow(),
    )


@pytest.fixture()
def env(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'admin.db'}")
    maker = async_sessionmaker(engine, expire_on_commit=False)

    async def setup():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    run(setup())
    app = FastAPI()
    for r in (auth_router, admin_router, academic_router, notifications_router):
        app.include_router(r, prefix="/api/v1")

    async def override_db():
        async with maker() as s:
            yield s

    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as client:
        yield Env(client, maker)


ADMIN = "rabbi@edutrack.com"


def make_admin():
    return User(id=uuid.uuid4(), email=ADMIN, full_name="Admin", is_admin=True, is_active=True, is_approved=True)


# ======================================================================= the hole that was open

ADMIN_ROUTES = [
    ("GET", "/admin/overview"),
    ("GET", "/admin/students"),
    ("GET", f"/admin/students/{uuid.uuid4()}"),
    ("PATCH", f"/admin/students/{uuid.uuid4()}"),
    ("POST", f"/admin/students/{uuid.uuid4()}/renew"),
    ("POST", f"/admin/students/{uuid.uuid4()}/revoke-access"),
    ("DELETE", f"/admin/students/{uuid.uuid4()}"),
    ("POST", f"/admin/payments/{uuid.uuid4()}/undo"),
    ("GET", "/admin/lectures"),
    ("POST", "/admin/lectures"),
    ("PUT", f"/admin/lectures/{uuid.uuid4()}"),
    ("POST", "/admin/lectures/swap-order"),
    ("POST", "/admin/lectures/normalize-order"),
    ("PATCH", f"/admin/lectures/{uuid.uuid4()}/toggle-publish"),
    ("DELETE", f"/admin/lectures/{uuid.uuid4()}"),
    ("GET", "/admin/materials"),
    ("POST", "/admin/materials"),
    ("PUT", f"/admin/materials/{uuid.uuid4()}"),
    ("PATCH", f"/admin/materials/{uuid.uuid4()}/toggle-publish"),
    ("DELETE", f"/admin/materials/{uuid.uuid4()}"),
    ("GET", "/admin/notices"),
    ("POST", "/admin/notices"),
    ("DELETE", f"/admin/notices/{uuid.uuid4()}"),
]


def call(env, method, path, headers=None, json=None):
    return env.client.request(method, f"/api/v1{path}", headers=headers or {}, json=json)


def test_every_admin_route_refuses_strangers_even_when_the_admin_exists(env):
    # The old code logged anybody in as rabbi@edutrack.com when no valid token was sent.
    env.seed(make_admin(), student("kid@x.com", end=NOW + timedelta(days=30)))
    kid = Env.auth("kid@x.com")
    for method, path in ADMIN_ROUTES:
        assert call(env, method, path).status_code == 401, f"no token: {method} {path}"
        assert call(env, method, path, {"Authorization": "Bearer garbage"}).status_code == 401, f"bad token: {method} {path}"
        assert call(env, method, path, kid).status_code == 403, f"student token: {method} {path}"
        assert call(env, method, path, Env.auth(ADMIN, expires_delta=timedelta(minutes=-1))).status_code == 401, f"expired: {method} {path}"


def test_token_signed_with_a_guessable_key_is_refused(env):
    from jose import jwt

    env.seed(make_admin())
    forged = jwt.encode({"sub": ADMIN}, "edutrack-super-secret-jwt-key-2025", algorithm="HS256")  # key from the public repo
    assert call(env, "GET", "/admin/students", {"Authorization": f"Bearer {forged}"}).status_code == 401


def test_real_admin_gets_in_and_email_case_is_ignored(env):
    env.seed(make_admin())
    assert call(env, "GET", "/admin/students", Env.auth(ADMIN)).status_code == 200
    assert call(env, "GET", "/admin/students", Env.auth("RABBI@EduTrack.com")).status_code == 200


def test_admin_flag_alone_is_enough_and_a_plain_user_is_not(env):
    boss = student("teacher@x.com", "Teacher")
    boss.is_admin = True
    env.seed(boss, student("plain@x.com"))
    assert call(env, "GET", "/admin/students", Env.auth("teacher@x.com")).status_code == 200
    assert call(env, "GET", "/admin/students", Env.auth("plain@x.com")).status_code == 403


def test_file_upload_is_closed(env):
    r = env.client.post("/api/v1/academic/materials/upload", data={"title": "t", "chapter": "c", "subject": "Physics"}, files={"file": ("a.pdf", b"%PDF")})
    assert r.status_code == 410 and "Google Drive" in r.json()["detail"]


# ======================================================================= paywall

def test_content_is_locked_until_the_subscription_runs(env):
    env.seed(
        make_admin(),
        student("paid@x.com", end=NOW + timedelta(days=30)),
        student("late@x.com", end=datetime.utcnow() - timedelta(days=2), approved=True),
        student("new@x.com"),
        VideoLecture(lecture_no=1, topic="Motion", chapter="Ch1", subject=SubjectEnum.PHYSICS, youtube_url=YT, is_published=True),
        Material(title="Sheet", chapter="Ch1", subject=SubjectEnum.PHYSICS, pdf_url=DRIVE, is_published=True),
        Notice(content="Class is on Friday", created_at=datetime.utcnow()),
    )
    feeds = ["/academic/videos", "/academic/lectures", "/academic/materials", "/academic/notice"]
    for path in feeds:
        assert call(env, "GET", path).status_code == 401, path
        r = call(env, "GET", path, Env.auth("new@x.com"))
        assert r.status_code == 403 and r.json()["detail"]["code"] == "subscription_required", path
        r = call(env, "GET", path, Env.auth("late@x.com"))
        assert r.status_code == 403 and r.json()["detail"]["code"] == "subscription_expired", path
        assert call(env, "GET", path, Env.auth("paid@x.com")).status_code == 200, path
        assert call(env, "GET", path, Env.auth(ADMIN)).status_code == 200, path
    assert call(env, "GET", "/academic/notice", Env.auth("paid@x.com")).json()["content"] == "Class is on Friday"


def test_me_reports_the_real_subscription(env):
    env.seed(
        student("paid@x.com", end=datetime.utcnow() + timedelta(days=20, hours=1)),
        student("soon@x.com", end=datetime.utcnow() + timedelta(days=3, hours=1)),
        student("late@x.com", end=datetime.utcnow() - timedelta(days=2), approved=True),
        student("new@x.com"),
    )
    got = {e: call(env, "GET", "/auth/me", Env.auth(e)).json() for e in ("paid@x.com", "soon@x.com", "late@x.com", "new@x.com")}
    assert (got["paid@x.com"]["subscription_status"], got["paid@x.com"]["is_approved"], got["paid@x.com"]["days_left"]) == ("active", True, 21)
    assert got["soon@x.com"]["subscription_status"] == "expiring" and got["soon@x.com"]["days_left"] == 4
    assert (got["late@x.com"]["subscription_status"], got["late@x.com"]["is_approved"], got["late@x.com"]["days_left"]) == ("expired", False, 0)
    assert (got["new@x.com"]["subscription_status"], got["new@x.com"]["is_approved"]) == ("pending", False)
    assert call(env, "GET", "/auth/me").status_code == 401
    assert call(env, "GET", "/auth/me", Env.auth("paid@x.com", expires_delta=timedelta(minutes=-1))).status_code == 401


def test_login_is_throttled_after_ten_wrong_passwords(env):
    env.seed(student("ana@x.com", pw="right-password"))
    for _ in range(10):
        assert env.client.post("/api/v1/login", json={"email": "ana@x.com", "password": "nope"}).status_code == 401
    r = env.client.post("/api/v1/login", json={"email": "ana@x.com", "password": "right-password"})
    assert r.status_code == 429 and int(r.headers["retry-after"]) > 0
    # someone else is not affected
    env.seed(student("ben@x.com", pw="ben-password"))
    assert env.client.post("/api/v1/login", json={"email": "ben@x.com", "password": "ben-password"}).status_code == 200


def test_login_success_resets_the_counter(env):
    env.seed(student("ana@x.com", pw="right-password"))
    for _ in range(9):
        env.client.post("/api/v1/login", json={"email": "ana@x.com", "password": "nope"})
    assert env.client.post("/api/v1/login", json={"email": "ana@x.com", "password": "right-password"}).status_code == 200
    for _ in range(9):
        assert env.client.post("/api/v1/login", json={"email": "ana@x.com", "password": "nope"}).status_code == 401


# ======================================================================= renewals (cash)

def one(env, email):
    return env.query(lambda s: s.execute(__import__("sqlalchemy").select(User).where(User.email == email))).scalar_one()


def test_renew_starts_from_today_when_lapsed_and_from_the_end_date_when_running():
    async def go():
        engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        async with maker() as s:
            kid = student("k@x.com")
            s.add(kid)
            await s.commit()

            p1 = await renew_student(s, kid, ADMIN, 30, amount=1500, note="cash, handed to sir", now=NOW)
            assert p1.new_end == NOW + timedelta(days=30) and p1.previous_end is None and kid.is_approved

            later = NOW + timedelta(days=10)  # still running: extend from the END, not from today
            p2 = await renew_student(s, kid, ADMIN, 30, now=later)
            assert p2.new_end == NOW + timedelta(days=60) and p2.previous_end == NOW + timedelta(days=30)

            lapsed = NOW + timedelta(days=100)  # lapsed: start from today
            p3 = await renew_student(s, kid, ADMIN, 15, now=lapsed)
            assert p3.new_end == lapsed + timedelta(days=15)

            for bad in (0, 367):
                with pytest.raises(RenewalError):
                    await renew_student(s, kid, ADMIN, bad, now=lapsed + timedelta(minutes=5))
            with pytest.raises(RenewalError):
                await renew_student(s, make_admin(), ADMIN, 30, now=lapsed + timedelta(minutes=5))

    run(go())


def test_double_tap_cannot_give_double_days():
    async def go():
        engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        async with maker() as s:
            kid = student("k@x.com")
            s.add(kid)
            await s.commit()
            await renew_student(s, kid, ADMIN, 30, now=NOW)
            with pytest.raises(RenewalError) as e:
                await renew_student(s, kid, ADMIN, 30, now=NOW + timedelta(seconds=3))
            assert e.value.status_code == 409
            await renew_student(s, kid, ADMIN, 30, now=NOW + timedelta(seconds=30))  # a real second payment is fine

    run(go())


def test_undo_restores_exactly_and_only_the_latest_can_be_undone():
    async def go():
        engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        async with maker() as s:
            kid = student("k@x.com")
            s.add(kid)
            await s.commit()
            p1 = await renew_student(s, kid, ADMIN, 30, now=NOW)
            p2 = await renew_student(s, kid, ADMIN, 30, now=NOW + timedelta(minutes=5))
            with pytest.raises(RenewalError) as e:
                await undo_payment(s, p1, now=NOW + timedelta(minutes=6))  # p2 is newer
            assert e.value.status_code == 409

            await undo_payment(s, p2, now=NOW + timedelta(minutes=6))
            assert kid.subscription_end_date == NOW + timedelta(days=30) and kid.is_approved
            with pytest.raises(RenewalError):
                await undo_payment(s, p2)  # already undone

            await undo_payment(s, p1, now=NOW + timedelta(minutes=7))  # now it is the latest
            assert kid.subscription_end_date is None and kid.is_approved is False  # back to "never paid"

    run(go())


def test_renew_and_undo_over_http(env):
    env.seed(make_admin(), student("kid@x.com"))
    admin = Env.auth(ADMIN)
    sid = call(env, "GET", "/admin/students", admin).json()[0]["id"]

    r = call(env, "POST", f"/admin/students/{sid}/renew", admin, {"days": 30, "amount": 1200, "note": "cash"})
    assert r.status_code == 200 and r.json()["days_left"] in (30, 31)
    assert call(env, "POST", f"/admin/students/{sid}/renew", admin, {"days": 30}).status_code == 409  # double tap
    assert call(env, "POST", f"/admin/students/{sid}/renew", admin, {"days": 0}).status_code == 422
    assert call(env, "POST", f"/admin/students/{sid}/renew", admin, {"days": 400}).status_code == 422

    detail = call(env, "GET", f"/admin/students/{sid}", admin).json()
    assert detail["student"]["status"] == "active" and detail["student"]["is_approved"] is True
    pay = detail["payments"][0]
    assert pay["amount"] == 1200 and pay["note"] == "cash" and pay["recorded_by"] == ADMIN and pay["can_undo"] is True

    assert call(env, "POST", f"/admin/payments/{pay['id']}/undo", admin).status_code == 200
    detail = call(env, "GET", f"/admin/students/{sid}", admin).json()
    assert detail["student"]["status"] == "pending" and detail["payments"][0]["voided"] is True
    assert call(env, "POST", f"/admin/payments/{pay['id']}/undo", admin).status_code == 409


def test_admin_cannot_be_renewed_or_deleted_as_a_student(env):
    env.seed(make_admin())
    admin = Env.auth(ADMIN)
    me = env.query(lambda s: s.execute(__import__("sqlalchemy").select(User.id))).scalars().first()
    assert call(env, "POST", f"/admin/students/{me}/renew", admin, {"days": 30}).status_code == 404
    assert call(env, "DELETE", f"/admin/students/{me}", admin).status_code == 404


# ======================================================================= automatic warnings

def test_expiry_warnings_come_once_per_step():
    async def go():
        engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        from sqlalchemy import select

        async with maker() as s:
            end = NOW + timedelta(days=6, hours=12)  # 7 days left on the counter
            kid = student("k@x.com", end=end)
            s.add(kid)
            await s.commit()

            async def titles():
                rows = (await s.execute(select(Notification).where(Notification.user_id == kid.id).order_by(Notification.created_at))).scalars().all()
                return [(n.kind, n.dedupe_key.split(":")[0]) for n in rows]

            await ensure_expiry_notifications(s, kid, NOW)
            await ensure_expiry_notifications(s, kid, NOW + timedelta(hours=1))  # reopening the app must not repeat it
            assert await titles() == [("expiring", "expiring7")]
            first = (await s.execute(select(Notification))).scalars().first()
            assert "আর 7 দিন বাকি" in first.body  # the real number of days left is in the message

            await ensure_expiry_notifications(s, kid, NOW + timedelta(days=4, hours=1))  # 3 days left
            await ensure_expiry_notifications(s, kid, NOW + timedelta(days=6))           # 1 day left
            assert await titles() == [("expiring", "expiring7"), ("expiring", "expiring3"), ("expiring", "expiring1")]

            await ensure_expiry_notifications(s, kid, end + timedelta(hours=1))
            await ensure_expiry_notifications(s, kid, end + timedelta(days=3))
            assert (await titles())[-1] == ("expired", "expired") and len(await titles()) == 4

    run(go())


def test_a_late_opener_only_gets_the_most_urgent_warning():
    async def go():
        engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        from sqlalchemy import select

        async with maker() as s:
            kid = student("k@x.com", end=NOW + timedelta(days=1, hours=12))  # 2 days left
            s.add(kid)
            await s.commit()
            await ensure_expiry_notifications(s, kid, NOW)
            keys = [n.dedupe_key.split(":")[0] for n in (await s.execute(select(Notification))).scalars().all()]
            assert keys == ["expiring3"]

    run(go())


def test_no_warnings_for_healthy_never_paid_or_admin_accounts():
    async def go():
        engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        from sqlalchemy import select

        async with maker() as s:
            healthy = student("h@x.com", end=NOW + timedelta(days=20))
            never = student("n@x.com")
            boss = make_admin()
            boss.subscription_end_date = NOW + timedelta(days=1)
            s.add_all([healthy, never, boss])
            await s.commit()
            for u in (healthy, never, boss):
                await ensure_expiry_notifications(s, u, NOW)
            assert (await s.execute(select(Notification))).scalars().all() == []

    run(go())


def test_student_notifications_over_http_and_unpaid_students_can_still_read_them(env):
    soon = datetime.utcnow() + timedelta(days=2, hours=3)
    env.seed(student("soon@x.com", end=soon), student("late@x.com", end=datetime.utcnow() - timedelta(days=1), approved=True))
    soon_h, late_h = Env.auth("soon@x.com"), Env.auth("late@x.com")

    got = call(env, "GET", "/notifications/me", soon_h).json()
    assert got["unread"] == 1 and got["items"][0]["kind"] == "expiring" and got["items"][0]["read"] is False
    assert call(env, "GET", "/notifications/me", soon_h).json()["unread"] == 1  # still one, not two

    late = call(env, "GET", "/notifications/me", late_h).json()  # locked out of content, but can read the renewal message
    assert late["items"][0]["kind"] == "expired"

    assert call(env, "POST", "/notifications/read-all", soon_h).status_code == 200
    assert call(env, "GET", "/notifications/me", soon_h).json()["unread"] == 0
    assert call(env, "GET", "/notifications/me").status_code == 401


def test_renewal_sends_a_receipt_notification(env):
    env.seed(make_admin(), student("kid@x.com"))
    sid = call(env, "GET", "/admin/students", Env.auth(ADMIN)).json()[0]["id"]
    call(env, "POST", f"/admin/students/{sid}/renew", Env.auth(ADMIN), {"days": 30})
    items = call(env, "GET", "/notifications/me", Env.auth("kid@x.com")).json()["items"]
    assert items[0]["kind"] == "renewed"


# ======================================================================= overview + students

def test_overview_bar_counts_each_student_once(env):
    now = datetime.utcnow()
    env.seed(
        make_admin(),
        student("a1@x.com", end=now + timedelta(days=20), batch="A"),
        student("a2@x.com", end=now + timedelta(days=20), batch="A"),
        student("soon@x.com", "Soon Kid", end=now + timedelta(days=3, hours=2), batch="A"),
        student("old@x.com", "Old Kid", end=now - timedelta(days=3), approved=True, batch="B"),
        student("fresh@x.com", "Fresh Kid", batch="B", created=now - timedelta(days=1)),
        student("ancient@x.com", batch="B", created=now - timedelta(days=90)),
        VideoLecture(lecture_no=1, topic="Motion", chapter="Ch1", subject=SubjectEnum.PHYSICS, youtube_url=YT, is_published=True),
        VideoLecture(lecture_no=2, topic="Hidden", chapter="Ch1", subject=SubjectEnum.PHYSICS, youtube_url=YT, is_published=False),
        Material(title="Sheet", chapter="Ch1", subject=SubjectEnum.CHEMISTRY, pdf_url=DRIVE, is_published=True),
    )
    data = call(env, "GET", "/admin/overview", Env.auth(ADMIN)).json()
    t = data["totals"]
    assert (t["students"], t["active"], t["expiring"], t["expired"], t["pending"], t["paid_now"]) == (6, 2, 1, 1, 2, 3)
    assert t["active"] + t["expiring"] + t["expired"] + t["pending"] == t["students"]
    assert data["new_this_week"] >= 1
    reasons = [(a["full_name"], a["reason"]) for a in data["attention"]]
    assert reasons == [("Soon Kid", "expiring"), ("Old Kid", "recently_expired"), ("Fresh Kid", "new_unpaid")]  # ancient signup not listed
    batches = {b["batch"]: b for b in data["batches"]}
    assert batches["A"] == {"batch": "A", "total": 3, "paid": 3, "expired": 0, "pending": 0}
    assert batches["B"] == {"batch": "B", "total": 3, "paid": 0, "expired": 1, "pending": 2}
    assert data["lectures"] == {"total": 2, "published": 1, "by_subject": {"PHYSICS": 1}}
    assert data["materials"]["published"] == 1 and data["ai"] == {"messages_7d": 0, "students_7d": 0}


def test_overview_counts_ai_use_and_money(env):
    kid = student("kid@x.com", end=datetime.utcnow() + timedelta(days=20))
    env.seed(make_admin(), kid)
    sid = str(kid.id)
    sess = ChatSession(id=uuid.uuid4(), user_id=kid.id, title="t", model="deepseek", created_at=datetime.utcnow(), updated_at=datetime.utcnow())
    env.seed(
        sess,
        ChatMessage(id=uuid.uuid4(), session_id=sess.id, role="user", content="q", created_at=datetime.utcnow()),
        ChatMessage(id=uuid.uuid4(), session_id=sess.id, role="assistant", content="a", created_at=datetime.utcnow()),
    )
    call(env, "POST", f"/admin/students/{sid}/renew", Env.auth(ADMIN), {"days": 30, "amount": 1500})
    data = call(env, "GET", "/admin/overview", Env.auth(ADMIN)).json()
    assert data["ai"] == {"messages_7d": 1, "students_7d": 1}
    assert data["collected_this_month"] == {"payments": 1, "amount": 1500, "amounts_recorded": 1}


def test_student_list_shows_status_and_progress_and_hides_admins(env):
    lec = VideoLecture(lecture_no=1, topic="Motion", chapter="Ch1", subject=SubjectEnum.PHYSICS, youtube_url=YT, is_published=True)
    lec2 = VideoLecture(lecture_no=2, topic="Force", chapter="Ch1", subject=SubjectEnum.PHYSICS, youtube_url=YT, is_published=True)
    kid = student("kid@x.com", "Kid", end=datetime.utcnow() + timedelta(days=10))
    env.seed(make_admin(), kid, lec, lec2)
    env.seed(LectureProgress(user_id=kid.id, lecture_id=str(lec.id), completed=True, position=10, duration=10, updated_at=datetime.utcnow()))
    rows = call(env, "GET", "/admin/students", Env.auth(ADMIN)).json()
    assert [r["email"] for r in rows] == ["kid@x.com"]  # the admin is not listed as a student
    assert rows[0]["completed_lectures"] == 1 and rows[0]["progress_percent"] == 50 and rows[0]["status"] == "active"
    assert rows[0]["last_active"]


def test_clicking_a_student_shows_the_progress_bar_data(env):
    p1 = VideoLecture(lecture_no=1, topic="Motion", chapter="Ch1", subject=SubjectEnum.PHYSICS, youtube_url=YT, is_published=True)
    p2 = VideoLecture(lecture_no=2, topic="Force", chapter="Ch1", subject=SubjectEnum.PHYSICS, youtube_url=YT, is_published=True)
    c1 = VideoLecture(lecture_no=1, topic="Bonds", chapter="Ch2", subject=SubjectEnum.CHEMISTRY, youtube_url=YT, is_published=True)
    hidden = VideoLecture(lecture_no=3, topic="Draft", chapter="Ch1", subject=SubjectEnum.PHYSICS, youtube_url=YT, is_published=False)
    kid = student("kid@x.com", "Kid", end=datetime.utcnow() + timedelta(days=10))
    env.seed(make_admin(), kid, p1, p2, c1, hidden)
    today = datetime.utcnow().date()
    env.seed(
        LectureProgress(user_id=kid.id, lecture_id=str(p1.id), completed=True, position=60, duration=60, updated_at=datetime.utcnow()),
        LectureProgress(user_id=kid.id, lecture_id=str(p2.id), completed=False, position=15, duration=60, updated_at=datetime.utcnow()),
        LectureProgress(user_id=kid.id, lecture_id=str(hidden.id), completed=True, position=1, duration=1, updated_at=datetime.utcnow()),
        StudyActivity(user_id=kid.id, day=today.isoformat()),
        StudyActivity(user_id=kid.id, day=(today - timedelta(days=1)).isoformat()),
    )
    d = call(env, "GET", f"/admin/students/{kid.id}", Env.auth(ADMIN)).json()
    pr = d["progress"]
    assert (pr["total_lectures"], pr["completed_lectures"], pr["percent"]) == (3, 1, 33)  # unpublished lecture does not count
    assert pr["streak"] == 2 and pr["active_days_28"] == 2
    phys = next(s for s in pr["subjects"] if s["subject"] == "PHYSICS")
    assert phys["percent"] == 50
    assert next(r for r in pr["recent"] if r["title"] == "Force")["watched_percent"] == 25
    assert d["student"]["progress_percent"] == 33 and d["payments"] == []
    assert call(env, "GET", f"/admin/students/{uuid.uuid4()}", Env.auth(ADMIN)).status_code == 404
    assert call(env, "GET", "/admin/students/not-a-uuid", Env.auth(ADMIN)).status_code == 400


def test_edit_revoke_and_delete_a_student(env):
    env.seed(make_admin(), student("kid@x.com", "Kid", end=datetime.utcnow() + timedelta(days=10)))
    admin = Env.auth(ADMIN)
    sid = call(env, "GET", "/admin/students", admin).json()[0]["id"]

    r = call(env, "PATCH", f"/admin/students/{sid}", admin, {"batch_no": " Batch 7 ", "school": "Dhaka College"})
    assert r.status_code == 200 and r.json()["batch_no"] == "Batch 7" and r.json()["school"] == "Dhaka College"
    assert call(env, "PATCH", f"/admin/students/{sid}", admin, {"full_name": "  "}).status_code == 422

    assert call(env, "POST", f"/admin/students/{sid}/revoke-access", admin).status_code == 200
    assert call(env, "GET", f"/admin/students/{sid}", admin).json()["student"]["status"] == "pending"

    assert call(env, "DELETE", f"/admin/students/{sid}", admin).status_code == 200
    assert call(env, "GET", "/admin/students", admin).json() == []


# ======================================================================= content

def test_materials_accept_only_drive_links(env):
    env.seed(make_admin())
    admin = Env.auth(ADMIN)
    body = {"title": "Sheet 1", "chapter": "Ch1", "subject": "Physics"}
    r = call(env, "POST", "/admin/materials", admin, {**body, "file_url": "https://example.com/a.pdf"})
    assert r.status_code == 422 and "Google Drive" in r.json()["detail"]
    r = call(env, "POST", "/admin/materials", admin, {**body, "file_url": DRIVE})
    assert r.status_code == 200 and r.json()["file_url"] == "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view"
    listed = call(env, "GET", "/admin/materials", admin).json()
    assert listed[0]["file_url"].endswith("/view") and listed[0]["is_published"] is True

    mid = listed[0]["id"]
    assert call(env, "PUT", f"/admin/materials/{mid}", admin, {"file_url": "https://evil.com/x"}).status_code == 422
    assert call(env, "PUT", f"/admin/materials/{mid}", admin, {"title": "Renamed"}).status_code == 200
    assert call(env, "PUT", f"/admin/materials/{mid}", admin, {"file_url": listed[0]["file_url"]}).status_code == 200


def test_an_old_uploaded_file_can_still_be_edited_without_a_new_link(env):
    old = Material(title="Old", chapter="C", subject=SubjectEnum.PHYSICS, pdf_url="https://edutrack-backend.onrender.com/static/materials/old.pdf", is_published=True)
    env.seed(make_admin(), old)
    r = call(env, "PUT", f"/admin/materials/{old.id}", Env.auth(ADMIN), {"title": "Old (fixed)", "file_url": old.pdf_url})
    assert r.status_code == 200


def test_unpublished_items_stay_visible_to_the_admin_and_can_be_published_again(env):
    env.seed(make_admin())
    admin = Env.auth(ADMIN)
    assert call(env, "POST", "/admin/lectures", admin, {"lecture_no": 1, "title": "Motion", "chapter": "Ch1", "subject": "Physics", "video_url": "https://vimeo.com/1"}).status_code == 422
    assert call(env, "POST", "/admin/lectures", admin, {"lecture_no": 1, "title": " ", "chapter": "Ch1", "subject": "Physics", "video_url": YT}).status_code == 422
    assert call(env, "POST", "/admin/lectures", admin, {"lecture_no": 1, "title": "Motion", "chapter": "Ch1", "subject": "Physics", "video_url": YT}).status_code == 200
    lid = call(env, "GET", "/admin/lectures", admin).json()[0]["id"]

    assert call(env, "PATCH", f"/admin/lectures/{lid}/toggle-publish", admin).json()["is_published"] is False
    listed = call(env, "GET", "/admin/lectures", admin).json()
    assert len(listed) == 1 and listed[0]["is_published"] is False  # the old code made it vanish here
    assert call(env, "PATCH", f"/admin/lectures/{lid}/toggle-publish", admin).json()["is_published"] is True


def test_lecture_order_tools(env):
    env.seed(make_admin())
    admin = Env.auth(ADMIN)
    for n, title in ((5, "A"), (9, "B"), (12, "C")):
        call(env, "POST", "/admin/lectures", admin, {"lecture_no": n, "title": title, "chapter": "Ch1", "subject": "Physics", "video_url": YT})
    rows = call(env, "GET", "/admin/lectures", admin).json()
    assert call(env, "POST", "/admin/lectures/swap-order", admin, {"lecture_id_1": rows[0]["id"], "lecture_id_2": rows[1]["id"]}).status_code == 200
    assert call(env, "POST", "/admin/lectures/normalize-order", admin, {"subject": "Physics", "chapter": "Ch1"}).status_code == 200
    assert [(r["title"], r["lecture_no"]) for r in call(env, "GET", "/admin/lectures", admin).json()] == [("B", 1), ("A", 2), ("C", 3)]
    assert call(env, "DELETE", f"/admin/lectures/{rows[2]['id']}", admin).status_code == 200


def test_notices(env):
    env.seed(make_admin(), student("paid@x.com", end=datetime.utcnow() + timedelta(days=9)))
    admin = Env.auth(ADMIN)
    assert call(env, "POST", "/admin/notices", admin, {"content": "   "}).status_code in (422,)
    assert call(env, "GET", "/academic/notice", Env.auth("paid@x.com")).json() is None
    n = call(env, "POST", "/admin/notices", admin, {"content": "Exam on Friday"})
    assert n.status_code == 201
    assert call(env, "GET", "/academic/notice", Env.auth("paid@x.com")).json()["content"] == "Exam on Friday"
    assert call(env, "DELETE", f"/admin/notices/{n.json()['id']}", admin).status_code == 200
    assert call(env, "GET", "/admin/notices", admin).json() == []
