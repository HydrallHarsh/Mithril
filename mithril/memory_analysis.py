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
from .ratelimit import RateLimitedError, get_llm_limiter
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
    """Shared helper: build AsyncOpenAI client and resolve model name.

    Works with any OpenAI-compatible gateway. For Google Gemini (either
    ``LLM_PROVIDER=gemini`` or a ``gemini/…`` model id) we default the base URL
    to Gemini's OpenAI-compatible endpoint when ``LLM_ENDPOINT`` isn't set, and
    strip the ``gemini/`` prefix so the bare model id is sent.
    """
    from openai import AsyncOpenAI

    provider = os.getenv("LLM_PROVIDER", "").strip().lower()
    model = os.getenv("MITHRIL_LLM_MODEL") or os.getenv(
        "LLM_MODEL", "claude-sonnet-4-5-20250929"
    )
    is_gemini = provider == "gemini" or model.startswith("gemini/")

    for prefix in ("openai/", "openrouter/", "custom/", "agentrouter/", "gemini/"):
        if model.startswith(prefix):
            model = model[len(prefix):]
            break

    default_endpoint = (
        "https://generativelanguage.googleapis.com/v1beta/openai/"
        if is_gemini
        else "https://agentrouter.org/v1"
    )
    client = AsyncOpenAI(
        base_url=os.getenv("LLM_ENDPOINT") or default_endpoint,
        api_key=os.getenv("LLM_API_KEY", ""),
    )
    return client, model


async def _llm_score(prompt: str, fallback: float = 0.0) -> float:
    """Send a scoring prompt to the LLM and extract a 0.0–1.0 score.

    Consumes one slot from the shared LLM budget *before* calling the provider.
    If the budget is exhausted this raises :class:`RateLimitedError` (so the API
    can return HTTP 429) rather than degrading to the fallback score — a
    rate-limited demo must be visibly rate-limited, not silently wrong.
    """
    # Reserve budget first; propagate exhaustion loudly.
    await get_llm_limiter().acquire_or_raise()

    client, model = _get_llm_client_and_model()
    # Thinking models (e.g. gemini-*-flash) spend tokens on reasoning before
    # emitting output, so give them headroom — configurable for tighter models.
    max_tokens = int(os.getenv("MITHRIL_LLM_MAX_TOKENS", "800") or "800")
    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
            temperature=0.0,
        )
        content = response.choices[0].message.content
        if not content:
            # Thinking model ran out of output budget, or an empty completion.
            logger.warning(
                "LLM returned empty content (finish_reason=%s); using fallback",
                getattr(response.choices[0], "finish_reason", "unknown"),
            )
            return fallback
        raw = content.strip()

        match = re.search(r"<score>\s*(\d+\.?\d*)\s*</score>", raw)
        if match:
            return max(0.0, min(1.0, float(match.group(1))))

        # Fallback to the last floating point number if tags are missing
        matches = re.findall(r"(\d+\.\d+)", raw)
        if matches:
            return max(0.0, min(1.0, float(matches[-1])))

        return fallback
    except RateLimitedError:
        raise
    except Exception as exc:
        # A provider-side rate-limit/quota error should also surface as a 429,
        # not a silent fallback — translate the common phrasings.
        message = str(exc).lower()
        if any(
            token in message
            for token in ("rate limit", "rate_limit", "quota", "too many requests", "429")
        ):
            raise RateLimitedError(retry_after=_get_provider_retry_after())
        logger.warning("LLM scoring failed: %s", exc)
        return fallback


def _get_provider_retry_after() -> float:
    """Best-effort retry hint when the provider itself signals throttling."""
    return get_llm_limiter().snapshot().get("reset_after", 30.0) or 30.0


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
