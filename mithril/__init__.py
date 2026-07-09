import os
import cognee

# Set Cognee to store its data in the local workspace (.cognee_system) instead of
# the global site-packages directory. This is critical for deployment platforms
# (Render, Vercel) where site-packages is read-only, avoiding sqlite3 OperationalErrors.
cognee.config.system_root_directory(os.path.abspath(".cognee_system"))

from .firewall import Mithril
from .ingest import (
    ParsedMessage,
    ingest_messages,
    ingest_slack_export,
    load_generic_file,
    load_slack_export,
)
from .models import (
    AdmissionResult,
    AdmissionStatus,
    ContradictionResult,
    FirewallStats,
    MemoryClaim,
    RecallResult,
    TrustScoreBreakdown,
)
from .reputation import ReputationStore
from .ratelimit import RateLimitedError, get_llm_limiter
from .scorer import MAX_THEORETICAL_SCORE, compute_trust_score
from .secrets import contains_secret, redact_secrets, scan as scan_secrets

__all__ = [
    "Mithril",
    "AdmissionStatus",
    "MemoryClaim",
    "ContradictionResult",
    "TrustScoreBreakdown",
    "AdmissionResult",
    "RecallResult",
    "FirewallStats",
    "compute_trust_score",
    "MAX_THEORETICAL_SCORE",
    "ReputationStore",
    "RateLimitedError",
    "get_llm_limiter",
    "ParsedMessage",
    "load_slack_export",
    "load_generic_file",
    "ingest_messages",
    "ingest_slack_export",
    "redact_secrets",
    "contains_secret",
    "scan_secrets",
]
