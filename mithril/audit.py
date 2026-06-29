"""
Mithril — Audit Log
=============================
SQLite-backed full audit trail.  Every decision (accept, quarantine,
reject, etc.) is recorded with complete provenance.
"""

import aiosqlite
import json
from .models import AdmissionResult

DB_PATH = ".mithril_audit.db"


class AuditLog:
    """Async SQLite audit log — every firewall decision is recorded."""

    async def setup(self) -> None:
        """Create the audit_log table if it doesn't exist."""
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute("""
                CREATE TABLE IF NOT EXISTS audit_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    text TEXT NOT NULL,
                    source TEXT NOT NULL,
                    author TEXT,
                    trust_score REAL NOT NULL,
                    status TEXT NOT NULL,
                    decision_reason TEXT NOT NULL,
                    score_reasons TEXT NOT NULL,
                    entered_cognee INTEGER NOT NULL,
                    cognee_dataset TEXT,
                    timestamp TEXT NOT NULL
                )
            """)
            await db.commit()

    async def log(self, result: AdmissionResult) -> None:
        """Record a firewall decision in the audit log."""
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute("""
                INSERT INTO audit_log
                (text, source, author, trust_score, status, decision_reason,
                 score_reasons, entered_cognee, cognee_dataset, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                result.claim.text,
                result.claim.source,
                result.claim.author,
                result.trust_breakdown.final_score,
                result.status.value,
                result.decision_reason,
                json.dumps(result.trust_breakdown.reasons),
                1 if result.cognee_dataset else 0,
                result.cognee_dataset,
                result.timestamp.isoformat(),
            ))
            await db.commit()

    async def get_all(self) -> list[dict]:
        """Return all audit entries, newest first."""
        async with aiosqlite.connect(DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM audit_log ORDER BY timestamp DESC"
            ) as cursor:
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]
