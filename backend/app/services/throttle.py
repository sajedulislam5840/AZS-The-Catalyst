"""A tiny in-memory sliding-window counter (fine for a single Render instance)."""
import time
from collections import defaultdict, deque
from typing import Deque, Dict, Optional


class Throttle:
    def __init__(self, limit: int, window_seconds: float):
        self.limit = limit
        self.window = window_seconds
        self._hits: Dict[str, Deque[float]] = defaultdict(deque)

    def _trim(self, key: str, now: float) -> Deque[float]:
        q = self._hits[key]
        while q and now - q[0] > self.window:
            q.popleft()
        return q

    def wait_seconds(self, key: str, now: Optional[float] = None) -> int:
        """0 if another attempt is allowed, otherwise seconds to wait."""
        now = time.monotonic() if now is None else now
        q = self._trim(key, now)
        if len(q) < self.limit:
            return 0
        return max(1, int(self.window - (now - q[0])) + 1)

    def record(self, key: str, now: Optional[float] = None) -> None:
        now = time.monotonic() if now is None else now
        self._trim(key, now).append(now)

    def clear(self, key: Optional[str] = None) -> None:
        if key is None:
            self._hits.clear()
        else:
            self._hits.pop(key, None)
