"""
Mithril — Main Governance Class
=================================
The public API.  Chains memory analysis → trust scoring → admission gate →
Cognee storage (or quarantine) → audit logging.
"""

from __future__ import annotations

import logging

import cognee

from .audit import AuditLog
from .config import COGNEE_VERIFIED_DATASET
from .gate import decide_admission
from .memory_analysis import analyze_against_verified_memory
from .models import (
    AdmissionResult,
    AdmissionStatus,
    FirewallStats,
    MemoryClaim,
    RecallResult,
)
from .quarantine import QuarantineStore
from .reputation import ReputationStore
from .scorer import compute_trust_score
from .utils import extract_recall_texts

logger = logging.getLogger(__name__)


class Mithril:
    """Governance layer for Cognee memory."""

    def __init__(self) -> None:
        self.quarantine = QuarantineStore()
        self.audit = AuditLog()
        self.reputation = ReputationStore()

    async def setup(self) -> None:
        """Initialize SQLite stores."""
        await self.quarantine.setup()
        await self.audit.setup()
        await self.reputation.setup()

    async def remember(
        self,
        text: str,
        source: str,
        author: str = "unknown",
        metadata: dict | None = None,
    ) -> AdmissionResult:
        """Submit a memory claim through the full governance pipeline."""
        claim = MemoryClaim(
            text=text,
            source=source,
            author=author,
            metadata=metadata or {},
        )

        live_reputation = await self.reputation.get(source)
        contradiction, corroboration_count = await analyze_against_verified_memory(
            claim.text
        )
        trust_score = compute_trust_score(
            claim,
            contradiction,
            corroboration_count,
            live_reputation=live_reputation,
        )
        status, decision_reason = decide_admission(trust_score)

        result = AdmissionResult(
            claim=claim,
            trust_breakdown=trust_score,
            status=status,
            decision_reason=decision_reason,
        )

        await self._apply_decision(result, text, source, status)
        await self.audit.log(result)

        # Adapt the source's reputation based on how this claim landed.
        new_rep = await self.reputation.update_on_decision(
            source=source,
            status=result.status.value,
            contradiction_found=contradiction.found,
        )
        if abs(new_rep - live_reputation) >= 0.005:
            arrow = "↓" if new_rep < live_reputation else "↑"
            result.trust_breakdown.reasons.append(
                f"Source reputation {arrow} {live_reputation:.2f} → {new_rep:.2f}"
            )

        return result

    async def _apply_decision(
        self,
        result: AdmissionResult,
        text: str,
        source: str,
        status: AdmissionStatus,
    ) -> None:
        if status in (AdmissionStatus.ACCEPT, AdmissionStatus.WARN):
            node_sets = ["verified", source.lower().replace(" ", "_")]
            if status == AdmissionStatus.WARN:
                node_sets.append("low_confidence")

            try:
                await cognee.remember(
                    data=text,
                    dataset_name=COGNEE_VERIFIED_DATASET,
                    node_set=node_sets,
                )
                result.cognee_dataset = COGNEE_VERIFIED_DATASET
            except Exception as exc:
                logger.error("Cognee remember failed: %s", exc)
                result.status = AdmissionStatus.QUARANTINE
                result.decision_reason = (
                    f"Cognee storage failed — quarantined for safety ({exc})"
                )
                await self.quarantine.store(result)
            return

        if status in (
            AdmissionStatus.QUARANTINE,
            AdmissionStatus.REVIEW,
            AdmissionStatus.REJECT,
        ):
            await self.quarantine.store(result)

    async def recall(self, query: str) -> str:
        """Query only verified memory (NodeSet filtered)."""
        result = await self.recall_with_metadata(query)
        return result.answer

    async def recall_with_metadata(self, query: str) -> RecallResult:
        """Query verified memory and return answer plus audit context."""
        audit = await self.audit.get_all()
        blocked_count = sum(
            1 for row in audit if row["status"] in ("quarantine", "reject", "review")
        )

        try:
            results = await cognee.recall(
                query_text=query,
                datasets=[COGNEE_VERIFIED_DATASET],
                node_name=["verified"],
            )
        except Exception as exc:
            logger.error("Cognee recall failed: %s", exc)
            return RecallResult(
                query=query,
                answer=f"Recall failed: {exc}",
                candidate_count=0,
                blocked_count=blocked_count,
            )

        parts = extract_recall_texts(results)
        answer = (
            "\n".join(parts)
            if parts
            else "No verified memories found for this query."
        )
        return RecallResult(
            query=query,
            answer=answer,
            candidate_count=len(parts),
            blocked_count=blocked_count,
        )

    async def improve(self) -> None:
        """Run Cognee graph enrichment on verified memories."""
        await cognee.improve(dataset=COGNEE_VERIFIED_DATASET)

    async def get_audit_trail(self) -> list[dict]:
        return await self.audit.get_all()

    async def get_quarantine(self) -> list[dict]:
        return await self.quarantine.get_all()

    async def get_reputation(self) -> list[dict]:
        """Live source reputation with priors and deltas (for the dashboard)."""
        return await self.reputation.get_all()

    async def get_stats(self) -> FirewallStats:
        """Aggregate metrics for dashboards."""
        audit = await self.audit.get_all()
        if not audit:
            return FirewallStats(
                total_evaluated=0,
                accepted=0,
                warned=0,
                reviewed=0,
                quarantined=0,
                rejected=0,
                entered_cognee=0,
                blocked=0,
                block_rate=0.0,
                avg_trust_score=0.0,
            )

        counts = {s: 0 for s in ("accept", "warn", "review", "quarantine", "reject")}
        for row in audit:
            counts[row["status"]] = counts.get(row["status"], 0) + 1

        entered = sum(1 for row in audit if row.get("entered_cognee"))
        blocked = counts["quarantine"] + counts["reject"] + counts["review"]
        total = len(audit)
        avg = sum(row["trust_score"] for row in audit) / total

        return FirewallStats(
            total_evaluated=total,
            accepted=counts["accept"],
            warned=counts["warn"],
            reviewed=counts["review"],
            quarantined=counts["quarantine"],
            rejected=counts["reject"],
            entered_cognee=entered,
            blocked=blocked,
            block_rate=round(blocked / total, 3) if total else 0.0,
            avg_trust_score=round(avg, 3),
        )

    async def reset(self) -> None:
        """Reset Cognee memory and local SQLite stores."""
        await cognee.forget(everything=True)

        import aiosqlite
        from .audit import DB_PATH as A_DB
        from .quarantine import DB_PATH as Q_DB

        async with aiosqlite.connect(Q_DB) as db:
            await db.execute("DELETE FROM quarantine")
            await db.commit()
        async with aiosqlite.connect(A_DB) as db:
            await db.execute("DELETE FROM audit_log")
            await db.commit()

        await self.reputation.reset()
        await self.setup()
