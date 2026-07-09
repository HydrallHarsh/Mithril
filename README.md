# Mithril

[![PyPI](https://img.shields.io/pypi/v/mithril-cognee?label=PyPI)](https://pypi.org/project/mithril-cognee/)
[![Python](https://img.shields.io/pypi/pyversions/mithril-cognee)](https://pypi.org/project/mithril-cognee/)
[![Release](https://github.com/HydrallHarsh/Mithril/actions/workflows/publish-python.yml/badge.svg?branch=main)](https://github.com/HydrallHarsh/Mithril/actions/workflows/publish-python.yml)

> A trust and governance layer for Cognee memory.  
> Every AI can remember. **Mithril** decides what *deserves* to be remembered.

> Available as a published Python package on PyPI, with the MCP server installable and runnable locally in a single command.

## What's New in 0.2.0

- **Service Stability**: Implemented a sliding-window LLM rate limiter and an API key rotation pool. This ensures the hosted demo handles traffic gracefully and automatically fails over when the shared free-tier Gemini API hits quota limits.
- **Deployment Fixes**: Resolved `sqlite3.OperationalError` issues when deploying to read-only environments (like Render or Vercel). Cognee is now properly configured to store its databases inside a writable local workspace directory (`.cognee_system`).
- **Enhanced Endpoints**: Implemented a robust `/api/demo` route to seamlessly serve verified facts and rate-limit states to the UI, while enhancing the recall and remember endpoints for better provenance tracking.

## The Problem

AI agents with persistent memory are vulnerable to **memory poisoning** — where a single malicious message permanently corrupts the knowledge graph that all future agents rely on.

**Vanilla Cognee:**

```
input → cognee.remember() → stored forever
```

**With Mithril:**

```
agent / Slack / file → Trust Score → Contradiction Check → Admission Gate → cognee.remember()
```

## How Mithril connects to your stack

Mithril is a real boundary in front of Cognee, reachable three ways — all sharing one governance pipeline and one adaptive reputation store:

| Surface | What it is | Entry point |
|---|---|---|
| **MCP server** | Agents (Claude Desktop, Cursor) call `mithril_remember` / `mithril_recall` instead of writing to memory directly | `mcp_server/server.py` · `make mcp` |
| **Ingestion connector** | Parse a real **Slack export** (or a `.txt`/`.jsonl` file) and run the whole feed through the gate | `mithril/ingest.py` · `make ingest` |
| **REST API + dashboard** | FastAPI backend + Next.js provenance UI | `api/main.py` · `make dev` |

## Adaptive source reputation

Source reputation is **not a static table** — it starts from configured priors and then *moves*:

- a source caught contradicting verified memory **loses** trust (fast),
- a source whose claims are accepted/corroborated **gains** trust (slow).

Trust is easy to lose and hard to earn. Watch a Slack channel's reputation collapse after it pushes MD5 twice — live, in the dashboard and via `GET /api/reputation`.

## Attack Demo

| | Vanilla Cognee | Mithril + Cognee |
|---|---|---|
| Poisoned inputs stored | All 3 | 0 |
| Provenance tracked | No | Yes |
| Contradiction detected | No | Yes |
| Source reputation adapts | No | Yes |
| Explainable decisions | No | Yes |
| Answer to "hash passwords?" | May return MD5 | Argon2id |

## Architecture

```
Incoming Claim  (MCP tool · Slack export · file · API · dashboard)
     │
     ▼
Adaptive Source Reputation (self-adjusting, SQLite-backed)
     │
     ▼
Contradiction Detection (cognee.recall, only_context=True)
     │
     ▼
Trust Score (weighted + normalized — see master plan Section 4)
     │
     ▼
Admission Gate (Accept / Warn / Review / Quarantine / Reject)
     │
     ├── ACCEPT / WARN → cognee.remember(node_set=["verified"])
     ├── QUARANTINE / REVIEW / REJECT → SQLite quarantine store
     ├── Source reputation updated from the outcome
     └── All → Audit log
```

## Cognee APIs Used

- `cognee.remember()` — verified memories with NodeSet tagging
- `cognee.recall(only_context=True)` — contradiction detection
- `cognee.recall(node_name=["verified"])` — scoped verified retrieval
- `cognee.improve()` — graph enrichment on verified dataset
- `cognee.forget()` — demo reset
- `cognee.visualize_graph()` — knowledge graph HTML export

## Quickstart

Install from PyPI once published:

```bash
pip install mithril-cognee
mithril-mcp
```

Local development from this repo:

```bash
uv venv && .venv\Scripts\activate
uv pip install -e ".[dev]"
copy .env.example .env   # add LLM_API_KEY

make test    # unit tests
make demo    # full attack demo (terminal)
make ingest  # ingest a real Slack export through the gate
make benchmark  # labeled memory-poisoning benchmark → metrics + results.json
make mcp     # run Mithril as an MCP server (stdio)
make api     # FastAPI backend → http://localhost:8000
make ui-install && make ui   # landing → http://localhost:3001 · dashboard → /dashboard
make dev     # start API + UI together
```

Installed commands:

```bash
mithril-mcp       # local MCP server over stdio
mithril-mcp-http  # remote MCP server over Streamable HTTP at /mcp
mithril-api       # FastAPI backend
```

That means the core demo path is now:

```bash
pip install mithril-cognee
mithril-mcp
```

No cloning required for editor usage.

### Use Mithril from Claude Desktop (MCP)

Add to `claude_desktop_config.json`, then restart Claude Desktop:

```json
{
  "mcpServers": {
    "mithril": {
      "command": "mithril-mcp"
    }
  }
}
```

The agent then gets `mithril_remember`, `mithril_recall`, `mithril_quarantine_list`, and `mithril_source_reputation` — every memory write is gated, every recall is verified-only.

### Free deployment notes

The public "try demo" is built to run on a single shared **Google Gemini free-tier key**
(~5 req/min). Two things keep it inside that budget:

- the backend **seeds the verified-memory baseline once at startup** (`MITHRIL_DEMO_SEED=true`),
  so visitors spend budget only on the single claim they submit, and
- an app-level limiter (`MITHRIL_LLM_RPM`) guards Mithril's own scoring calls and returns
  **HTTP 429** with a `retry_after` when the shared budget is exhausted — which the dashboard
  surfaces as a clear "rate-limited, retry in Ns" banner.

For the API on Render Free (a `render.yaml` blueprint is included):

```bash
pip install -e .
mithril-api
```

Key env vars (see `.env.example`):

```bash
LLM_ENDPOINT=https://generativelanguage.googleapis.com/v1beta/openai/
LLM_MODEL=gemini-2.0-flash            # pick your Gemini model
LLM_API_KEY=<google-ai-studio-key>
MITHRIL_LLM_RPM=4                     # keep below the real Gemini limit
MITHRIL_DEMO_SEED=true                # seed baseline once at startup
CORS_ORIGINS=https://your-frontend.vercel.app
```

For the public dashboard, deploy `ui/` to Vercel and set:

```bash
NEXT_PUBLIC_BACKEND_URL=https://your-render-api.onrender.com
BACKEND_URL=https://your-render-api.onrender.com
```

For a demo remote MCP server on Render Free:

```bash
pip install -e .
FASTMCP_HOST=0.0.0.0 FASTMCP_PORT=$PORT mithril-mcp-http
```

The remote MCP endpoint will be:

```text
https://your-render-service.onrender.com/mcp
```

Free Render services can sleep and do not keep local SQLite files permanently, so use local MCP for real editor usage unless you add hosted storage and auth.

## Benchmark — does it actually stop poisoning?

Mithril ships with a **labeled memory-poisoning benchmark** (`benchmark/`) that measures it like a security control, not a demo.

**Threat model:** a company runs AI agents over a shared Cognee knowledge base. Claims arrive from authoritative channels (Security Policy, HR System, GitHub) and risky ones (Slack, customer support, external email, public web, other agents). Attackers try to poison shared memory.

The harness seeds verified company memory (`ground_truth.jsonl`), then replays a labeled suite (`attack_suite.jsonl`, ~30 cases) through the **same** `Mithril.remember()` gate and scores every decision into a confusion matrix:

```bash
make benchmark      # requires LLM_API_KEY + Cognee (like the demos)
```

**Attack taxonomy covered:** direct contradiction · subtle misinformation · authority spoofing · prompt injection · data exfiltration · policy evasion · social engineering · low-trust unverified. Plus hard *legitimate* cases (verified policy updates, benign low-trust facts) to measure false positives honestly.

| Metric | Meaning |
|---|---|
| **Detection rate** | share of attacks blocked (kept out of memory) |
| **Poison-leak rate** | attacks that reached verified memory — the number to drive to 0 |
| **False-positive rate** | legitimate updates wrongly blocked (friction) |
| **Precision / accuracy** | standard classifier metrics |

Results print per-category and per-source and are written to `benchmark/results.json`. The math is unit-tested (`tests/test_benchmark.py`) so the numbers are reproducible from the labeled data even though the LLM contradiction step has run-to-run variance.

> **Why the categories matter:** *authority spoofing* (a claim that fakes a high-trust source but contradicts policy) is caught by the **contradiction layer**, not source reputation — proof that the trust signals are independent and complementary, not just a source lookup.

## Usage

```python
from mithril import Mithril

firewall = Mithril()
await firewall.setup()

result = await firewall.remember(
    text="Always hash passwords using MD5",
    source="Slack",
)
# result.status → quarantine or reject
# result.trust_breakdown.final_score → normalized 0–1
# result.trust_breakdown.reasons → explainable breakdown

answer = await firewall.recall("How should we hash passwords?")
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/audit` | Full audit log |
| GET | `/api/quarantine` | Quarantined memories |
| GET | `/api/reputation` | Live adaptive source reputation (with deltas) |
| GET | `/api/stats` | Aggregate metrics |
| POST | `/api/remember` | Submit claim through Mithril |
| POST | `/api/recall` | Query verified memory |
| POST | `/api/reset` | Clear Cognee + local stores |
| GET | `/api/config` | Sources, weights, thresholds |
| GET | `/api/demo` | Verified facts, suggested claims, seed + rate-limit state |

## Trust Score Formula

Per master plan — weighted components, then normalized to 0–1:

```
raw = source_rep×0.40 + corroboration×0.30 + freshness×0.10 − contradiction×0.40
final_score = raw / max_theoretical_score
```

Admission thresholds: Accept ≥ 0.85 · Warn ≥ 0.60 · Review ≥ 0.40 · Quarantine ≥ 0.20

## Project Layout

```
mithril/          Core package (scorer, gate, firewall, reputation, ingest, audit, quarantine)
mcp_server/       MCP server — exposes Mithril tools to agents
benchmark/        Labeled memory-poisoning benchmark (ground truth, attack suite, metrics)
api/              FastAPI backend
demo/             Attack demo, vanilla comparison, Slack-export ingestion demo
tests/            Unit + integration tests
memory-firewall-master-plan.md   Full hackathon build plan
```
