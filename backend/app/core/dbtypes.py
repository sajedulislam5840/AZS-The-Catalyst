"""Column types shared by the models."""
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime
from sqlalchemy.types import TypeDecorator


def naive_utc(value: Optional[datetime]) -> Optional[datetime]:
    """Return the moment as a plain UTC datetime.

    The app works in naive UTC everywhere. Some columns in the live database were created as
    "timestamp with time zone" and come back timezone-aware, which Python refuses to compare
    with naive values. Converting once at the edge keeps the rest of the code simple.
    """
    if value is None or value.tzinfo is None:
        return value
    return value.astimezone(timezone.utc).replace(tzinfo=None)


class UtcDateTime(TypeDecorator):
    """A DateTime that always reads and writes naive UTC, whatever the database column is."""

    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value, dialect):
        return naive_utc(value)

    def process_result_value(self, value, dialect):
        return naive_utc(value)
