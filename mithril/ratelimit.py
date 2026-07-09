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


class NoKeyAvailable(RateLimitedError):
    """Raised by :class:`KeyPool` when every key is out of budget / cooling."""


class KeyPool:
    """A pool of API keys, each with its own budget and cooldown.

    Rotation only raises the effective ceiling when the keys belong to
    *different* provider projects (Gemini enforces quota per project, not per
    key). Each key gets an independent :class:`SlidingWindowLimiter` plus a
    ``cooldown_until`` clock that a provider-side 429 can set.

    Usage::

        key = await pool.acquire()          # first key with budget, or raises
        try:
            ... call provider with key ...
        except ProviderRateLimit as e:
            pool.mark_rate_limited(key, e.retry_after)   # cool it, try next
    """

    def __init__(
        self,
        keys: list[str],
        rpm: int,
        interval: float,
        *,
        clock=time.monotonic,
    ) -> None:
        # De-dupe while preserving order; drop blanks.
        seen: dict[str, None] = {}
        for k in keys:
            k = (k or "").strip()
            if k and k not in seen:
                seen[k] = None
        self._keys: list[str] = list(seen) or [""]
        self._clock = clock
        self._limiters: dict[str, SlidingWindowLimiter] = {
            k: SlidingWindowLimiter(rpm, interval, clock=clock) for k in self._keys
        }
        self._cooldown_until: dict[str, float] = {k: 0.0 for k in self._keys}
        self._lock = asyncio.Lock()
        self._cursor = 0

    @property
    def size(self) -> int:
        return len(self._keys)

    def _key_wait(self, key: str, now: float) -> float:
        """Seconds until ``key`` could serve a request (0 = available now)."""
        cool = max(0.0, self._cooldown_until[key] - now)
        snap = self._limiters[key].snapshot()
        budget_wait = snap["reset_after"] if snap["remaining"] == 0 else 0.0
        return max(cool, budget_wait)

    async def acquire(self) -> str:
        """Reserve a slot on the first available key (round-robin start).

        Raises :class:`NoKeyAvailable` with the *shortest* wait if every key is
        cooling or out of budget.
        """
        async with self._lock:
            now = self._clock()
            n = len(self._keys)
            # Start from the rotating cursor for even spread across keys.
            for offset in range(n):
                key = self._keys[(self._cursor + offset) % n]
                if self._cooldown_until[key] > now:
                    continue
                ok, _ = await self._limiters[key].try_acquire()
                if ok:
                    self._cursor = (self._cursor + offset + 1) % n
                    return key
            # Nobody free — report the soonest recovery across all keys.
            soonest = min(self._key_wait(k, now) for k in self._keys)
            raise NoKeyAvailable(soonest)

    def mark_rate_limited(self, key: str, retry_after: float) -> None:
        """Cool a key after the provider signalled throttling."""
        if key in self._cooldown_until:
            wait = max(1.0, float(retry_after or 1.0))
            self._cooldown_until[key] = self._clock() + wait

    def snapshot(self) -> dict:
        """Aggregate budget across keys, plus per-key detail."""
        now = self._clock()
        per_key = []
        total_remaining = 0
        total_limit = 0
        for i, key in enumerate(self._keys):
            snap = self._limiters[key].snapshot()
            cooling = max(0.0, self._cooldown_until[key] - now)
            available = cooling == 0.0 and snap["remaining"] > 0
            total_limit += snap["limit"]
            if cooling == 0.0:
                total_remaining += snap["remaining"]
            per_key.append(
                {
                    "index": i,
                    "remaining": snap["remaining"],
                    "cooling_for": round(cooling, 2),
                    "available": available,
                }
            )
        soonest = min(self._key_wait(k, now) for k in self._keys)
        return {
            "keys": len(self._keys),
            "limit": total_limit,
            "remaining": total_remaining,
            "reset_after": round(soonest if total_remaining == 0 else 0.0, 2),
            "interval_seconds": self._limiters[self._keys[0]].interval,
            "per_key": per_key,
        }


_KEY_POOL: KeyPool | None = None


def _load_keys() -> list[str]:
    """Read the key pool from env: LLM_API_KEYS (csv) or LLM_API_KEY."""
    raw = os.getenv("LLM_API_KEYS", "").strip()
    if raw:
        return [k.strip() for k in raw.split(",") if k.strip()]
    single = os.getenv("LLM_API_KEY", "").strip()
    return [single] if single else [""]


def get_key_pool() -> KeyPool:
    """Process-wide singleton key pool for LLM calls."""
    global _KEY_POOL
    if _KEY_POOL is None:
        rpm = int(os.getenv("MITHRIL_LLM_RPM", "5") or "5")
        interval = float(os.getenv("MITHRIL_LLM_INTERVAL_SECONDS", "60") or "60")
        _KEY_POOL = KeyPool(_load_keys(), rpm, interval)
    return _KEY_POOL


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
    """Drop cached limiters/key pool (tests use this to pick up new env)."""
    global _KEY_POOL
    _LIMITERS.clear()
    _KEY_POOL = None
