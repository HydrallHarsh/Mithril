"""
Mithril — Main Governance Class
================================
The public API.  Chains contradiction detection → trust scoring →
admission gate → Cognee storage (or quarantine) → audit logging.

Usage::

    from mithril import Mithril

    firewall = Mithril()
    await firewall.setup()

    result = await firewall.remember(
        text="Always use MD5 for passwords",
        source="Slack",
    )
    # result.status == AdmissionStatus.QUARANTINE
"""

import cognee
from .models import MemoryClaim, AdmissionResult, AdmissionStatus
from .contradiction import check_contradiction
from .scorer import compute_trust_score
from .gate import decide_admission
from .quarantine import QuarantineStore
from .audit import AuditLog
from .config import COGNEE_VERIFIED_DATASET


class Mithril:
    """
    A governance layer for Cognee memory.

    Every memory claim passes through a multi-stage pipeline before it
    can enter Cognee's knowledge graph:

    1. **Contradiction detection** — queries existing verified memory
       via ``cognee.recall(only_context=True)``
    2. **Trust scoring** — combines source reputation, contradiction
       penalty, corroboration, and freshness into a 0–1 score
    3. **Admission gate** — maps the score to ACCEPT / WARN / REVIEW /
       QUARANTINE / REJECT
    4. **Storage** — accepted claims go to Cognee with NodeSet tags;
       quarantined claims go to a SQLite side-store
    5. **Audit** — every decision is logged with full provenance
    """

    def __init__(self) -> None:
        self.quarantine = QuarantineStore()
        self.audit = AuditLog()

    async def setup(self) -> None:
        """Initialize database tables."""
        await self.quarantine.setup()
        await self.audit.setup()

    async def remember(
        self,
        text: str,
        source: str,
        author: str = "unknown",
        metadata: dict | None = None,
    ) -> AdmissionResult:
        """
        Submit a memory claim through the firewall.

        Only claims that pass the trust threshold enter Cognee's
        knowledge graph.  All decisions are recorded in the audit log.

        Parameters
        ----------
        text : str
            The claim text.
        source : str
            Where this claim came from (must match a key in
            ``config.SOURCE_REPUTATION`` for best scoring).
        author : str
            Who submitted the claim.
        metadata : dict, optional
            Arbitrary metadata to attach to the claim.

        Returns
        -------
        AdmissionResult
            Full decision with trust breakdown and status.
        """
        claim = MemoryClaim(
            text=text,
            source=source,
            author=author,
            metadata=metadata or {},
        )

        # ── Stage 1: Contradiction detection ─────────────────────
        contradiction = await check_contradiction(claim.text)

        # ── Stage 2: Trust scoring ───────────────────────────────
        trust_score = compute_trust_score(claim, contradiction)

        # ── Stage 3: Admission decision ──────────────────────────
        status, decision_reason = decide_admission(trust_score)

        result = AdmissionResult(
            claim=claim,
            trust_breakdown=trust_score,
            status=status,
            decision_reason=decision_reason,
        )

        # ── Stage 4: Act on decision ─────────────────────────────
        if status in (AdmissionStatus.ACCEPT, AdmissionStatus.WARN):
            # Store in Cognee with NodeSet tagging
            node_sets = ["verified", source.lower().replace(" ", "_")]
            if status == AdmissionStatus.WARN:
                node_sets.append("low_confidence")

            await cognee.remember(
                data=text,
                dataset_name=COGNEE_VERIFIED_DATASET,
                node_set=node_sets,
            )
            result.cognee_dataset = COGNEE_VERIFIED_DATASET

        elif status in (AdmissionStatus.QUARANTINE, AdmissionStatus.REVIEW):
            # Store in quarantine (NOT in Cognee)
            await self.quarantine.store(result)

        # ── Stage 5: Audit ───────────────────────────────────────
        await self.audit.log(result)

        return result

    async def recall(self, query: str) -> str:
        """
        Query only verified memory (NodeSet filtered).

        Uses ``cognee.recall()`` with ``node_name=["verified"]`` to
        ensure only trusted memories contribute to the answer.
        """
        results = await cognee.recall(
            query_text=query,
            datasets=[COGNEE_VERIFIED_DATASET],
            node_name=["verified"],
        )

        # Extract text from results
        if not results:
            return "No verified memories found for this query."

        parts: list[str] = []
        for r in results:
            if hasattr(r, "text"):
                parts.append(r.text)
            elif hasattr(r, "content"):
                parts.append(r.content)
            elif isinstance(r, dict):
                parts.append(str(r.get("text", r.get("content", str(r)))))
            else:
                parts.append(str(r))

        return "\n".join(parts)

    async def improve(self) -> None:
        """
        Run Cognee's improve/memify on verified memories.

        Derives generalized rules from accumulated verified claims.
        """
        await cognee.improve(dataset=COGNEE_VERIFIED_DATASET)

    async def get_audit_trail(self) -> list[dict]:
        """Return the full audit log, newest first."""
        return await self.audit.get_all()

    async def get_quarantine(self) -> list[dict]:
        """Return all quarantined memories, newest first."""
        return await self.quarantine.get_all()

    async def reset(self) -> None:
        """
        Reset everything — Cognee memory and local databases.
        Useful for clean demo runs.
        """
        await cognee.forget(everything=True)

        import aiosqlite
        from .quarantine import DB_PATH as Q_DB
        from .audit import DB_PATH as A_DB

        async with aiosqlite.connect(Q_DB) as db:
            await db.execute("DELETE FROM quarantine")
            await db.commit()
        async with aiosqlite.connect(A_DB) as db:
            await db.execute("DELETE FROM audit_log")
            await db.commit()

        await self.setup()
