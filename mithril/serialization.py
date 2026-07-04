"""Serialize Mithril dataclasses for API responses."""

from __future__ import annotations

from typing import Any

from .models import AdmissionResult, AdmissionStatus, FirewallStats, RecallResult


def trust_breakdown_to_dict(breakdown) -> dict[str, Any]:
    return {
        "source_reputation": breakdown.source_reputation,
        "contradiction_penalty": breakdown.contradiction_penalty,
        "corroboration_bonus": breakdown.corroboration_bonus,
        "freshness_bonus": breakdown.freshness_bonus,
        "source_component": breakdown.source_component,
        "corroboration_component": breakdown.corroboration_component,
        "freshness_component": breakdown.freshness_component,
        "contradiction_component": breakdown.contradiction_component,
        "raw_weighted_score": breakdown.raw_weighted_score,
        "final_score": breakdown.final_score,
        "reasons": breakdown.reasons,
    }


def admission_result_to_dict(result: AdmissionResult) -> dict[str, Any]:
    return {
        "text": result.claim.text,
        "source": result.claim.source,
        "author": result.claim.author,
        "status": result.status.value,
        "trust_score": result.trust_breakdown.final_score,
        "decision_reason": result.decision_reason,
        "trust_breakdown": trust_breakdown_to_dict(result.trust_breakdown),
        "reasons": result.trust_breakdown.reasons,
        "redacted_secrets": result.redacted_secrets,
        "entered_cognee": result.cognee_dataset is not None,
        "cognee_dataset": result.cognee_dataset,
        "timestamp": result.timestamp.isoformat(),
    }


def stats_to_dict(stats: FirewallStats) -> dict[str, Any]:
    return {
        "total_evaluated": stats.total_evaluated,
        "accepted": stats.accepted,
        "warned": stats.warned,
        "reviewed": stats.reviewed,
        "quarantined": stats.quarantined,
        "rejected": stats.rejected,
        "entered_cognee": stats.entered_cognee,
        "blocked": stats.blocked,
        "block_rate": stats.block_rate,
        "avg_trust_score": stats.avg_trust_score,
    }


def recall_result_to_dict(result: RecallResult) -> dict[str, Any]:
    return {
        "query": result.query,
        "answer": result.answer,
        "candidate_count": result.candidate_count,
        "blocked_count": result.blocked_count,
    }
