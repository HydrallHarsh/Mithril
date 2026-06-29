"""
Mithril — Contradiction Detection
==========================================
Queries Cognee's verified memory via `cognee.recall(only_context=True)`
to find existing knowledge that conflicts with an incoming claim, then
uses the LLM (via Cognee's configured provider) to score the contradiction.
"""

import os
import cognee
from .models import ContradictionResult
from .config import COGNEE_VERIFIED_DATASET


async def check_contradiction(claim_text: str) -> ContradictionResult:
    """
    Query existing verified memory for contradictions.

    Uses ``cognee.recall()`` with ``only_context=True`` to retrieve raw
    context without triggering LLM answer generation — keeping this
    call fast and cheap.

    Parameters
    ----------
    claim_text : str
        The text of the incoming claim to check.

    Returns
    -------
    ContradictionResult
        Whether a contradiction was found, the conflicting text, and a
        0–1 contradiction score.
    """
    try:
        # Pull relevant context from existing verified memory
        results = await cognee.recall(
            query_text=claim_text,
            datasets=[COGNEE_VERIFIED_DATASET],
            only_context=True,   # raw context, skip LLM answer generation
            top_k=3,
        )

        if not results:
            return ContradictionResult(found=False)

        # Extract text from results (they may be dicts or objects)
        context_parts: list[str] = []
        for r in results:
            if hasattr(r, "text"):
                context_parts.append(r.text)
            elif hasattr(r, "content"):
                context_parts.append(r.content)
            elif isinstance(r, dict):
                context_parts.append(str(r.get("text", r.get("content", str(r)))))
            else:
                context_parts.append(str(r))

        context = "\n".join(context_parts)

        if not context.strip():
            return ContradictionResult(found=False)

        # Use LLM to assess contradiction between claim and existing context
        contradiction_score = await _assess_contradiction(claim_text, context)

        return ContradictionResult(
            found=contradiction_score > 0.3,
            contradicting_text=context[:500],
            contradiction_score=contradiction_score,
        )

    except Exception:
        # If Cognee has no memories yet, or any error — no contradiction possible
        return ContradictionResult(found=False)


async def _assess_contradiction(claim: str, context: str) -> float:
    """
    Ask LLM: does this claim contradict the existing context?

    Uses the OpenRouter endpoint configured in .env (the same provider
    Cognee uses) so there's no extra API key needed.

    Returns
    -------
    float
        0.0 (no conflict) to 1.0 (direct contradiction).
    """
    from openai import AsyncOpenAI

    # Use the same OpenRouter endpoint configured for Cognee
    client = AsyncOpenAI(
        base_url=os.getenv("LLM_ENDPOINT", "https://openrouter.ai/api/v1"),
        api_key=os.getenv("LLM_API_KEY", ""),
    )

    model = os.getenv("LLM_MODEL", "openrouter/nvidia/nemotron-3-ultra-550b-a55b:free")
    # Strip the "openrouter/" prefix if present (OpenRouter expects model name without it in some configs)
    if model.startswith("openrouter/"):
        model = model[len("openrouter/"):]

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
        # Extract the first float-like value from the response
        import re
        match = re.search(r"(\d+\.?\d*)", raw)
        if match:
            return max(0.0, min(1.0, float(match.group(1))))
        return 0.0
    except Exception:
        return 0.0
