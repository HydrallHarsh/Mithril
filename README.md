# Mithril

> A trust and governance layer for Cognee memory.  
> Every AI can remember. **Mithril** decides what *deserves* to be remembered.

*(Formerly "Memory Firewall" — see `memory-firewall-master-plan.md` for the full build plan.)*

## The Problem

AI agents with persistent memory are vulnerable to **memory poisoning** — where a single malicious message permanently corrupts the knowledge graph that all future agents rely on.

**Vanilla Cognee:**

```
input → cognee.remember() → stored forever
```

**With Mithril:**

```
input → Trust Score → Contradiction Check → Admission Gate → cognee.remember()
```

## Attack Demo

| | Vanilla Cognee | Mithril + Cognee |
|---|---|---|
| Poisoned inputs stored | All 3 | 0 |
| Provenance tracked | No | Yes |
| Contradiction detected | No | Yes |
| Explainable decisions | No | Yes |
| Answer to "hash passwords?" | May return MD5 | Argon2id |

## Architecture

```
Incoming Claim
     │
     ▼
Source Reputation (config-driven)
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
make api     # FastAPI backend → http://localhost:8000
make ui-install && make ui   # landing → http://localhost:3001 · dashboard → /dashboard
make dev     # start API + UI together
```

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
mithril/          Core package (scorer, gate, firewall, audit, quarantine)
api/              FastAPI backend
demo/             Attack demo + vanilla comparison
tests/            Unit + integration tests
memory-firewall-master-plan.md   Full hackathon build plan
```
