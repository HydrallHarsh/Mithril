"""
Mithril — Contradiction Detection
=================================
Backward-compatible wrapper; prefer ``memory_analysis.analyze_against_verified_memory``.
"""

from .memory_analysis import analyze_against_verified_memory
from .models import ContradictionResult


async def check_contradiction(claim_text: str) -> ContradictionResult:
    """Query verified memory and return contradiction assessment only."""
    contradiction, _ = await analyze_against_verified_memory(claim_text)
    return contradiction
