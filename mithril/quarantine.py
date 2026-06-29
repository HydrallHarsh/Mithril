"""
Mithril — Quarantine Store
====================================
SQLite-backed storage for quarantined and review-flagged memories.
Uses aiosqlite for async access.
"""

import aiosqlite
import json
from datetime import datetime
from .models import AdmissionResult

DB_PATH = ".mithril_quarantine.db"


class QuarantineStore:
    """Async SQLite store for memories that failed the trust gate."""

    async def setup(self) -> None:
        """Create the quarantine table if it doesn't exist."""
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute("""
                CREATE TABLE IF NOT EXISTS quarantine (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    text TEXT NOT NULL,
                    source TEXT NOT NULL,
                    author TEXT,
                    trust_score REAL NOT NULL,
                    status TEXT NOT NULL,
                    decision_reason TEXT NOT NULL,
                    score_breakdown TEXT NOT NULL,
                    timestamp TEXT NOT NULL
                )
            """)
            await db.commit()

    async def store(self, result: AdmissionResult) -> None:
        """Insert a quarantined/review memory into the store."""
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute("""
                INSERT INTO quarantine
                (text, source, author, trust_score, status,
                 decision_reason, score_breakdown, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                result.claim.text,
                result.claim.source,
                result.claim.author,
                result.trust_breakdown.final_score,
                result.status.value,
                result.decision_reason,
                json.dumps(result.trust_breakdown.reasons),
                result.timestamp.isoformat(),
            ))
            await db.commit()

    async def get_all(self) -> list[dict]:
        """Return all quarantined memories, newest first."""
        async with aiosqlite.connect(DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM quarantine ORDER BY timestamp DESC"
            ) as cursor:
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]
