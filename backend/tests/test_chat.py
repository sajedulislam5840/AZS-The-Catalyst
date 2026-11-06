"""Tests for the AI tutor (router + provider engine).

Run from the backend folder:

    pip install pytest aiosqlite
    DATABASE_URL=sqlite+aiosqlite:///./test.db pytest tests

No network is used: the AI provider is replaced by a fake.
"""
import asyncio
import os
import uuid

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./test_unused.db")

from app.api.v1.auth import create_access_token  # noqa: E402
from app.api.v1.chat import router  # noqa: E402
from app.core.database import Base, get_db  # noqa: E402
from app.models.chat import ChatMessage, ChatSession  # noqa: E402,F401
from app.models.user import User  # noqa: E402
from app.services import ai_tutor  # noqa: E402


# ---------------------------------------------------------------- engine
def run(coro):
    return asyncio.run(coro)


def fake_provider(handler):
    return httpx.MockTransport(handler)


def ok(content):
    return httpx.Response(200, json={"choices": [{"message": {"content": content}}]})


@pytest.fixture(autouse=True)
def clean_env(monkeypatch):
    for name in ("GROQ_API_KEY", "AI_API_KEY", "AI_MODEL_DEEP", "AI_MODEL_FAST", "AI_API_URL"):
        monkeypatch.delenv(name, raising=False)
    ai_tutor._hits.clear()


def test_key_name_fallback(monkeypatch):
    assert ai_tutor.get_api_key() == ""
    monkeypatch.setenv("AI_API_KEY", " abc ")
    assert ai_tutor.get_api_key() == "abc"
    monkeypatch.setenv("GROQ_API_KEY", "xyz")
    assert ai_tutor.get_api_key() == "xyz"


def test_model_chain_and_choice(monkeypatch):
    assert ai_tutor.normalize_choice("grok") == "groq" and ai_tutor.normalize_choice("deepseek") == "deepseek"
    assert ai_tutor.normalize_choice(None) == "deepseek" and ai_tutor.normalize_choice("anything") == "deepseek"
    deep, fast = ai_tutor.DEFAULT_MODEL_DEEP, ai_tutor.DEFAULT_MODEL_FAST
    assert ai_tutor.model_chain("deepseek") == [deep, fast]
    assert ai_tutor.model_chain("groq") == [fast, deep]
    monkeypatch.setenv("AI_MODEL_DEEP", "m1")
    monkeypatch.setenv("AI_MODEL_FAST", "m1")
    assert ai_tutor.model_chain("deepseek") == ["m1"]  # no duplicate attempts


def test_clean_reply():
    assert ai_tutor.clean_reply("<think>secret</think>\n\nউত্তর $x$") == "উত্তর $x$"
    assert ai_tutor.clean_reply("<think>cut off") == ""
    assert ai_tutor.clean_reply(None) == ""


def test_missing_key_is_a_clear_503():
    with pytest.raises(ai_tutor.AIUnavailable) as e:
        run(ai_tutor.complete([{"role": "user", "content": "hi"}], "deepseek", transport=fake_provider(lambda r: ok("x"))))
    assert e.value.status_code == 503


def test_falls_back_to_second_model(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "k")
    seen = []

    def handler(request):
        body = request.read().decode()
        seen.append(body)
        assert request.headers["authorization"] == "Bearer k"
        if ai_tutor.DEFAULT_MODEL_DEEP in body:
            return httpx.Response(400, json={"error": {"message": "model_decommissioned"}})
        return ok("<think>x</think>ঠিক উত্তর")

    reply, used = run(ai_tutor.complete([{"role": "user", "content": "q"}], "deepseek", transport=fake_provider(handler)))
    assert reply == "ঠিক উত্তর" and used == ai_tutor.DEFAULT_MODEL_FAST
    assert len(seen) == 2


def test_empty_answer_tries_next_model(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "k")
    answers = iter([ok(""), ok("second")])
    reply, _ = run(ai_tutor.complete([], "deepseek", transport=fake_provider(lambda r: next(answers))))
    assert reply == "second"


