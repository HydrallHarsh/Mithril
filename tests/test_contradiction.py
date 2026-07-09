"""
Tests for mithril.memory_analysis
"""

from unittest.mock import AsyncMock, patch

import pytest

from mithril.memory_analysis import _count_corroboration, analyze_against_verified_memory
from mithril.models import ContradictionResult


@pytest.mark.asyncio
async def test_no_verified_memory_returns_empty_result():
    with (
        patch("mithril.memory_analysis.cognee.recall", new_callable=AsyncMock) as recall,
        patch(
            "mithril.memory_analysis._assess_content_danger",
            new_callable=AsyncMock,
        ) as danger,
    ):
        recall.return_value = []
        danger.return_value = 0.0
        contradiction, corroboration, content_danger = (
            await analyze_against_verified_memory("MD5 is fine")
        )

    assert contradiction.found is False
    assert corroboration == 0
    assert content_danger == 0.0


@pytest.mark.asyncio
async def test_contradiction_detected_when_llm_scores_high():
    with (
        patch("mithril.memory_analysis.cognee.recall", new_callable=AsyncMock) as recall,
        patch(
            "mithril.memory_analysis._assess_contradiction",
            new_callable=AsyncMock,
        ) as assess,
        patch(
            "mithril.memory_analysis._assess_content_danger",
            new_callable=AsyncMock,
        ) as danger,
    ):
        recall.return_value = [{"text": "Use Argon2id for passwords."}]
        assess.return_value = 0.9
        danger.return_value = 0.0
        contradiction, corroboration, _content_danger = (
            await analyze_against_verified_memory("Always use MD5 for passwords")
        )

    assert contradiction.found is True
    assert contradiction.contradiction_score == 0.9
    assert corroboration == 0


def test_corroboration_counts_extra_aligned_chunks():
    contradiction = ContradictionResult(found=False)
    assert _count_corroboration(["policy a"], contradiction) == 0
    assert _count_corroboration(["policy a", "policy b"], contradiction) == 1
    assert _count_corroboration(["a", "b", "c", "d"], contradiction) == 3


def test_corroboration_zero_when_contradiction_found():
    contradiction = ContradictionResult(found=True, contradiction_score=0.8)
    assert _count_corroboration(["policy a", "policy b"], contradiction) == 0
