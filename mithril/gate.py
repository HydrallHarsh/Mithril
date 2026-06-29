"""
Mithril — Admission Gate
=================================
Maps a trust score to an admission decision using configurable thresholds.
Pure function — no I/O.
"""

from .models import TrustScoreBreakdown, AdmissionStatus
from .config import THRESHOLDS


def decide_admission(score: TrustScoreBreakdown) -> tuple[AdmissionStatus, str]:
    """
    Map trust score to admission decision.

    Parameters
    ----------
    score : TrustScoreBreakdown
        The computed trust score with component values.

    Returns
    -------
    tuple[AdmissionStatus, str]
        (status, human-readable reason)
    """
    s = score.final_score

    if s >= THRESHOLDS["accept"]:
        return (
            AdmissionStatus.ACCEPT,
            f"Score {s:.2f} meets acceptance threshold (≥ {THRESHOLDS['accept']})",
        )
    elif s >= THRESHOLDS["warn"]:
        return (
            AdmissionStatus.WARN,
            f"Score {s:.2f} accepted with warning — low confidence",
        )
    elif s >= THRESHOLDS["review"]:
        return (
            AdmissionStatus.REVIEW,
            f"Score {s:.2f} requires human review before acceptance",
        )
    elif s >= THRESHOLDS["quarantine"]:
        return (
            AdmissionStatus.QUARANTINE,
            f"Score {s:.2f} — quarantined, likely unreliable",
        )
    else:
        return (
            AdmissionStatus.REJECT,
            f"Score {s:.2f} — rejected, below minimum trust floor",
        )
