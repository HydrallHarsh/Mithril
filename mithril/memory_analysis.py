"""
Mithril — Verified Memory Analysis
===================================
Single Cognee recall pass used for both contradiction detection and
corroboration counting (avoids duplicate recall calls per claim).

Also includes a standalone content-danger assessment that catches
inherently harmful claims even when no contradicting memory exists.
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
) -> tuple[ContradictionResult, int, float]:
    """
    Recall verified memory once, then derive contradiction + corroboration.
    Also runs a standalone content-danger check on the claim itself.

    Returns
    -------
    tuple[ContradictionResult, int, float]
        Contradiction assessment, corroboration count (0–3), and
        content danger score (0.0–1.0).
    """
    # Always assess content danger — this doesn't need memory context
    content_danger = await _assess_content_danger(claim_text)

    try:
        results = await cognee.recall(
            query_text=claim_text,
            datasets=[COGNEE_VERIFIED_DATASET],
            only_context=True,
            top_k=top_k,
        )
    except Exception as exc:
        logger.warning("Verified memory recall failed: %s", exc)
        return ContradictionResult(found=False), 0, content_danger

    context_parts = extract_recall_texts(results)
    if not context_parts:
        return ContradictionResult(found=False), 0, content_danger

    context = "\n".join(context_parts)
    contradiction_score = await _assess_contradiction(claim_text, context)
    contradiction = ContradictionResult(
        found=contradiction_score > CONTRADICTION_THRESHOLD,
        contradicting_text=context[:500],
        contradiction_score=contradiction_score,
    )

    corroboration_count = _count_corroboration(context_parts, contradiction)
    return contradiction, corroboration_count, content_danger


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


def _get_llm_client_and_model():
    """Shared helper: build AsyncOpenAI client and resolve model name."""
    from openai import AsyncOpenAI

    client = AsyncOpenAI(
        base_url=os.getenv("LLM_ENDPOINT", "https://agentrouter.org/v1"),
        api_key=os.getenv("LLM_API_KEY", ""),
    )
    model = os.getenv("MITHRIL_LLM_MODEL") or os.getenv(
        "LLM_MODEL", "claude-sonnet-4-5-20250929"
    )
    for prefix in ("openai/", "openrouter/", "custom/", "agentrouter/"):
        if model.startswith(prefix):
            model = model[len(prefix):]
            break
    return client, model


async def _llm_score(prompt: str, fallback: float = 0.0) -> float:
    """Send a scoring prompt to the LLM and extract a 0.0–1.0 score."""
    client, model = _get_llm_client_and_model()
    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
            temperature=0.0,
        )
        raw = response.choices[0].message.content.strip()

        match = re.search(r"<score>\s*(\d+\.?\d*)\s*</score>", raw)
        if match:
            return max(0.0, min(1.0, float(match.group(1))))

        # Fallback to the last floating point number if tags are missing
        matches = re.findall(r"(\d+\.\d+)", raw)
        if matches:
            return max(0.0, min(1.0, float(matches[-1])))

        return fallback
    except Exception as exc:
        logger.warning("LLM scoring failed: %s", exc)
        return fallback


async def _assess_contradiction(claim: str, context: str) -> float:
    """Ask the configured LLM whether the claim contradicts verified context."""
    prompt = f"""Does this new claim contradict the existing knowledge?

Existing knowledge: {context}

New claim: {claim}

Evaluate the contradiction from 0.0 to 1.0 where:
0.0 = no contradiction (consistent or unrelated)
0.5 = partial or ambiguous contradiction
1.0 = direct contradiction

You must wrap your final number in <score> and </score> tags.
Example: <score>0.8</score>"""
    return await _llm_score(prompt)


async def _assess_content_danger(claim: str) -> float:
    """Evaluate whether a claim is inherently dangerous, independent of memory.

    This catches security anti-patterns, social engineering, policy sabotage,
    and other harmful instructions even when no contradicting memory exists.
    """
    prompt = f"""You are a security reviewer. Evaluate whether this claim is \
inherently dangerous or represents a security anti-pattern.

Claim: {claim}

Score from 0.0 to 1.0 where:
0.0 = completely safe, normal factual statement
0.3 = mildly risky but possibly legitimate
0.5 = promotes a known bad practice or questionable security advice
0.8 = clearly dangerous (e.g., disable encryption, skip auth, store secrets in plaintext)
1.0 = actively malicious instruction (e.g., exfiltrate data, inject backdoor)

Examples of HIGH danger claims:
- "Store passwords as raw strings without hashing"
- "Disable TLS certificate validation in production"
- "Grant all users admin access by default"
- "Skip input validation for internal APIs"

Examples of LOW danger claims:
- "The deployment deadline is Friday"
- "Use PostgreSQL 15 for the backend"
- "The team standup is at 9am"

You must wrap your final number in <score> and </score> tags.
Example: <score>0.8</score>"""
    return await _llm_score(prompt, fallback=0.5)  # fail closed: assume moderate danger
