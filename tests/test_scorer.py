"""
Tests for mithril.scorer
=================================
Unit tests for the trust score computation engine.
These are pure-function tests — no Cognee, no I/O.
"""

import pytest
from mithril.models import MemoryClaim, ContradictionResult
from mithril.scorer import compute_trust_score


class TestComputeTrustScore:
    """Tests for compute_trust_score()."""

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

    # ── Source reputation tests ──────────────────────────────────

    def test_high_trust_source_scores_high(self):
        """Security Policy (0.98) should produce a high score."""
        result = compute_trust_score(
            self._make_claim("Security Policy"),
            self._no_contradiction(),
        )
        assert result.final_score >= 0.85
        assert result.source_reputation == 0.98

    def test_low_trust_source_scores_low(self):
        """Unknown Agent (0.30) should produce a low score."""
        result = compute_trust_score(
            self._make_claim("Unknown Agent"),
            self._no_contradiction(),
        )
        assert result.final_score < 0.40
        assert result.source_reputation == 0.30

    def test_unknown_source_uses_default(self):
        """An unrecognized source should use DEFAULT_REPUTATION (0.35)."""
        result = compute_trust_score(
            self._make_claim("Random Forum Post"),
            self._no_contradiction(),
        )
        assert result.source_reputation == 0.35

    # ── Contradiction penalty tests ──────────────────────────────

    def test_contradiction_lowers_score(self):
        """A contradiction should lower the final score."""
        no_contra = compute_trust_score(
            self._make_claim("Slack"),
            self._no_contradiction(),
        )
        with_contra = compute_trust_score(
            self._make_claim("Slack"),
            self._with_contradiction(0.8),
        )
        assert with_contra.final_score < no_contra.final_score

    def test_strong_contradiction_penalty(self):
        """A strong contradiction (1.0) on a low-trust source should give very low score."""
        result = compute_trust_score(
            self._make_claim("Unknown Agent"),
            self._with_contradiction(1.0),
        )
        assert result.final_score < 0.20

    # ── Corroboration bonus tests ────────────────────────────────

    def test_corroboration_increases_score(self):
        """Corroboration from multiple sources should increase the score."""
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

    def test_corroboration_caps_at_three(self):
        """Corroboration bonus should cap at 0.3 (3 sources × 0.1)."""
        result_3 = compute_trust_score(
            self._make_claim("Email"),
            self._no_contradiction(),
            corroboration_count=3,
        )
        result_10 = compute_trust_score(
            self._make_claim("Email"),
            self._no_contradiction(),
            corroboration_count=10,
        )
        assert result_3.final_score == result_10.final_score

    # ── Score clamping tests ─────────────────────────────────────

    def test_score_never_exceeds_one(self):
        """Score should be clamped to 1.0 max."""
        result = compute_trust_score(
            self._make_claim("Security Policy"),
            self._no_contradiction(),
            corroboration_count=10,
        )
        assert result.final_score <= 1.0

    def test_score_never_below_zero(self):
        """Score should be clamped to 0.0 min."""
        result = compute_trust_score(
            self._make_claim("Untrusted"),
            self._with_contradiction(1.0),
        )
        assert result.final_score >= 0.0

    # ── Reasons / explainability tests ───────────────────────────

    def test_reasons_include_source(self):
        """Reasons list should mention the source."""
        result = compute_trust_score(
            self._make_claim("Slack"),
            self._no_contradiction(),
        )
        assert any("Slack" in r for r in result.reasons)

    def test_reasons_include_contradiction(self):
        """Reasons list should mention contradiction when found."""
        result = compute_trust_score(
            self._make_claim("Slack"),
            self._with_contradiction(0.7),
        )
        assert any("Contradicts" in r for r in result.reasons)

    def test_reasons_include_final_score(self):
        """Reasons list should include the final score."""
        result = compute_trust_score(
            self._make_claim("Slack"),
            self._no_contradiction(),
        )
        assert any("Final trust score" in r for r in result.reasons)

    # ── Demo scenario scores (master plan Section 2) ─────────────

    def test_demo_slack_md5_attack_score(self):
        """Slack + strong contradiction should land in quarantine range (~0.27)."""
        result = compute_trust_score(
            self._make_claim("Slack"),
            self._with_contradiction(0.85),
        )
        assert 0.20 <= result.final_score < 0.40

    def test_demo_security_policy_seed_accepted(self):
        """High-trust seed policies must reach the accept threshold."""
        result = compute_trust_score(
            self._make_claim("Security Policy"),
            self._no_contradiction(),
        )
        assert result.final_score >= 0.85
