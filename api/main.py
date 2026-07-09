"""
Mithril — FastAPI Backend
=========================
REST API for the Mithril provenance dashboard and the hosted public demo.

Hosting model
-------------
The backend is designed to run on a single shared, low-quota LLM key (e.g. a
Google Gemini free-tier key at ~5 req/min). Two mechanisms keep it within budget:

* an app-level sliding-window limiter (:mod:`mithril.ratelimit`) guards our own
  contradiction/danger scoring calls and surfaces exhaustion as HTTP 429, and
* the baseline "verified memory" is seeded **once** in the background at startup,
  so public visitors spend budget only on the single claim they submit.
"""

from __future__ import annotations

import asyncio
import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from mithril.config import SOURCE_OPTIONS, SOURCE_REPUTATION, THRESHOLDS, WEIGHTS
from mithril.demo_data import BASELINE_POLICIES, SUGGESTED_CLAIMS
from mithril.firewall import Mithril
from mithril.ratelimit import RateLimitedError, get_llm_limiter
from mithril.scorer import MAX_THEORETICAL_SCORE
from mithril.serialization import (
    admission_result_to_dict,
    recall_result_to_dict,
    stats_to_dict,
)

load_dotenv()

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Mithril",
    description="Trust and governance layer for Cognee memory",
    version="0.1.0",
)


def _cors_origins() -> list[str]:
    """Resolve allowed CORS origins from env, defaulting to local dev.

    Set ``CORS_ORIGINS`` to a comma-separated list of hosted frontend origins
    (e.g. ``https://mithril.vercel.app``). Set it to ``*`` to allow any origin
    (credentials are disabled in that mode, per the CORS spec).
    """
    raw = os.getenv("CORS_ORIGINS", "").strip()
    if raw == "*":
        return ["*"]
    configured = [o.strip() for o in raw.split(",") if o.strip()]
    defaults = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ]
    # Hosted origins are additive to local dev origins.
    return list(dict.fromkeys(defaults + configured))


_origins = _cors_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials="*" not in _origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

firewall = Mithril()

# Background baseline-seed state: warming → ready (or error). Exposed via
# /api/health and /api/demo so the UI can show "warming up…".
seed_state: str = "idle"


def _demo_seed_enabled() -> bool:
    return os.getenv("MITHRIL_DEMO_SEED", "").strip().lower() in {"1", "true", "yes", "on"}


async def _seed_baseline_once() -> None:
    """Seed the verified-memory baseline exactly once, in the background.

    Idempotent: if the audit log already has entries (a prior run seeded, or a
    persisted store), we skip. Runs off the startup path so the server accepts
    connections immediately while memory warms up.
    """
    global seed_state
    try:
        existing = await firewall.get_audit_trail()
        seeded_texts = {row["text"] for row in existing}
        pending = [(t, s) for t, s in BASELINE_POLICIES if t not in seeded_texts]
        if not pending:
            seed_state = "ready"
            return

        seed_state = "warming"
        # Seed each remaining policy, waiting out the rate-limit window when the
        # shared budget is hit. A 5-req/min key can't seed 3 policies in one
        # window, so backoff-and-resume is required — not optional.
        attempts = 0
        max_attempts = len(BASELINE_POLICIES) * 6 + 6
        while pending and attempts < max_attempts:
            attempts += 1
            text, source = pending[0]
            try:
                await firewall.remember(text=text, source=source, author="demo_seed")
                pending.pop(0)
            except RateLimitedError as exc:
                wait = max(2.0, min(exc.retry_after + 1.0, 65.0))
                logger.info(
                    "Seed paused by rate limit; retrying in %.0fs (%d policies left).",
                    wait,
                    len(pending),
                )
                await asyncio.sleep(wait)

        if pending:
            seed_state = "error"
            logger.error("Baseline seed did not converge (%d left).", len(pending))
        else:
            seed_state = "ready"
            logger.info("Demo baseline seeded (%d policies).", len(BASELINE_POLICIES))
    except Exception as exc:  # noqa: BLE001 — surface as state, never crash startup
        seed_state = "error"
        logger.error("Baseline seed failed: %s", exc)


@app.on_event("startup")
async def startup() -> None:
    await firewall.setup()
    if _demo_seed_enabled():
        # Fire-and-forget so startup doesn't block on ~3 gated LLM writes.
        asyncio.create_task(_seed_baseline_once())


@app.exception_handler(RateLimitedError)
async def _rate_limited_handler(_request: Request, exc: RateLimitedError) -> JSONResponse:
    """Translate a shared-budget exhaustion into a clean 429 for the UI."""
    retry_after = round(exc.retry_after, 1)
    return JSONResponse(
        status_code=429,
        headers={"Retry-After": str(int(retry_after) or 1)},
        content={
            "detail": (
                "The demo shares one Google Gemini free-tier key (rate-limited). "
                "Please try again shortly."
            ),
            "retry_after": retry_after,
            "rate_limit": get_llm_limiter().snapshot(),
        },
    )


@app.get("/api/audit")
async def get_audit():
    return await firewall.get_audit_trail()


@app.get("/api/quarantine")
async def get_quarantine():
    return await firewall.get_quarantine()


@app.get("/api/reputation")
async def get_reputation():
    """Live, adaptive source reputation with priors and deltas."""
    return await firewall.get_reputation()


@app.get("/api/stats")
async def get_stats():
    stats = await firewall.get_stats()
    return stats_to_dict(stats)


class RememberRequest(BaseModel):
    text: str = Field(..., min_length=1)
    source: str
    author: str = "demo_user"


class RecallRequest(BaseModel):
    query: str = Field(..., min_length=1)


@app.post("/api/remember")
async def remember(req: RememberRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="text cannot be empty")
    result = await firewall.remember(
        text=req.text.strip(),
        source=req.source,
        author=req.author,
    )
    return admission_result_to_dict(result)


@app.post("/api/recall")
async def recall(req: RecallRequest):
    result = await firewall.recall_with_metadata(req.query.strip())
    return recall_result_to_dict(result)


@app.post("/api/reset")
async def reset():
    await firewall.reset()
    return {"status": "ok", "message": "Cognee memory and audit stores cleared"}


@app.get("/api/config")
async def get_config():
    return {
        "source_reputation": SOURCE_REPUTATION,
        "source_options": SOURCE_OPTIONS,
        "thresholds": THRESHOLDS,
        "weights": WEIGHTS,
        "max_theoretical_score": MAX_THEORETICAL_SCORE,
    }


@app.get("/api/demo")
async def get_demo():
    """Public demo payload: what's in verified memory + what to try.

    ``verified_facts`` are the seeded baseline texts (no LLM call — always cheap
    and reliable), so the UI can render "what the firewall trusts" even while
    memory is still warming or the LLM budget is exhausted.
    """
    return {
        "seed_state": seed_state,
        "seed_enabled": _demo_seed_enabled(),
        "verified_facts": [
            {"text": text, "source": source} for text, source in BASELINE_POLICIES
        ],
        "suggested_claims": SUGGESTED_CLAIMS,
        "source_options": SOURCE_OPTIONS,
        "rate_limit": get_llm_limiter().snapshot(),
    }


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "service": "mithril",
        "seed_state": seed_state,
        "rate_limit": get_llm_limiter().snapshot(),
    }


def main() -> None:
    """Run the API server from the installed `mithril-api` command."""
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("api.main:app", host=host, port=port)
