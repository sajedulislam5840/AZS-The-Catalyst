"""The live database returns some timestamps timezone-aware; the app must cope.

This failed in production with "can't compare offset-naive and offset-aware datetimes" on the
admin overview, which SQLite-based tests cannot show because SQLite never returns aware values.
"""
import os
from datetime import datetime, timedelta, timezone

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./test_unused.db")

from app.core.access import days_left, subscription_status  # noqa: E402
from app.core.dbtypes import UtcDateTime, naive_utc  # noqa: E402
from app.models.user import User  # noqa: E402

DHAKA = timezone(timedelta(hours=6))


def test_naive_utc_converts_aware_values_to_plain_utc():
    assert naive_utc(datetime(2026, 11, 8, 12, 0, tzinfo=timezone.utc)) == datetime(2026, 11, 8, 12, 0)
    assert naive_utc(datetime(2026, 11, 8, 18, 0, tzinfo=DHAKA)) == datetime(2026, 11, 8, 12, 0)
    assert naive_utc(datetime(2026, 11, 8, 12, 0)) == datetime(2026, 11, 8, 12, 0)
    assert naive_utc(None) is None
    assert naive_utc(datetime(2026, 11, 8, tzinfo=timezone.utc)).tzinfo is None


def test_column_type_returns_naive_utc_when_the_database_gives_aware_values():
    t = UtcDateTime()
    aware = datetime(2026, 11, 8, 18, 0, tzinfo=DHAKA)
    got = t.process_result_value(aware, None)
    assert got == datetime(2026, 11, 8, 12, 0) and got.tzinfo is None
    # comparing with a plain "now" no longer raises
    assert got < datetime(2026, 11, 9)
    assert t.process_bind_param(aware, None) == datetime(2026, 11, 8, 12, 0)
    assert t.process_result_value(None, None) is None


def test_subscription_state_works_with_aware_end_dates():
    now = datetime(2026, 11, 8, 12, 0)
    user = User(email="a@x.com", is_approved=True, subscription_end_date=datetime(2026, 11, 20, 12, 0, tzinfo=timezone.utc))
    assert subscription_status(user, now) == "active"
    assert days_left(user, now) == 13
    user.subscription_end_date = datetime(2026, 11, 10, 12, 0, tzinfo=timezone.utc)
    assert subscription_status(user, now) == "expiring"
    user.subscription_end_date = datetime(2026, 11, 1, 12, 0, tzinfo=timezone.utc)
    assert subscription_status(user, now) == "expired" and days_left(user, now) == 0