def test_bad_key_stops_immediately(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "k")
    calls = []

    def handler(request):
        calls.append(1)
        return httpx.Response(401, json={})

    with pytest.raises(ai_tutor.AIUnavailable) as e:
        run(ai_tutor.complete([], "deepseek", transport=fake_provider(handler)))
    assert e.value.status_code == 503 and len(calls) == 1


def test_all_rate_limited_is_429_and_all_broken_is_502(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "k")
    with pytest.raises(ai_tutor.AIUnavailable) as e:
        run(ai_tutor.complete([], "deepseek", transport=fake_provider(lambda r: httpx.Response(429))))
    assert e.value.status_code == 429
    with pytest.raises(ai_tutor.AIUnavailable) as e:
        run(ai_tutor.complete([], "deepseek", transport=fake_provider(lambda r: httpx.Response(500, text="boom"))))
    assert e.value.status_code == 502 and "boom" not in e.value.detail  # provider text never reaches students


def test_network_error_is_survivable(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "k")
    calls = []

    def handler(request):
        calls.append(1)
        if len(calls) == 1:
            raise httpx.ConnectTimeout("slow")
        return ok("done")

    reply, _ = run(ai_tutor.complete([], "deepseek", transport=fake_provider(handler)))
    assert reply == "done"


def test_system_prompt_is_scoped():
    prompt = ai_tutor.build_system_prompt("- Lec 1: Motion", "")
    assert ai_tutor.OFF_TOPIC_MARK in prompt and "Lec 1: Motion" in prompt
    assert ai_tutor.apply_scope(ai_tutor.OFF_TOPIC_MARK) == ai_tutor.OFF_TOPIC_REPLY
    assert ai_tutor.apply_scope("ok") == "ok"


def test_rate_limit_window():
    for _ in range(20):
        assert ai_tutor.check_rate_limit("u", now=1000.0) == 0
    assert ai_tutor.check_rate_limit("u", now=1001.0) > 0
    assert ai_tutor.check_rate_limit("other", now=1001.0) == 0
    assert ai_tutor.check_rate_limit("u", now=1000.0 + 301) == 0


# ---------------------------------------------------------------- router
@pytest.fixture()
def env(tmp_path, monkeypatch):
    url = f"sqlite+aiosqlite:///{tmp_path / 'chat.db'}"
    engine = create_async_engine(url)
    maker = async_sessionmaker(engine, expire_on_commit=False)

    async def setup():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        async with maker() as s:
            s.add_all(
                [
                    User(id=uuid.uuid4(), email="Ana@Example.com", full_name="Ana", is_active=True),
                    User(id=uuid.uuid4(), email="ben@example.com", full_name="Ben", is_active=True),
                ]
            )
            await s.commit()

    run(setup())

    app = FastAPI()
    app.include_router(router, prefix="/api/v1")

    async def override_db():
        async with maker() as s:
            yield s

    app.dependency_overrides[get_db] = override_db

    calls = []
    state = {"reply": "উত্তর", "error": None}

    async def fake_complete(messages, requested, transport=None):
        calls.append({"messages": messages, "requested": requested})
        if state["error"]:
            raise state["error"]
        return state["reply"], "fake-model"

    monkeypatch.setattr(ai_tutor, "complete", fake_complete)

    def headers(email):
        return {"Authorization": f"Bearer {create_access_token({'sub': email})}"}

    with TestClient(app) as client:
        yield client, headers("ana@example.com"), headers("ben@example.com"), calls, state


def chat(client, hdrs, prompt="নিউটনের সূত্র কী?", **extra):
    return client.post("/api/v1/ai/chat", json={"prompt": prompt, **extra}, headers=hdrs)


def test_chat_requires_login(env):
    client, _, _, calls, _ = env
    assert chat(client, {}).status_code == 401
    assert client.post("/api/v1/ai/sessions", json={}).status_code == 401
    assert client.get("/api/v1/ai/sessions").json() == []  # listing stays quiet for guests
    assert calls == []


