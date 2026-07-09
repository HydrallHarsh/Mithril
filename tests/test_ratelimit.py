"""
Tests for mithril.ratelimit — the app-level LLM budget limiter.

Uses an injectable monotonic clock so the sliding window is deterministic
(no real sleeping, no wall-clock flakiness).
"""

import pytest

from mithril.ratelimit import (
    KeyPool,
    NoKeyAvailable,
    RateLimitedError,
    SlidingWindowLimiter,
    get_key_pool,
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


# ── KeyPool (multi-key rotation / failover) ──────────────────────────────


async def test_pool_dedupes_and_reports_size():
    pool = KeyPool(["k1", "k2", "k2", " ", "k3"], rpm=2, interval=60)
    assert pool.size == 3


async def test_pool_rotates_across_keys():
    clock = FakeClock()
    pool = KeyPool(["k1", "k2", "k3"], rpm=5, interval=60, clock=clock)
    got = [await pool.acquire() for _ in range(3)]
    # Round-robin start spreads the first three acquires across all keys.
    assert set(got) == {"k1", "k2", "k3"}


async def test_pool_multiplies_budget():
    clock = FakeClock()
    pool = KeyPool(["k1", "k2", "k3"], rpm=2, interval=60, clock=clock)
    # 3 keys x 2 rpm = 6 total acquires before exhaustion.
    for _ in range(6):
        await pool.acquire()
    with pytest.raises(NoKeyAvailable) as exc:
        await pool.acquire()
    assert exc.value.retry_after > 0.0


async def test_pool_fails_over_when_key_cooled():
    clock = FakeClock()
    pool = KeyPool(["k1", "k2"], rpm=5, interval=60, clock=clock)
    first = await pool.acquire()
    # Provider throttled `first` — cool it, next acquire must use the other key.
    pool.mark_rate_limited(first, retry_after=30)
    nxt = await pool.acquire()
    assert nxt != first


async def test_pool_all_cooled_raises_shortest_wait():
    clock = FakeClock()
    pool = KeyPool(["k1", "k2"], rpm=5, interval=60, clock=clock)
    pool.mark_rate_limited("k1", retry_after=40)
    pool.mark_rate_limited("k2", retry_after=10)
    with pytest.raises(NoKeyAvailable) as exc:
        await pool.acquire()
    # Should report the soonest-recovering key (~10s), not the longest.
    assert exc.value.retry_after == pytest.approx(10.0, abs=1.0)


async def test_pool_cooldown_expires():
    clock = FakeClock()
    pool = KeyPool(["k1"], rpm=5, interval=60, clock=clock)
    pool.mark_rate_limited("k1", retry_after=20)
    with pytest.raises(NoKeyAvailable):
        await pool.acquire()
    clock.advance(21)
    assert await pool.acquire() == "k1"


async def test_pool_snapshot_aggregates(monkeypatch):
    clock = FakeClock()
    pool = KeyPool(["k1", "k2", "k3"], rpm=2, interval=60, clock=clock)
    snap = pool.snapshot()
    assert snap["keys"] == 3
    assert snap["limit"] == 6
    assert snap["remaining"] == 6
    assert len(snap["per_key"]) == 3


async def test_get_key_pool_reads_env(monkeypatch):
    monkeypatch.setenv("LLM_API_KEYS", "a, b , c")
    monkeypatch.setenv("MITHRIL_LLM_RPM", "3")
    reset_limiters()
    try:
        pool = get_key_pool()
        assert pool.size == 3
        assert get_key_pool() is pool  # singleton
    finally:
        reset_limiters()


async def test_get_key_pool_falls_back_to_single_key(monkeypatch):
    monkeypatch.delenv("LLM_API_KEYS", raising=False)
    monkeypatch.setenv("LLM_API_KEY", "solo")
    reset_limiters()
    try:
        assert get_key_pool().size == 1
    finally:
        reset_limiters()


# ── _llm_score end-to-end key failover ───────────────────────────────────


async def test_llm_score_fails_over_across_keys(monkeypatch):
    """A 429 on the first two keys should transparently fall through to the 3rd."""
    from unittest.mock import AsyncMock, MagicMock, patch

    monkeypatch.setenv("LLM_API_KEYS", "keyA,keyB,keyC")
    monkeypatch.setenv("MITHRIL_LLM_RPM", "5")
    reset_limiters()

    import mithril.memory_analysis as ma

    tried: list[str] = []

    def fake_build_client(api_key):
        tried.append(api_key)
        client = MagicMock()

        async def create(**_kw):
            if api_key in ("keyA", "keyB"):
                raise Exception("429 RESOURCE_EXHAUSTED: quota exceeded")
            resp = MagicMock()
            resp.choices = [MagicMock()]
            resp.choices[0].message.content = "<score>0.9</score>"
            return resp

        client.chat.completions.create = AsyncMock(side_effect=create)
        return client

    try:
        with patch.object(ma, "_build_client", side_effect=fake_build_client):
            score = await ma._llm_score("prompt", fallback=0.0)
        assert score == 0.9
        assert tried == ["keyA", "keyB", "keyC"]
    finally:
        reset_limiters()


async def test_llm_score_raises_when_all_keys_throttled(monkeypatch):
    """When every key 429s, _llm_score surfaces RateLimitedError (→ HTTP 429)."""
    from unittest.mock import AsyncMock, MagicMock, patch

    monkeypatch.setenv("LLM_API_KEYS", "k1,k2")
    monkeypatch.setenv("MITHRIL_LLM_RPM", "5")
    reset_limiters()

    import mithril.memory_analysis as ma

    def fake_build_client(_api_key):
        client = MagicMock()

        async def create(**_kw):
            raise Exception("429 rate limit exceeded")

        client.chat.completions.create = AsyncMock(side_effect=create)
        return client

    try:
        with patch.object(ma, "_build_client", side_effect=fake_build_client):
            with pytest.raises(RateLimitedError):
                await ma._llm_score("prompt", fallback=0.0)
    finally:
        reset_limiters()
