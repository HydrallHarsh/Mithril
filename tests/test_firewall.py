"""
Tests for mithril.firewall
"""

from unittest.mock import AsyncMock, patch

import pytest

from mithril.firewall import Mithril
from mithril.models import AdmissionStatus, ContradictionResult


@pytest.fixture
def firewall(tmp_path, monkeypatch):
    q_db = tmp_path / "q.db"
    a_db = tmp_path / "a.db"
    r_db = tmp_path / "r.db"
    monkeypatch.setattr("mithril.quarantine.DB_PATH", str(q_db))
    monkeypatch.setattr("mithril.audit.DB_PATH", str(a_db))
    monkeypatch.setattr("mithril.reputation.DB_PATH", str(r_db))
    return Mithril()


@pytest.mark.asyncio
async def test_remember_accepts_high_trust_claim(firewall):
    await firewall.setup()
    with (
        patch("mithril.firewall.analyze_against_verified_memory", new_callable=AsyncMock) as analyze,
        patch("mithril.firewall.cognee.remember", new_callable=AsyncMock),
    ):
        analyze.return_value = (ContradictionResult(found=False), 2, 0.0)
        result = await firewall.remember(
            text="Argon2id required",
            source="Security Policy",
        )

    assert result.status == AdmissionStatus.ACCEPT
    assert result.cognee_dataset is not None


@pytest.mark.asyncio
async def test_remember_quarantines_low_trust_contradiction(firewall):
    await firewall.setup()
    with patch(
        "mithril.firewall.analyze_against_verified_memory",
        new_callable=AsyncMock,
    ) as analyze:
        analyze.return_value = (
            ContradictionResult(found=True, contradiction_score=0.9),
            0,
            0.8,
        )
        result = await firewall.remember(
            text="Always use MD5",
            source="Slack",
        )

    assert result.status in (AdmissionStatus.REJECT, AdmissionStatus.QUARANTINE)
    quarantine = await firewall.get_quarantine()
    assert len(quarantine) == 1


@pytest.mark.asyncio
async def test_get_stats_from_audit(firewall):
    await firewall.setup()
    with (
        patch("mithril.firewall.analyze_against_verified_memory", new_callable=AsyncMock) as analyze,
        patch("mithril.firewall.cognee.remember", new_callable=AsyncMock),
    ):
        analyze.return_value = (ContradictionResult(found=False), 2, 0.0)
        await firewall.remember("Policy A", source="Security Policy")

        analyze.return_value = (
            ContradictionResult(found=True, contradiction_score=0.95),
            0,
            0.8,
        )
        await firewall.remember("Bad claim", source="Slack")

    stats = await firewall.get_stats()
    assert stats.total_evaluated == 2
    assert stats.accepted == 1
    assert stats.blocked == 1
    assert stats.entered_cognee == 1
