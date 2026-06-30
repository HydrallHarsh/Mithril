"""
Mithril — FastAPI Backend
=========================
REST API for the Mithril provenance dashboard.
"""

from __future__ import annotations

import os
import sys

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
load_dotenv()

from mithril.config import SOURCE_OPTIONS, SOURCE_REPUTATION, THRESHOLDS, WEIGHTS
from mithril.firewall import Mithril
from mithril.scorer import MAX_THEORETICAL_SCORE
from mithril.serialization import (
    admission_result_to_dict,
    recall_result_to_dict,
    stats_to_dict,
)

app = FastAPI(
    title="Mithril",
    description="Trust and governance layer for Cognee memory",
    version="0.1.0",
)

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
async def startup() -> None:
    await firewall.setup()


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


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "mithril"}
