"""
Mithril — Adaptive Source Reputation
====================================
Source reputation is no longer a frozen lookup table.  It starts from the
configured priors and then *moves* with each decision:

* a source whose claim is blocked (contradiction / quarantine / reject)
  loses trust, pulled toward 0.0;
* a source whose claim is accepted (and corroborated) gains trust, pulled
  toward 1.0.

Trust is deliberately **easy to lose, hard to earn** — the penalty learning
rate is higher than the reward rate — which mirrors how reputation works in
the real world and makes "watch Slack's trust collapse after it lies twice"
a real, visible demo beat.

Backed by SQLite so reputation persists across runs (and across the API,
MCP server, and ingestion connector, which all share one store).
"""

from __future__ import annotations

from datetime import datetime, timezone

import aiosqlite

from .config import DEFAULT_REPUTATION, SOURCE_REPUTATION

DB_PATH = ".mithril_reputation.db"

# Bounded EWMA parameters.
REWARD_RATE = 0.10        # trust earned per good outcome (slow)
PENALTY_RATE = 0.22       # trust lost per bad outcome (fast)
REPUTATION_FLOOR = 0.05
REPUTATION_CEIL = 0.99

# Statuses that count as the source having earned vs. abused trust.
_GOOD_STATUSES = {"accept", "warn"}
_BAD_STATUSES = {"quarantine", "reject"}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _clamp(value: float) -> float:
    return max(REPUTATION_FLOOR, min(REPUTATION_CEIL, value))


class ReputationStore:
    """Async SQLite store for dynamic, self-adjusting source reputation."""

    async def setup(self) -> None:
        """Create the table and seed any missing sources from the priors."""
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute(
                """
                CREATE TABLE IF NOT EXISTS source_reputation (
                    source TEXT PRIMARY KEY,
                    reputation REAL NOT NULL,
                    prior REAL NOT NULL,
                    accept_count INTEGER NOT NULL DEFAULT 0,
                    block_count INTEGER NOT NULL DEFAULT 0,
                    updated_at TEXT NOT NULL
                )
                """
            )
            await db.commit()
            await self._seed_priors(db)

    async def _seed_priors(self, db: aiosqlite.Connection) -> None:
        now = _now()
        for source, prior in SOURCE_REPUTATION.items():
            await db.execute(
                """
                INSERT INTO source_reputation
                    (source, reputation, prior, accept_count, block_count, updated_at)
                VALUES (?, ?, ?, 0, 0, ?)
                ON CONFLICT(source) DO NOTHING
                """,
                (source, prior, prior, now),
            )
        await db.commit()

    async def get(self, source: str) -> float:
        """Current live reputation for a source (prior/default if unseen)."""
        key = source.lower()
        async with aiosqlite.connect(DB_PATH) as db:
            async with db.execute(
                "SELECT reputation FROM source_reputation WHERE source = ?", (key,)
            ) as cursor:
                row = await cursor.fetchone()
                if row is not None:
                    return float(row[0])
        return DEFAULT_REPUTATION

    async def update_on_decision(
        self,
        source: str,
        status: str,
        contradiction_found: bool,
    ) -> float:
        """
        Adjust a source's reputation after a decision and return the new value.

        A contradiction always counts as a bad outcome even if the score
        happened to clear a tier — getting caught contradicting verified
        memory is the strongest possible trust signal.
        """
        key = source.lower()
        is_bad = contradiction_found or status in _BAD_STATUSES
        is_good = (not is_bad) and status in _GOOD_STATUSES

        if not (is_good or is_bad):
            return await self.get(source)  # REVIEW / neutral — no movement

        async with aiosqlite.connect(DB_PATH) as db:
            async with db.execute(
                """
                SELECT reputation, accept_count, block_count
                FROM source_reputation WHERE source = ?
                """,
                (key,),
            ) as cursor:
                row = await cursor.fetchone()

            if row is None:
                current = DEFAULT_REPUTATION
                accept_count = block_count = 0
                prior = DEFAULT_REPUTATION
            else:
                current, accept_count, block_count = float(row[0]), row[1], row[2]
                prior = current  # only used if we need to insert; overwritten below

            if is_bad:
                new_rep = _clamp(current + PENALTY_RATE * (0.0 - current))
                block_count += 1
            else:
                new_rep = _clamp(current + REWARD_RATE * (1.0 - current))
                accept_count += 1

            if row is None:
                await db.execute(
                    """
                    INSERT INTO source_reputation
                        (source, reputation, prior, accept_count, block_count, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (key, new_rep, prior, accept_count, block_count, _now()),
                )
            else:
                await db.execute(
                    """
                    UPDATE source_reputation
                    SET reputation = ?, accept_count = ?, block_count = ?, updated_at = ?
                    WHERE source = ?
                    """,
                    (new_rep, accept_count, block_count, _now(), key),
                )
            await db.commit()
            return new_rep

    async def get_all(self) -> list[dict]:
        """All sources with current reputation, prior, and delta — newest moves first."""
        async with aiosqlite.connect(DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                """
                SELECT source, reputation, prior, accept_count, block_count, updated_at
                FROM source_reputation
                ORDER BY reputation DESC
                """
            ) as cursor:
                rows = await cursor.fetchall()

        out: list[dict] = []
        for row in rows:
            d = dict(row)
            d["delta"] = round(d["reputation"] - d["prior"], 4)
            out.append(d)
        return out

    async def reset(self) -> None:
        """Wipe learned reputation and reseed from the configured priors."""
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute("DROP TABLE IF EXISTS source_reputation")
            await db.commit()
        await self.setup()
