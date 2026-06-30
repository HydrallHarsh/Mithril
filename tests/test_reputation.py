"""
Tests for mithril.reputation — adaptive source reputation.
"""

import pytest

import mithril.reputation as reputation_mod
from mithril.reputation import (
    PENALTY_RATE,
    REPUTATION_CEIL,
    REPUTATION_FLOOR,
    ReputationStore,
)


@pytest.fixture
async def store(tmp_path, monkeypatch):
    """Isolated reputation store backed by a temp DB."""
    monkeypatch.setattr(reputation_mod, "DB_PATH", str(tmp_path / "rep.db"))
    s = ReputationStore()
    await s.setup()
    return s


class TestReputationStore:
    async def test_seeds_priors(self, store):
        assert await store.get("Slack") == pytest.approx(0.60)
        assert await store.get("Security Policy") == pytest.approx(0.98)

    async def test_unknown_source_uses_default(self, store):
        assert await store.get("Some Rando") == pytest.approx(0.35)

    async def test_contradiction_drops_reputation(self, store):
        before = await store.get("Slack")
        after = await store.update_on_decision(
            "Slack", status="quarantine", contradiction_found=True
        )
        assert after < before

    async def test_trust_is_easy_to_lose_hard_to_earn(self, store):
        """One block should move reputation more than one accept."""
        drop = 0.60 - await store.update_on_decision(
            "Slack", status="quarantine", contradiction_found=True
        )
        await store.reset()
        gain = await store.update_on_decision(
            "Slack", status="accept", contradiction_found=False
        ) - 0.60
        assert drop > gain

    async def test_repeated_lies_collapse_trust(self, store):
        rep = None
        for _ in range(5):
            rep = await store.update_on_decision(
                "Slack", status="reject", contradiction_found=True
            )
        assert rep < 0.30
        assert rep >= REPUTATION_FLOOR

    async def test_reputation_stays_within_bounds(self, store):
        for _ in range(50):
            await store.update_on_decision(
                "Email", status="accept", contradiction_found=False
            )
        assert await store.get("Email") <= REPUTATION_CEIL

    async def test_review_status_does_not_move_reputation(self, store):
        before = await store.get("Slack")
        after = await store.update_on_decision(
            "Slack", status="review", contradiction_found=False
        )
        assert after == pytest.approx(before)

    async def test_get_all_reports_delta(self, store):
        await store.update_on_decision(
            "Slack", status="quarantine", contradiction_found=True
        )
        rows = {r["source"]: r for r in await store.get_all()}
        assert rows["slack"]["delta"] < 0
        assert rows["slack"]["block_count"] == 1

    async def test_reset_restores_priors(self, store):
        await store.update_on_decision(
            "Slack", status="reject", contradiction_found=True
        )
        await store.reset()
        assert await store.get("Slack") == pytest.approx(0.60)
