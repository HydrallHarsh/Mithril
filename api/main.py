"""
Mithril — FastAPI Backend
=========================
REST API for the Mithril provenance dashboard.

Endpoints:
    GET  /api/audit      — full audit log, newest first
    GET  /api/quarantine  — quarantined memories only
    POST /api/remember    — submit a new memory through the firewall
    GET  /api/config      — source reputation table + thresholds

Run:
    uvicorn api.main:app --port 8000 --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sys
import os

# Ensure project root is on path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv()

from mithril.firewall import Mithril
from mithril.config import SOURCE_REPUTATION, THRESHOLDS

app = FastAPI(
    title="Mithril",
    description="Trust and governance layer for Cognee memory",
    version="0.1.0",
)

# CORS — allow the Next.js frontend (and any localhost dev server)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

firewall = Mithril()


@app.on_event("startup")
async def startup():
    """Initialize firewall databases on server start."""
    await firewall.setup()


# ── Endpoints ────────────────────────────────────────────────────

@app.get("/api/audit")
async def get_audit():
    """Return the full audit log, newest first."""
    return await firewall.get_audit_trail()


@app.get("/api/quarantine")
async def get_quarantine():
    """Return quarantined memories only."""
    return await firewall.get_quarantine()


class RememberRequest(BaseModel):
    """Request body for submitting a memory claim."""
    text: str
    source: str
    author: str = "demo_user"


@app.post("/api/remember")
async def remember(req: RememberRequest):
    """Submit a new memory through the firewall and return the decision."""
    result = await firewall.remember(
        text=req.text,
        source=req.source,
        author=req.author,
    )
    return {
        "status": result.status.value,
        "trust_score": result.trust_breakdown.final_score,
        "decision_reason": result.decision_reason,
        "source_reputation": result.trust_breakdown.source_reputation,
        "contradiction_penalty": result.trust_breakdown.contradiction_penalty,
        "corroboration_bonus": result.trust_breakdown.corroboration_bonus,
        "freshness_bonus": result.trust_breakdown.freshness_bonus,
        "reasons": result.trust_breakdown.reasons,
        "entered_cognee": result.cognee_dataset is not None,
        "cognee_dataset": result.cognee_dataset,
    }


@app.get("/api/config")
async def get_config():
    """Return source reputation table and admission thresholds."""
    return {
        "source_reputation": SOURCE_REPUTATION,
        "thresholds": THRESHOLDS,
    }


@app.get("/api/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "service": "mithril"}
