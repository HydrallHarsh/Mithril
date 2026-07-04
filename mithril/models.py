"""
Mithril — Data Models
=============================
All shared dataclasses and enums used across the firewall pipeline.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Optional


class AdmissionStatus(str, Enum):
    """Decision outcome from the admission gate."""
    ACCEPT = "accept"
    WARN = "warn"
    REVIEW = "review"
    QUARANTINE = "quarantine"
    REJECT = "reject"


@dataclass
class MemoryClaim:
    """A piece of information submitted to the firewall for evaluation."""
    text: str
    source: str                                    # e.g. "Slack", "Security Policy"
    author: Optional[str] = None
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: dict = field(default_factory=dict)


@dataclass
class ContradictionResult:
    """Result of checking a claim against existing verified memory."""
    found: bool
    contradicting_text: Optional[str] = None
    contradiction_score: float = 0.0               # 0 = no conflict, 1 = direct contradiction


@dataclass
class TrustScoreBreakdown:
    """Explainable trust score with individual component values."""
    source_reputation: float
    contradiction_penalty: float
    corroboration_bonus: float
    freshness_bonus: float
    final_score: float
    reasons: list[str]
    source_component: float = 0.0
    corroboration_component: float = 0.0
    freshness_component: float = 0.0
    contradiction_component: float = 0.0
    content_danger_penalty: float = 0.0
    content_danger_component: float = 0.0
    raw_weighted_score: float = 0.0


@dataclass
class RecallResult:
    """Verified-memory query result with provenance metadata."""
    query: str
    answer: str
    candidate_count: int
    blocked_count: int


@dataclass
class FirewallStats:
    """Aggregate metrics for dashboard / API."""
    total_evaluated: int
    accepted: int
    warned: int
    reviewed: int
    quarantined: int
    rejected: int
    entered_cognee: int
    blocked: int
    block_rate: float
    avg_trust_score: float


@dataclass
class AdmissionResult:
    """Final decision from the admission gate, including full provenance."""
    claim: MemoryClaim
    trust_breakdown: TrustScoreBreakdown
    status: AdmissionStatus
    decision_reason: str
    cognee_dataset: Optional[str] = None           # Set if claim was stored in Cognee
    redacted_secrets: list[str] = field(default_factory=list)  # secret kinds scrubbed pre-storage
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
