"""
Tests for mithril.ratelimit — the app-level LLM budget limiter.

Uses an injectable monotonic clock so the sliding window is deterministic
(no real sleeping, no wall-clock flakiness).
"""

import pytest

from mithril.ratelimit import (
    RateLimitedError,
    SlidingWindowLimiter,
    get_llm_limiter,
    reset_limiters,
)


class FakeClock:
    """Manually-advanced monotonic clock."""

    def __init__(self, start: float = 1000.0) -> None:
        self.now = start

    def __call__(self) -> float:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += seconds


async def test_allows_up_to_limit_then_refuses():
    clock = FakeClock()
    limiter = SlidingWindowLimiter(limit=3, interval=60, clock=clock)

    for _ in range(3):
        ok, retry_after = await limiter.try_acquire()
        assert ok is True
        assert retry_after == 0.0

    ok, retry_after = await limiter.try_acquire()
    assert ok is False
    assert retry_after > 0.0


async def test_refills_after_interval():
    clock = FakeClock()
    limiter = SlidingWindowLimiter(limit=2, interval=60, clock=clock)

    assert (await limiter.try_acquire())[0] is True
    assert (await limiter.try_acquire())[0] is True
    assert (await limiter.try_acquire())[0] is False

    # Advance past the window — the oldest grants age out.
    clock.advance(61)
    ok, retry_after = await limiter.try_acquire()
    assert ok is True
    assert retry_after == 0.0


async def test_retry_after_counts_down_as_window_slides():
    clock = FakeClock()
    limiter = SlidingWindowLimiter(limit=1, interval=60, clock=clock)

    assert (await limiter.try_acquire())[0] is True

    _, retry_after_early = await limiter.try_acquire()
    clock.advance(30)
    _, retry_after_late = await limiter.try_acquire()
    # Half the window elapsed — the wait should be roughly half as long.
    assert retry_after_late < retry_after_early
    assert retry_after_late == pytest.approx(30.0, abs=0.5)


async def test_acquire_or_raise_raises_when_exhausted():
    clock = FakeClock()
    limiter = SlidingWindowLimiter(limit=1, interval=60, clock=clock)

    await limiter.acquire_or_raise()  # first one is fine
    with pytest.raises(RateLimitedError) as excinfo:
        await limiter.acquire_or_raise()
    assert excinfo.value.retry_after > 0.0


async def test_snapshot_reports_remaining_and_reset():
    clock = FakeClock()
    limiter = SlidingWindowLimiter(limit=3, interval=60, clock=clock)

    snap = limiter.snapshot()
    assert snap["limit"] == 3
    assert snap["remaining"] == 3
    assert snap["reset_after"] == 0.0

    await limiter.try_acquire()
    await limiter.try_acquire()
    snap = limiter.snapshot()
    assert snap["remaining"] == 1

    await limiter.try_acquire()
    snap = limiter.snapshot()
    assert snap["remaining"] == 0
    assert snap["reset_after"] > 0.0


async def test_get_llm_limiter_reads_env(monkeypatch):
    monkeypatch.setenv("MITHRIL_LLM_RPM", "7")
    monkeypatch.setenv("MITHRIL_LLM_INTERVAL_SECONDS", "30")
    reset_limiters()
    try:
        limiter = get_llm_limiter()
        assert limiter.limit == 7
        assert limiter.interval == 30
        # Singleton: same instance on repeat calls.
        assert get_llm_limiter() is limiter
    finally:
        reset_limiters()


async def test_limit_floor_is_one():
    limiter = SlidingWindowLimiter(limit=0, interval=60)
    assert limiter.limit == 1
