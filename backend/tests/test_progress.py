"""Tests for the student progress API.

Run from the backend folder:

    pip install pytest aiosqlite
    DATABASE_URL=sqlite+aiosqlite:///./test.db pytest tests

The tests use a throw-away SQLite file and a tiny app that mounts only the progress router,
so they need no Postgres and never touch real data.
"""
import asyncio
import os
import uuid

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./test_unused.db")

from app.api.v1.auth import create_access_token  # noqa: E402
from app.api.v1.progress import router  # noqa: E402
from app.core.database import Base, get_db  # noqa: E402
from app.models.progress import LectureProgress, LectureNote, StudyActivity, StudyPlan  # noqa: E402,F401
from app.models.user import User  # noqa: E402


@pytest.fixture()
def env(tmp_path):
    url = f"sqlite+aiosqlite:///{tmp_path / 'progress.db'}"
    engine = create_async_engine(url)
    maker = async_sessionmaker(engine, expire_on_commit=False)

    async def setup():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        async with maker() as s:
            s.add_all(
                [
                    User(id=uuid.uuid4(), email="ana@example.com", full_name="Ana", is_active=True),
                    User(id=uuid.uuid4(), email="ben@example.com", full_name="Ben", is_active=True),
                ]
            )
            await s.commit()

    asyncio.run(setup())

    app = FastAPI()
    app.include_router(router, prefix="/api/v1")

    async def override_db():
        async with maker() as s:
            yield s

    app.dependency_overrides[get_db] = override_db

    def headers(email):
        return {"Authorization": f"Bearer {create_access_token({'sub': email})}"}

    with TestClient(app) as client:
        yield client, headers("ana@example.com"), headers("ben@example.com")


def test_requires_login(env):
    client, _, _ = env
    assert client.get("/api/v1/progress/me").status_code == 401
    r = client.get("/api/v1/progress/me", headers={"Authorization": "Bearer nonsense"})
    assert r.status_code == 401


def test_lecture_progress_lifecycle(env):
    client, ana, _ = env
    r = client.put("/api/v1/progress/lectures/lec-1", json={"position": 95, "duration": 600, "day": "2026-11-06"}, headers=ana)
    assert r.status_code == 200
    assert r.json()["completed"] is False and r.json()["position"] == 95

    r = client.put("/api/v1/progress/lectures/lec-1", json={"completed": True}, headers=ana)
    body = r.json()
    assert body["completed"] is True and body["completed_at"] and body["position"] == 95

    first_done = body["completed_at"]
    r = client.put("/api/v1/progress/lectures/lec-1", json={"completed": True, "position": 600}, headers=ana)
    assert r.json()["completed_at"] == first_done  # completing twice keeps the original time

    r = client.put("/api/v1/progress/lectures/lec-1", json={"completed": False}, headers=ana)
    assert r.json()["completed"] is False and r.json()["completed_at"] is None

    snap = client.get("/api/v1/progress/me", headers=ana).json()
    assert [l["lecture_id"] for l in snap["lectures"]] == ["lec-1"]
    assert snap["activity_days"] == ["2026-11-06"]


def test_activity_day_is_recorded_once(env):
    client, ana, _ = env
    for _ in range(3):
        client.put("/api/v1/progress/lectures/a", json={"position": 1, "day": "2026-11-06"}, headers=ana)
    client.put("/api/v1/progress/lectures/b", json={"position": 1, "day": "2026-11-07"}, headers=ana)
    assert client.get("/api/v1/progress/me", headers=ana).json()["activity_days"] == ["2026-11-06", "2026-11-07"]


def test_validation(env):
    client, ana, _ = env
    assert client.put("/api/v1/progress/lectures/x", json={"day": "06/11/2026"}, headers=ana).status_code == 422
    assert client.put("/api/v1/progress/lectures/x", json={"position": -5}, headers=ana).status_code == 422
    assert client.put("/api/v1/progress/notes/x", json={"content": "a" * 20001}, headers=ana).status_code == 422
    assert client.put("/api/v1/progress/lectures/" + "z" * 65, json={}, headers=ana).status_code == 422
    huge = client.put("/api/v1/progress/lectures/x", json={"position": 10**9}, headers=ana).json()
    assert huge["position"] == 86400


def test_notes_overwrite(env):
    client, ana, _ = env
    client.put("/api/v1/progress/notes/lec-1", json={"content": "v = u + at"}, headers=ana)
    client.put("/api/v1/progress/notes/lec-1", json={"content": "v = u + at\ns = ut + 1/2 at^2"}, headers=ana)
    notes = client.get("/api/v1/progress/me", headers=ana).json()["notes"]
    assert notes["lec-1"]["content"].endswith("at^2")
    assert len(notes) == 1


def test_plans_are_idempotent_and_private(env):
    client, ana, ben = env
    plan = {"id": "p1", "date_key": "2026-11-10", "title": "Revise kinematics", "time": "8:00 PM"}
    assert client.post("/api/v1/progress/plans", json=plan, headers=ana).status_code == 200
    assert client.post("/api/v1/progress/plans", json=plan, headers=ana).status_code == 200  # retried request
    plans = client.get("/api/v1/progress/me", headers=ana).json()["plans"]
    assert len(plans) == 1 and plans[0]["source"] == "manual"

    # Ben cannot take over or delete Ana's plan
    assert client.post("/api/v1/progress/plans", json=plan, headers=ben).status_code == 409
    client.delete("/api/v1/progress/plans/p1", headers=ben)
    assert len(client.get("/api/v1/progress/me", headers=ana).json()["plans"]) == 1

    assert client.delete("/api/v1/progress/plans/p1", headers=ana).status_code == 204
    assert client.delete("/api/v1/progress/plans/p1", headers=ana).status_code == 204  # replay is fine
    assert client.get("/api/v1/progress/me", headers=ana).json()["plans"] == []


def test_students_cannot_see_each_other(env):
    client, ana, ben = env
    client.put("/api/v1/progress/lectures/lec-1", json={"completed": True, "day": "2026-11-06"}, headers=ana)
    client.put("/api/v1/progress/notes/lec-1", json={"content": "private"}, headers=ana)
    snap = client.get("/api/v1/progress/me", headers=ben).json()
    assert snap == {"lectures": [], "notes": {}, "plans": [], "activity_days": []}


def test_import_only_fills_gaps_and_is_repeatable(env):
    client, ana, _ = env
    client.put("/api/v1/progress/notes/lec-1", json={"content": "server version"}, headers=ana)
    payload = {
        "watched": ["lec-1", "lec-2"],
        "notes": {"lec-1": "browser version", "lec-3": "only in browser", "lec-4": "   "},
        "plans": [{"id": "old-1", "date_key": "2026-11-12", "title": "Mock test"}],
        "day": "2026-11-06",
    }
    first = client.post("/api/v1/progress/import", json=payload, headers=ana).json()
    second = client.post("/api/v1/progress/import", json=payload, headers=ana).json()

    assert {l["lecture_id"] for l in first["lectures"] if l["completed"]} == {"lec-1", "lec-2"}
    assert first["notes"]["lec-1"]["content"] == "server version"  # not overwritten
    assert first["notes"]["lec-3"]["content"] == "only in browser"
    assert "lec-4" not in first["notes"]  # blank notes are skipped
    assert len(first["plans"]) == 1
    assert [l["lecture_id"] for l in first["lectures"]] == [l["lecture_id"] for l in second["lectures"]]
    assert len(second["plans"]) == 1
