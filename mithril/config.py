"""
Mithril — Configuration
================================
Source reputation table, admission thresholds, score weights, and Cognee dataset names.
All values are easily tunable without code changes.
"""

# Source reputation scores (0.0 – 1.0)
# Higher = more trusted.  Used as a major input to the trust score formula.
SOURCE_REPUTATION: dict[str, float] = {
    "security policy": 0.98,
    "official docs":   0.95,
    "github pr":       0.90,
    "engineering blog": 0.80,
    "internal wiki":   0.75,
    "slack":           0.60,
    "email":           0.55,
    "ai agent":        0.40,
    "unknown agent":   0.30,
    "untrusted":       0.10,
}

# Fallback reputation for sources not in the table
DEFAULT_REPUTATION: float = 0.35

# Admission thresholds — score boundaries for each decision tier
THRESHOLDS: dict[str, float] = {
    "accept":     0.85,
    "warn":       0.60,
    "review":     0.40,
    "quarantine": 0.20,
    # below 0.20 → REJECT
}

# Score component weights (bonuses/penalties applied to the source-reputation base)
WEIGHTS: dict[str, float] = {
    "source_reputation": 0.40,
    "corroboration":     0.30,
    "freshness":         0.10,
    "contradiction":    -0.40,   # penalty, applied when contradiction is found
}

# Cognee dataset identifiers
COGNEE_VERIFIED_DATASET: str = "verified_memories"
COGNEE_QUARANTINE_DATASET: str = "quarantine_memories"
