"""
Mithril — Verified Memory Analysis
===================================
Single Cognee recall pass used for both contradiction detection and
corroboration counting (avoids duplicate recall calls per claim).
"""

from __future__ import annotations

import logging
import os
import re

import cognee

from .config import COGNEE_VERIFIED_DATASET
from .models import ContradictionResult
from .utils import extract_recall_texts

logger = logging.getLogger(__name__)

CONTRADICTION_THRESHOLD = 0.3


async def analyze_against_verified_memory(
    claim_text: str,
    *,
    top_k: int = 3,
) -> tuple[ContradictionResult, int]:
    """
    Recall verified memory once, then derive contradiction + corroboration.

    Returns
    -------
    tuple[ContradictionResult, int]
        Contradiction assessment and corroboration count (0–3).
    """
    try:
        results = await cognee.recall(
            query_text=claim_text,
            datasets=[COGNEE_VERIFIED_DATASET],
            only_context=True,
            top_k=top_k,
        )
    except Exception as exc:
        logger.warning("Verified memory recall failed: %s", exc)
        return ContradictionResult(found=False), 0

    context_parts = extract_recall_texts(results)
    if not context_parts:
        return ContradictionResult(found=False), 0

    context = "\n".join(context_parts)
    contradiction_score = await _assess_contradiction(claim_text, context)
    contradiction = ContradictionResult(
        found=contradiction_score > CONTRADICTION_THRESHOLD,
        contradicting_text=context[:500],
        contradiction_score=contradiction_score,
    )

    corroboration_count = _count_corroboration(context_parts, contradiction)
    return contradiction, corroboration_count


def _count_corroboration(
    context_parts: list[str],
    contradiction: ContradictionResult,
) -> int:
    """
    Estimate corroboration from the number of aligned verified chunks.

    If existing memory aligns (low contradiction) and multiple chunks were
    retrieved, treat each extra chunk as independent corroboration.
    """
    if contradiction.found or not context_parts:
        return 0

    # One matching chunk = baseline context; additional chunks = corroboration.
    return min(max(len(context_parts) - 1, 0), 3)


async def _assess_contradiction(claim: str, context: str) -> float:
    """Ask the configured LLM whether the claim contradicts verified context."""
    from openai import AsyncOpenAI

    client = AsyncOpenAI(
        base_url=os.getenv("LLM_ENDPOINT", "https://openrouter.ai/api/v1"),
        api_key=os.getenv("LLM_API_KEY", ""),
    )

    model = os.getenv("LLM_MODEL", "openrouter/nvidia/nemotron-3-ultra-550b-a55b:free")
    if model.startswith("openrouter/"):
        model = model[len("openrouter/") :]

    prompt = f"""Does this new claim contradict the existing knowledge?

Existing knowledge: {context}

New claim: {claim}

Reply with ONLY a number from 0.0 to 1.0 where:
0.0 = no contradiction (consistent or unrelated)
0.5 = partial or ambiguous contradiction
1.0 = direct contradiction

Number only:"""

    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=10,
            temperature=0.0,
        )
        raw = response.choices[0].message.content.strip()
        match = re.search(r"(\d+\.?\d*)", raw)
        if match:
            return max(0.0, min(1.0, float(match.group(1))))
        return 0.0
    except Exception as exc:
        logger.warning("Contradiction LLM assessment failed: %s", exc)
        return 0.0
