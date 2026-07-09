"""
Mithril — Application-level LLM rate limiter
============================================
A tiny async sliding-window limiter that guards *our own* LLM calls so a
shared, low-quota key (e.g. a Google Gemini free-tier key at ~5 req/min) is
never blown by our contradiction/danger scoring calls.

Why this exists alongside Cognee's own limiter: Cognee throttles its internal
`cognify` calls, but it does not know about the two scoring calls Mithril makes
per `remember()`. This limiter accounts for *those* calls and, crucially, fails
*fast and loud* — raising :class:`RateLimitedError` with a ``retry_after`` — so
the API can return HTTP 429 and the UI can tell a public visitor exactly when to
try again, instead of silently degrading a score.

Configuration (env):
    MITHRIL_LLM_RPM               max requests per interval (default 5)
    MITHRIL_LLM_INTERVAL_SECONDS  interval length in seconds (default 60)

Keep ``MITHRIL_LLM_RPM`` a little below the real provider limit to leave
headroom for Cognee's own calls, which share the same upstream quota.
"""

from __future__ import annotations

import asyncio
import os
import time
from collections import deque


class RateLimitedError(Exception):
    """Raised when the shared LLM budget is exhausted.

    Attributes
    ----------
    retry_after : float
        Seconds until at least one request slot frees up.
    """

    def __init__(self, retry_after: float) -> None:
        self.retry_after = max(0.0, float(retry_after))
        super().__init__(
            f"LLM rate limit reached — retry in {self.retry_after:.1f}s"
        )


class SlidingWindowLimiter:
    """Async sliding-window rate limiter.

    Tracks the timestamps of the last ``limit`` grants within ``interval``
    seconds. ``try_acquire`` is non-blocking: it either records a grant and
    returns ``(True, 0.0)`` or refuses and returns ``(False, retry_after)``.

    A monotonic clock is injectable for deterministic tests.
    """

    def __init__(
        self,
        limit: int,
        interval: float,
        *,
        clock=time.monotonic,
    ) -> None:
        self.limit = max(1, int(limit))
        self.interval = max(0.001, float(interval))
        self._clock = clock
        self._events: deque[float] = deque()
        self._lock = asyncio.Lock()

    def _evict(self, now: float) -> None:
        cutoff = now - self.interval
        while self._events and self._events[0] <= cutoff:
            self._events.popleft()

    async def try_acquire(self) -> tuple[bool, float]:
        """Attempt to consume one slot without blocking.

        Returns
        -------
        tuple[bool, float]
            ``(True, 0.0)`` if granted, else ``(False, retry_after)`` where
            ``retry_after`` is the seconds until the oldest in-window grant
            ages out.
        """
        async with self._lock:
            now = self._clock()
            self._evict(now)
            if len(self._events) < self.limit:
                self._events.append(now)
                return True, 0.0
            # Oldest event ages out at events[0] + interval.
            retry_after = (self._events[0] + self.interval) - now
            return False, max(0.0, retry_after)

    async def acquire_or_raise(self) -> None:
        """Consume a slot or raise :class:`RateLimitedError`."""
        ok, retry_after = await self.try_acquire()
        if not ok:
            raise RateLimitedError(retry_after)

    def snapshot(self) -> dict:
        """Return current budget state for status endpoints (no mutation)."""
        now = self._clock()
        # Non-mutating eviction count for an accurate `remaining`.
        cutoff = now - self.interval
        active = [t for t in self._events if t > cutoff]
        remaining = max(0, self.limit - len(active))
        reset_after = 0.0
        if active and remaining == 0:
            reset_after = max(0.0, (active[0] + self.interval) - now)
        return {
            "limit": self.limit,
            "remaining": remaining,
            "reset_after": round(reset_after, 2),
            "interval_seconds": round(self.interval, 2),
        }


_LIMITERS: dict[str, SlidingWindowLimiter] = {}


def get_llm_limiter() -> SlidingWindowLimiter:
    """Return the process-wide singleton limiter for LLM calls.

    Reads ``MITHRIL_LLM_RPM`` / ``MITHRIL_LLM_INTERVAL_SECONDS`` on first use.
    """
    limiter = _LIMITERS.get("llm")
    if limiter is None:
        rpm = int(os.getenv("MITHRIL_LLM_RPM", "5") or "5")
        interval = float(
            os.getenv("MITHRIL_LLM_INTERVAL_SECONDS", "60") or "60"
        )
        limiter = SlidingWindowLimiter(rpm, interval)
        _LIMITERS["llm"] = limiter
    return limiter


def reset_limiters() -> None:
    """Drop cached limiters (used by tests to pick up new env / clocks)."""
    _LIMITERS.clear()
