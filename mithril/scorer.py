"""
Mithril — Trust Scorer
======================
Weighted formula::

    raw = source_rep * 0.40 + corroboration * 0.25 + freshness * 0.05
          - contradiction * 0.40
          - content_danger * 0.35

The content_danger signal catches inherently harmful claims (e.g.
"store passwords in plaintext") even when no contradicting memory exists.

Raw weighted sums are normalized to [0, 1] so the admission thresholds
(0.85 / 0.60 / 0.40 / 0.20) apply as documented.
"""

from __future__ import annotations

from datetime import datetime, timezone

from .config import DEFAULT_REPUTATION, SOURCE_REPUTATION, WEIGHTS
from .models import ContradictionResult, MemoryClaim, TrustScoreBreakdown

# Freshness decays linearly from MAX (age 0) to 0 over this window.
FRESHNESS_MAX_BONUS = 0.05
FRESHNESS_HALFLIFE_DAYS = 90.0

MAX_THEORETICAL_SCORE = (
    max(SOURCE_REPUTATION.values()) * WEIGHTS["source_reputation"]
    + 0.3 * WEIGHTS["corroboration"]
    + FRESHNESS_MAX_BONUS * WEIGHTS["freshness"]
)


def _freshness_bonus(timestamp: datetime | None) -> float:
    """Newer claims earn more freshness; decays to 0 over FRESHNESS_HALFLIFE_DAYS."""
    if timestamp is None:
        return FRESHNESS_MAX_BONUS
    now = datetime.now(timezone.utc)
    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=timezone.utc)
    age_days = max(0.0, (now - timestamp).total_seconds() / 86400.0)
    decay = max(0.0, 1.0 - age_days / FRESHNESS_HALFLIFE_DAYS)
    return round(FRESHNESS_MAX_BONUS * decay, 4)


def compute_trust_score(
    claim: MemoryClaim,
    contradiction: ContradictionResult,
    corroboration_count: int = 0,
    live_reputation: float | None = None,
    content_danger: float = 0.0,
) -> TrustScoreBreakdown:
    """
    Compute normalized trust score from weighted signals.

    ``live_reputation`` — when provided (by the firewall, from the adaptive
    ReputationStore) — overrides the static prior so the score reflects a
    source's *current* track record, not its seed value.

    ``content_danger`` — LLM-assessed inherent danger of the claim itself
    (0.0 = safe, 1.0 = actively malicious), independent of memory state.
    """
    reasons: list[str] = []

    source_key = claim.source.lower()
    if live_reputation is not None:
        source_rep = live_reputation
        reasons.append(f"Source '{claim.source}' live reputation: {source_rep:.2f}")
    else:
        source_rep = SOURCE_REPUTATION.get(source_key, DEFAULT_REPUTATION)
        reasons.append(f"Source '{claim.source}' reputation: {source_rep:.2f}")

    contradiction_penalty = 0.0
    if contradiction.found:
        contradiction_penalty = contradiction.contradiction_score
        reasons.append(
            f"Contradicts existing memory (score: {contradiction.contradiction_score:.2f})"
        )
    else:
        reasons.append("No contradictions found in verified memory")

    corroboration_bonus = min(corroboration_count * 0.1, 0.3)
    if corroboration_count > 0:
        reasons.append(f"Corroborated by {corroboration_count} other source(s)")

    # Content danger — independent of memory state
    content_danger_penalty = content_danger
    if content_danger > 0.3:
        reasons.append(
            f"Content flagged as dangerous (score: {content_danger:.2f})"
        )

    freshness_bonus = _freshness_bonus(claim.timestamp)
    if freshness_bonus < FRESHNESS_MAX_BONUS:
        reasons.append(f"Aged claim — freshness bonus reduced to {freshness_bonus:.3f}")

    source_component = source_rep * WEIGHTS["source_reputation"]
    corroboration_component = corroboration_bonus * WEIGHTS["corroboration"]
    freshness_component = freshness_bonus * WEIGHTS["freshness"]
    contradiction_component = contradiction_penalty * abs(WEIGHTS["contradiction"])
    content_danger_component = content_danger_penalty * abs(WEIGHTS.get("content_danger", 0.35))

    raw_weighted = (
        source_component
        + corroboration_component
        + freshness_component
        - contradiction_component
        - content_danger_component
    )
    raw_weighted = max(0.0, raw_weighted)
    final = min(1.0, raw_weighted / MAX_THEORETICAL_SCORE)

    reasons.append(
        f"Weighted sum: {raw_weighted:.2f} "
        f"(source {source_component:.2f}, corroboration +{corroboration_component:.2f}, "
        f"freshness +{freshness_component:.2f}, contradiction -{contradiction_component:.2f}, "
        f"content_danger -{content_danger_component:.2f})"
    )
    reasons.append(
        f"Normalized trust score: {final:.2f} "
        f"(÷ {MAX_THEORETICAL_SCORE:.2f} max theoretical)"
    )

    return TrustScoreBreakdown(
        source_reputation=source_rep,
        contradiction_penalty=contradiction_penalty,
        corroboration_bonus=corroboration_bonus,
        freshness_bonus=freshness_bonus,
        content_danger_penalty=content_danger_penalty,
        source_component=source_component,
        corroboration_component=corroboration_component,
        freshness_component=freshness_component,
        contradiction_component=contradiction_component,
        content_danger_component=content_danger_component,
        raw_weighted_score=raw_weighted,
        final_score=final,
        reasons=reasons,
    )
