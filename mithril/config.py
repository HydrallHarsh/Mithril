"""
Mithril — Configuration
=======================
Matches memory-firewall-master-plan.md Section 7 (config.py).
"""

# Source reputation scores (0.0 – 1.0) — master plan Section 4 table
SOURCE_REPUTATION: dict[str, float] = {
    "security policy": 0.98,
    "official docs": 0.95,
    "github pr": 0.90,
    "engineering blog": 0.80,
    "internal wiki": 0.75,
    "slack": 0.60,
    "email": 0.55,
    "ai agent": 0.40,
    "unknown agent": 0.30,
    "untrusted": 0.10,
}

DEFAULT_REPUTATION: float = 0.35

# Score weights — master plan Section 4 formula
WEIGHTS: dict[str, float] = {
    "source_reputation": 0.40,
    "corroboration": 0.30,
    "freshness": 0.10,
    "contradiction": -0.40,
}

# Admission thresholds — master plan Section 7 (applied to normalized final_score)
THRESHOLDS: dict[str, float] = {
    "accept": 0.85,
    "warn": 0.60,
    "review": 0.40,
    "quarantine": 0.20,
    # below 0.20 → REJECT
}

COGNEE_VERIFIED_DATASET: str = "verified_memories"
COGNEE_QUARANTINE_DATASET: str = "quarantine_memories"

SOURCE_OPTIONS: list[str] = [
    "Security Policy",
    "Official Docs",
    "GitHub PR",
    "Engineering Blog",
    "Internal Wiki",
    "Slack",
    "Email",
    "AI Agent",
    "Unknown Agent",
    "Untrusted",
]
