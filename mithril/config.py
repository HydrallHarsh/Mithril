"""
Mithril — Configuration
=======================
Matches memory-firewall-master-plan.md Section 7 (config.py).
"""

# Source reputation scores (0.0 – 1.0) — master plan Section 4 table,
# extended with common enterprise systems for a realistic threat model.
SOURCE_REPUTATION: dict[str, float] = {
    "security policy": 0.98,
    "hr system": 0.95,
    "official docs": 0.95,
    "github pr": 0.90,
    "jira": 0.85,
    "engineering blog": 0.80,
    "internal wiki": 0.75,
    "slack": 0.60,
    "email": 0.55,
    "customer support": 0.50,
    "ai agent": 0.40,
    "external email": 0.40,
    "unknown agent": 0.30,
    "public web": 0.25,
    "untrusted": 0.10,
}

DEFAULT_REPUTATION: float = 0.35

# Score weights — source reputation and contradiction remain dominant,
# content_danger penalizes inherently harmful claims.
WEIGHTS: dict[str, float] = {
    "source_reputation": 0.40,
    "corroboration": 0.25,
    "freshness": 0.05,
    "contradiction": -0.40,
    "content_danger": -0.35,
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
    "HR System",
    "Official Docs",
    "GitHub PR",
    "Jira",
    "Engineering Blog",
    "Internal Wiki",
    "Slack",
    "Email",
    "Customer Support",
    "AI Agent",
    "External Email",
    "Unknown Agent",
    "Public Web",
    "Untrusted",
]
