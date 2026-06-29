"""
Tests for mithril.scorer — master plan Section 7 formula.
"""

import pytest

from mithril.config import WEIGHTS
from mithril.models import ContradictionResult, MemoryClaim
from mithril.scorer import MAX_THEORETICAL_SCORE, compute_trust_score


class TestComputeTrustScore:
    def _make_claim(self, source: str = "Security Policy") -> MemoryClaim:
        return MemoryClaim(text="Test claim", source=source)

    def _no_contradiction(self) -> ContradictionResult:
        return ContradictionResult(found=False)

    def _with_contradiction(self, score: float = 0.8) -> ContradictionResult:
        return ContradictionResult(
            found=True,
            contradicting_text="Existing policy says otherwise",
            contradiction_score=score,
        )

    def test_source_reputation_is_weighted_not_raw(self):
        """Slack (0.60) contributes 0.24 weighted, not 0.60 as final score."""
        result = compute_trust_score(
            self._make_claim("Slack"),
            self._no_contradiction(),
        )
        assert result.source_component == pytest.approx(0.60 * WEIGHTS["source_reputation"])
        assert result.raw_weighted_score < 0.60
        assert result.final_score < 0.60

    def test_high_trust_source_scores_in_warn_or_accept_band(self):
        """Single high-trust claim normalizes to ≥ 0.60 (master plan WARN tier)."""
        result = compute_trust_score(
            self._make_claim("Security Policy"),
            self._no_contradiction(),
        )
        assert result.final_score >= 0.60
        assert result.source_reputation == 0.98

    def test_corroborated_policy_reaches_accept_tier(self):
        """Corroborated Security Policy update should normalize ≥ 0.85."""
        result = compute_trust_score(
            self._make_claim("Security Policy"),
            self._no_contradiction(),
            corroboration_count=2,
        )
        assert result.final_score >= 0.85

    def test_low_trust_source_scores_low(self):
        result = compute_trust_score(
            self._make_claim("Unknown Agent"),
            self._no_contradiction(),
        )
        assert result.final_score < 0.40
        assert result.source_reputation == 0.30

    def test_contradiction_lowers_score(self):
        no_contra = compute_trust_score(
            self._make_claim("Slack"),
            self._no_contradiction(),
        )
        with_contra = compute_trust_score(
            self._make_claim("Slack"),
            self._with_contradiction(0.8),
        )
        assert with_contra.final_score < no_contra.final_score

    def test_strong_contradiction_on_slack_rejects(self):
        result = compute_trust_score(
            self._make_claim("Slack"),
            self._with_contradiction(0.85),
        )
        assert result.final_score < 0.20

    def test_corroboration_increases_score(self):
        no_corrob = compute_trust_score(
            self._make_claim("Email"),
            self._no_contradiction(),
            corroboration_count=0,
        )
        with_corrob = compute_trust_score(
            self._make_claim("Email"),
            self._no_contradiction(),
            corroboration_count=2,
        )
        assert with_corrob.final_score > no_corrob.final_score

    def test_score_never_exceeds_one(self):
        result = compute_trust_score(
            self._make_claim("Security Policy"),
            self._no_contradiction(),
            corroboration_count=10,
        )
        assert result.final_score <= 1.0

    def test_raw_weighted_capped_by_max_theoretical(self):
        result = compute_trust_score(
            self._make_claim("Security Policy"),
            self._no_contradiction(),
            corroboration_count=10,
        )
        assert result.raw_weighted_score <= MAX_THEORETICAL_SCORE + 0.001

    def test_normalized_formula_documented_in_reasons(self):
        result = compute_trust_score(
            self._make_claim("Slack"),
            self._no_contradiction(),
        )
        assert any("Normalized trust score" in r for r in result.reasons)