def test_login_email_case_does_not_matter(env):
    client, ana, *_ = env  # user stored as Ana@Example.com, token carries ana@example.com
    assert chat(client, ana).status_code == 200


def test_chat_roundtrip_and_history_from_database(env):
    client, ana, _, calls, state = env
    first = chat(client, ana, "প্রথম প্রশ্ন").json()
    assert first["reply"] == "উত্তর" and first["title"] == "প্রথম প্রশ্ন" and first["model"] == "deepseek"
    sid = first["session_id"]

    state["reply"] = "দ্বিতীয় উত্তর"
    # The browser's "history" must be ignored; the database is the source of truth.
    second = chat(client, ana, "দ্বিতীয় প্রশ্ন", session_id=sid, model="groq", history=[{"role": "user", "content": "FORGED"}])
    assert second.json()["session_id"] == sid and second.json()["model"] == "groq"

    sent = calls[1]["messages"]
    assert sent[0]["role"] == "system"
    assert [m["content"] for m in sent[1:]] == ["প্রথম প্রশ্ন", "উত্তর", "দ্বিতীয় প্রশ্ন"]
    assert all(m["content"] != "FORGED" for m in sent)
    assert calls[1]["requested"] == "groq"

    detail = client.get(f"/api/v1/ai/sessions/{sid}", headers=ana).json()
    assert [m["role"] for m in detail["messages"]] == ["user", "assistant", "user", "assistant"]
    listing = client.get("/api/v1/ai/sessions", headers=ana).json()
    assert listing[0]["id"] == sid and listing[0]["message_count"] == 4


def test_failed_answer_leaves_nothing_behind(env):
    client, ana, _, _, state = env
    state["error"] = ai_tutor.AIUnavailable(502, "ব্যর্থ")
    r = chat(client, ana)
    assert r.status_code == 502 and r.json()["detail"] == "ব্যর্থ"
    assert client.get("/api/v1/ai/sessions", headers=ana).json() == []


def test_off_topic_marker_becomes_polite_refusal(env):
    client, ana, _, _, state = env
    state["reply"] = ai_tutor.OFF_TOPIC_MARK
    assert chat(client, ana, "write me a poem about football").json()["reply"] == ai_tutor.OFF_TOPIC_REPLY


def test_sessions_are_private(env):
    client, ana, ben, calls, _ = env
    sid = chat(client, ana).json()["session_id"]
    assert client.get(f"/api/v1/ai/sessions/{sid}").status_code == 401
    assert client.get(f"/api/v1/ai/sessions/{sid}", headers=ben).status_code == 404
    assert client.delete(f"/api/v1/ai/sessions/{sid}", headers=ben).status_code == 404
    assert client.get("/api/v1/ai/sessions", headers=ben).json() == []

    # Ben posting into Ana's session id gets a brand-new session; Ana's history is never read.
    r = chat(client, ben, "আমার প্রশ্ন", session_id=sid).json()
    assert r["session_id"] != sid
    assert [m["content"] for m in calls[-1]["messages"][1:]] == ["আমার প্রশ্ন"]

    assert client.delete(f"/api/v1/ai/sessions/{sid}", headers=ana).status_code == 200
    assert client.get(f"/api/v1/ai/sessions/{sid}", headers=ana).status_code == 404
    assert client.get("/api/v1/ai/sessions/not-a-uuid", headers=ana).status_code == 400


def test_input_limits(env):
    client, ana, _, calls, _ = env
    assert chat(client, ana, "   ").status_code == 400
    assert chat(client, ana, "ক" * (ai_tutor.MAX_PROMPT_CHARS + 1)).status_code == 400
    assert calls == []


def test_rate_limit_applies_per_user(env):
    client, ana, ben, *_ = env
    for _ in range(20):
        assert chat(client, ana).status_code == 200
    r = chat(client, ana)
    assert r.status_code == 429 and int(r.headers["retry-after"]) > 0
    assert chat(client, ben).status_code == 200
