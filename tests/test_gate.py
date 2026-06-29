"""
Tests for mithril.gate — master plan Section 7 thresholds.
"""

from mithril.gate import decide_admission
from mithril.models import AdmissionStatus, TrustScoreBreakdown


class TestDecideAdmission:
    def _make_score(self, final: float) -> TrustScoreBreakdown:
        return TrustScoreBreakdown(
            source_reputation=0.5,
            contradiction_penalty=0.0,
            corroboration_bonus=0.0,
            freshness_bonus=0.0,
            final_score=final,
            reasons=["Test"],
        )

    def test_accept_at_threshold(self):
        status, _ = decide_admission(self._make_score(0.85))
        assert status == AdmissionStatus.ACCEPT

    def test_warn_at_threshold(self):
        status, _ = decide_admission(self._make_score(0.60))
        assert status == AdmissionStatus.WARN

    def test_review_at_threshold(self):
        status, _ = decide_admission(self._make_score(0.40))
        assert status == AdmissionStatus.REVIEW

    def test_quarantine_at_threshold(self):
        status, _ = decide_admission(self._make_score(0.20))
        assert status == AdmissionStatus.QUARANTINE

    def test_reject_below_quarantine(self):
        status, _ = decide_admission(self._make_score(0.10))
        assert status == AdmissionStatus.REJECT

    def test_just_below_accept(self):
        status, _ = decide_admission(self._make_score(0.84))
        assert status == AdmissionStatus.WARN

    def test_perfect_score(self):
        status, _ = decide_admission(self._make_score(1.0))
        assert status == AdmissionStatus.ACCEPT
