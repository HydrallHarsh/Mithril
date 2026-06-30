# Mithril

> A trust and governance layer for Cognee memory.  
> Every AI can remember. **Mithril** decides what *deserves* to be remembered.

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

### Use Mithril from Claude Desktop (MCP)

Add to `claude_desktop_config.json`, then restart Claude Desktop:

```json
{
  "mcpServers": {
    "mithril": {
      "command": "python",
      "args": ["-m", "mcp_server.server"],
      "cwd": "/absolute/path/to/hack-ideas2"
    }
  }
}
```

The agent then gets `mithril_remember`, `mithril_recall`, `mithril_quarantine_list`, and `mithril_source_reputation` — every memory write is gated, every recall is verified-only.

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
