"""
Mithril — Trust Scorer
===============================
Combines multiple signals into a single trust score with a
human-readable breakdown.  Pure function — no I/O, no Cognee calls.
"""

from .models import MemoryClaim, ContradictionResult, TrustScoreBreakdown
from .config import SOURCE_REPUTATION, DEFAULT_REPUTATION, WEIGHTS


def compute_trust_score(
    claim: MemoryClaim,
    contradiction: ContradictionResult,
    corroboration_count: int = 0,
) -> TrustScoreBreakdown:
    """
    Compute trust score from multiple signals.

    Parameters
    ----------
    claim : MemoryClaim
        The incoming memory claim.
    contradiction : ContradictionResult
        Result of contradiction check against existing memory.
    corroboration_count : int
        Number of independent sources that corroborate this claim.

    Returns
    -------
    TrustScoreBreakdown
        Score with each component and human-readable reasons.
    """
    reasons: list[str] = []

    # ── 1. Source reputation ─────────────────────────────────────
    source_key = claim.source.lower()
    source_rep = SOURCE_REPUTATION.get(source_key, DEFAULT_REPUTATION)
    reasons.append(f"Source '{claim.source}' reputation: {source_rep:.2f}")

    # ── 2. Contradiction penalty ─────────────────────────────────
    contradiction_penalty = 0.0
    if contradiction.found:
        contradiction_penalty = contradiction.contradiction_score
        reasons.append(
            f"Contradicts existing memory (score: {contradiction.contradiction_score:.2f})"
        )
    else:
        reasons.append("No contradictions found in verified memory")

    # ── 3. Corroboration bonus ───────────────────────────────────
    corroboration_bonus = min(corroboration_count * 0.1, 0.3)  # max 0.3
    if corroboration_count > 0:
        reasons.append(f"Corroborated by {corroboration_count} other source(s)")

    # ── 4. Freshness bonus ───────────────────────────────────────
    freshness_bonus = 0.05  # flat for now; can be extended with timestamp deltas

    # ── 5. Weighted combination ──────────────────────────────────
    # Source reputation is the base signal (0–1); bonuses and penalties adjust it.
    # Multiplying source_rep by WEIGHTS["source_reputation"] would cap scores near
    # 0.4 and make the demo thresholds unreachable for high-trust sources.
    final = (
        source_rep
        + corroboration_bonus * WEIGHTS["corroboration"]
        + freshness_bonus * WEIGHTS["freshness"]
        - contradiction_penalty * abs(WEIGHTS["contradiction"])
    )
    final = max(0.0, min(1.0, final))  # clamp to [0, 1]

    reasons.append(f"Final trust score: {final:.2f}")

    return TrustScoreBreakdown(
        source_reputation=source_rep,
        contradiction_penalty=contradiction_penalty,
        corroboration_bonus=corroboration_bonus,
        freshness_bonus=freshness_bonus,
        final_score=final,
        reasons=reasons,
    )
