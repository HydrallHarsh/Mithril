"""
Tests for mithril.gate
================================
Unit tests for the admission gate decision logic.
Pure-function tests — no Cognee, no I/O.
"""

import pytest
from mithril.models import TrustScoreBreakdown, AdmissionStatus
from mithril.gate import decide_admission


class TestDecideAdmission:
    """Tests for decide_admission()."""

    def _make_score(self, final: float) -> TrustScoreBreakdown:
        """Helper to create a TrustScoreBreakdown with a specific final score."""
        return TrustScoreBreakdown(
            source_reputation=0.5,
            contradiction_penalty=0.0,
            corroboration_bonus=0.0,
            freshness_bonus=0.0,
            final_score=final,
            reasons=["Test"],
        )

    # ── Threshold boundary tests ─────────────────────────────────

    def test_accept_at_threshold(self):
        """Score exactly at accept threshold (0.85) should be ACCEPT."""
        status, _ = decide_admission(self._make_score(0.85))
        assert status == AdmissionStatus.ACCEPT

    def test_accept_above_threshold(self):
        """Score above 0.85 should be ACCEPT."""
        status, _ = decide_admission(self._make_score(0.90))
        assert status == AdmissionStatus.ACCEPT

    def test_warn_at_threshold(self):
        """Score exactly at warn threshold (0.60) should be WARN."""
        status, _ = decide_admission(self._make_score(0.60))
        assert status == AdmissionStatus.WARN

    def test_warn_mid_range(self):
        """Score in 0.60-0.84 range should be WARN."""
        status, _ = decide_admission(self._make_score(0.70))
        assert status == AdmissionStatus.WARN

    def test_review_at_threshold(self):
        """Score exactly at review threshold (0.40) should be REVIEW."""
        status, _ = decide_admission(self._make_score(0.40))
        assert status == AdmissionStatus.REVIEW

    def test_review_mid_range(self):
        """Score in 0.40-0.59 range should be REVIEW."""
        status, _ = decide_admission(self._make_score(0.50))
        assert status == AdmissionStatus.REVIEW

    def test_quarantine_at_threshold(self):
        """Score exactly at quarantine threshold (0.20) should be QUARANTINE."""
        status, _ = decide_admission(self._make_score(0.20))
        assert status == AdmissionStatus.QUARANTINE

    def test_quarantine_mid_range(self):
        """Score in 0.20-0.39 range should be QUARANTINE."""
        status, _ = decide_admission(self._make_score(0.30))
        assert status == AdmissionStatus.QUARANTINE

    def test_reject_below_threshold(self):
        """Score below 0.20 should be REJECT."""
        status, _ = decide_admission(self._make_score(0.10))
        assert status == AdmissionStatus.REJECT

    def test_reject_at_zero(self):
        """Score of 0.0 should be REJECT."""
        status, _ = decide_admission(self._make_score(0.0))
        assert status == AdmissionStatus.REJECT

    # ── Reason string tests ──────────────────────────────────────

    def test_accept_reason_includes_score(self):
        """Accept reason should mention the score."""
        _, reason = decide_admission(self._make_score(0.90))
        assert "0.90" in reason

    def test_reject_reason_includes_score(self):
        _, reason = decide_admission(self._make_score(0.10))
        assert "0.10" in reason
        assert "rejected" in reason.lower()

    def test_quarantine_reason_includes_score(self):
        """Quarantine reason should mention the score."""
        _, reason = decide_admission(self._make_score(0.25))
        assert "0.25" in reason
        assert "quarantined" in reason.lower()

    # ── Edge cases ───────────────────────────────────────────────

    def test_perfect_score(self):
        status, _ = decide_admission(self._make_score(1.0))
        assert status == AdmissionStatus.ACCEPT

    def test_just_below_accept(self):
        """Score at 0.84 should be WARN, not ACCEPT."""
        status, _ = decide_admission(self._make_score(0.84))
        assert status == AdmissionStatus.WARN

    def test_just_below_warn(self):
        """Score at 0.59 should be REVIEW, not WARN."""
        status, _ = decide_admission(self._make_score(0.59))
        assert status == AdmissionStatus.REVIEW
