"use client";

import { DocsLayout } from "@/components/docs/DocsLayout";
import { CodeBlock, InfoCard } from "@/components/docs/DocsPrimitives";

export default function ArchitecturePage() {
  return (
    <DocsLayout>
      <div className="space-y-10">
        {/* Header */}
        <header>
          <p className="landing-eyebrow mb-2">System Design</p>
          <h1 className="landing-heading text-3xl sm:text-4xl">
            Architecture
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-400">
            How Mithril&apos;s governance pipeline works — from incoming claim to
            admission decision. Every component is independent, testable, and
            contributes a distinct trust signal.
          </p>
        </header>

        {/* Full pipeline */}
        <section>
          <h2 className="landing-heading mb-5 text-xl">
            Governance Pipeline
          </h2>
          <div className="overflow-hidden rounded-xl border border-surface-border bg-[#0a0c12] p-5 sm:p-6">
            <pre className="overflow-x-auto font-mono text-[0.78rem] leading-relaxed text-zinc-400">
              {`Incoming Claim  (MCP tool · Slack export · file · API · dashboard)
     │
     ▼
┌──────────────────────────────────────────────────────────────┐
│  1. Credential Exfiltration Guard  (secrets.py)              │
│     Regex-based scanner (AWS keys, GitHub tokens, JWTs,      │
│     PEM blocks, DB URIs, Bearer tokens, key=value creds).    │
│     Redacts BEFORE anything else — Cognee, LLM, audit log    │
│     never see the raw value.                                 │
│     Credential planting penalizes source reputation.         │
└──────────────────────────────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────────────────────┐
│  2. Adaptive Source Reputation  (reputation.py)              │
│     SQLite-backed, self-adjusting EWMA.                      │
│     Starts from configured priors (Security Policy: 0.98,    │
│     Slack: 0.60, Unknown Agent: 0.30, etc.).                 │
│     PENALTY_RATE = 0.22 (fast) · REWARD_RATE = 0.10 (slow)  │
│     Trust is easy to lose, hard to earn.                     │
│     Weight: source_rep × 0.40                                │
└──────────────────────────────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────────────────────┐
│  3. Contradiction Detection  (memory_analysis.py)            │
│     cognee.recall(only_context=True) pulls verified context. │
│     LLM scores contradiction 0.0 → 1.0 (<score> tags).      │
│     Threshold: score > 0.3 = contradiction found.            │
│     Corroboration: extra aligned chunks = bonus (max 3).     │
│     Also scores standalone content danger before admission.   │
│     Weights: contradiction × -0.40, corroboration × 0.25     │
│              content_danger × -0.35                          │
└──────────────────────────────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────────────────────┐
│  4. Trust Scorer  (scorer.py)                                │
│     raw = src×0.40 + corroboration×0.25 + freshness×0.05    │
│           - contradiction×0.40 - content_danger×0.35         │
│     final_score = raw / max_theoretical_score                │
│     Normalized to [0, 1] so thresholds apply cleanly.        │
└──────────────────────────────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────────────────────┐
│  5. Admission Gate  (gate.py)                                │
│     Pure function: maps final_score → AdmissionStatus.       │
│     ≥ 0.85 → Accept   ≥ 0.60 → Warn    ≥ 0.40 → Review     │
│     ≥ 0.20 → Quarantine       < 0.20 → Reject               │
└──────────────────────────────────────────────────────────────┘
     │
     ├── ACCEPT / WARN  → cognee.remember(node_set=["verified"])
     ├── QUARANTINE / REVIEW / REJECT → SQLite quarantine store
     ├── Source reputation updated (EWMA) from the outcome
     └── All decisions → Audit log (SQLite)`}
            </pre>
          </div>
        </section>

        {/* Trust scoring deep dive */}
        <section>
          <h2 className="landing-heading mb-5 text-xl">
            Trust Score Formula
          </h2>
          <p className="mb-4 text-sm text-zinc-400">
            The trust score is a weighted sum of five independent signals, then
            normalized to [0, 1]:
          </p>

          <CodeBlock
            language="text"
            filename="scorer.py — weighted formula"
            code={`raw = source_reputation × 0.40
    + corroboration    × 0.25
    + freshness        × 0.05
    - contradiction    × 0.40
    - content_danger   × 0.35

final_score = clamp(raw / max_theoretical_score, 0, 1)`}
          />

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <InfoCard icon="👤" title="Source Reputation (×0.40)">
              Each source has a live reputation (0.0–1.0) stored in SQLite.
              Starts from configured priors (e.g. Security Policy = 0.98, Slack
              = 0.60). Adjusts with every decision via bounded EWMA. Penalty
              rate (0.22) is 2× the reward rate (0.10) — trust is asymmetric.
            </InfoCard>
            <InfoCard icon="🤝" title="Corroboration (×0.25)">
              When Cognee retrieves multiple aligned verified chunks for a claim,
              each extra chunk (beyond the first) counts as independent
              corroboration. Capped at 3 chunks x 0.1 = max 0.30 raw bonus,
              then weighted by 0.25 in the final score.
            </InfoCard>
            <InfoCard icon="⏱️" title="Freshness (×0.05)">
              Newer claims get a small bonus. Decays linearly from 0.05 to 0
              over 90 days. Recent policy updates are slightly favored over stale
              facts.
            </InfoCard>
            <InfoCard icon="⚔️" title="Contradiction (×-0.40)">
              LLM-scored 0.0–1.0 against existing verified memory. If
              contradiction score exceeds 0.3, the claim is flagged. The penalty
              weight is equal to source reputation — a single contradiction can
              wipe out even a high-trust source&apos;s advantage.
            </InfoCard>
            <InfoCard icon="🚧" title="Content Danger (×-0.35)">
              The same analysis pass asks the configured LLM whether the claim is
              inherently dangerous, even when no verified memory exists yet.
              Scores above 0.5 are penalized as security anti-patterns or
              malicious instructions.
            </InfoCard>
          </div>
        </section>

        {/* Credential guard */}
        <section>
          <h2 className="landing-heading mb-5 text-xl">
            Credential Exfiltration Guard
          </h2>
          <p className="mb-4 text-sm text-zinc-400">
            Memory poisoning has a mirror-image threat:{" "}
            <span className="text-zinc-200">credential planting</span>. An agent
            or poisoned message writes an API key into shared memory. Once it&apos;s
            in the graph, every future agent with recall access can read it — a
            durable data leak.
          </p>
          <p className="mb-6 text-sm text-zinc-400">
            Mithril treats this as an attack on the trust system, not just a
            privacy scrub:
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            <InfoCard icon="🔒" title="Redact at Ingest">
              Credentials are stripped <em>before</em> anything else — Cognee,
              the LLM, and the audit log never see the raw value. On recall,
              answers are scrubbed again to catch memory that predates the
              firewall.
            </InfoCard>
            <InfoCard icon="📉" title="Penalize the Source">
              A source caught planting credentials loses trust exactly like a
              source caught contradicting verified memory. The reputation hit is
              permanent and compounds.
            </InfoCard>
            <InfoCard icon="📋" title="Record It">
              Every redacted secret type is logged in the audit trail as
              attempted exfiltration with the full decision provenance.
            </InfoCard>
          </div>

          <h3 className="mb-3 mt-6 font-display text-sm font-semibold text-zinc-300">
            Detected Credential Types
          </h3>
          <div className="overflow-hidden rounded-xl border border-surface-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-surface-card/60">
                  <th className="px-4 py-2.5 text-left text-[0.7rem] font-semibold uppercase tracking-label text-zinc-500">
                    Kind
                  </th>
                  <th className="px-4 py-2.5 text-left text-[0.7rem] font-semibold uppercase tracking-label text-zinc-500">
                    Pattern
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {[
                  ["Private Key PEM", "-----BEGIN ... PRIVATE KEY-----"],
                  ["AWS Access Key", "AKIA / ASIA + 16 alphanumeric"],
                  ["GitHub Token", "ghp_, gho_, ghu_, ghs_, ghr_ + 36+ chars"],
                  ["Slack Token", "xoxb-, xoxp-, xoxa- + 10+ chars"],
                  ["Google API Key", "AIza + 35 chars"],
                  ["OpenAI / SK Key", "sk- (with or-, proj-, ant- prefix)"],
                  ["Stripe Key", "sk_live_, rk_test_ + 16+ chars"],
                  ["JSON Web Token", "eyJ...header.payload.signature"],
                  ["DB URI Credentials", "://user:password@ in connection URIs"],
                  ["Bearer Token", "Bearer + 16+ char token"],
                  ["Credential Assignment", "password=, api_key=, secret= values"],
                ].map(([kind, pattern]) => (
                  <tr key={kind}>
                    <td className="px-4 py-2 text-zinc-300">{kind}</td>
                    <td className="px-4 py-2 font-mono text-xs text-zinc-500">
                      {pattern}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Adaptive reputation deep dive */}
        <section>
          <h2 className="landing-heading mb-5 text-xl">
            Adaptive Source Reputation
          </h2>
          <p className="mb-4 text-sm text-zinc-400">
            Source reputation is not a static lookup table. It starts from
            configured priors and <em>moves</em> with every decision using a
            bounded exponential weighted moving average (EWMA):
          </p>

          <CodeBlock
            language="python"
            filename="reputation.py — update rules"
            code={`# Trust earned per good outcome (slow to build)
REWARD_RATE  = 0.10
# Trust lost per bad outcome (fast to lose)
PENALTY_RATE = 0.22

# On a good decision (accept/warn, no contradiction):
new_rep = clamp(current + 0.10 × (1.0 - current))

# On a bad decision (quarantine/reject, or contradiction found):
new_rep = clamp(current + 0.22 × (0.0 - current))

# Floor: 0.05 — even the worst source can still submit
# Ceiling: 0.99 — perfection is never reached`}
          />

          <p className="mt-4 text-sm text-zinc-400">
            This means a Slack channel at 0.60 reputation drops to ~0.47 after
            one blocked claim, and to ~0.36 after two. Recovering back to 0.60
            requires many consecutive accepted claims. The asymmetry is
            intentional — it mirrors how trust works in the real world.
          </p>
        </section>

        {/* Cognee integration */}
        <section>
          <h2 className="landing-heading mb-5 text-xl">
            Cognee Integration
          </h2>
          <p className="mb-4 text-sm text-zinc-400">
            Mithril uses specific Cognee APIs to create a separation between
            verified and quarantined memory:
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <InfoCard icon="📝" title="cognee.remember()">
              Verified memories are stored with{" "}
              <code>node_set=[&quot;verified&quot;, source_name]</code> into the{" "}
              <code>verified_memories</code> dataset. Warned claims additionally
              get the <code>low_confidence</code> tag.
            </InfoCard>
            <InfoCard icon="🔍" title="cognee.recall(only_context=True)">
              Used for contradiction detection — retrieves verified context
              chunks that the LLM then scores for contradiction. This is a
              read-only probe, not a query.
            </InfoCard>
            <InfoCard icon="📖" title='cognee.recall(node_name=["verified"])'>
              Used for verified recall — only returns memories that passed the
              trust gate. Quarantined data is invisible. Defense-in-depth:
              answers are scrubbed for secrets again on output.
            </InfoCard>
            <InfoCard icon="🧠" title="cognee.improve()">
              Graph enrichment can be run on the verified dataset to build richer
              connections between accepted memories. Called via{" "}
              <code>firewall.improve()</code>.
            </InfoCard>
          </div>
        </section>

        {/* Entry points */}
        <section>
          <h2 className="landing-heading mb-5 text-xl">
            Three Entry Points, One Gate
          </h2>
          <p className="mb-4 text-sm text-zinc-400">
            No matter how a claim enters Mithril, it passes through the same
            governance pipeline:
          </p>
          <div className="overflow-hidden rounded-xl border border-surface-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-surface-card/60">
                  <th className="px-4 py-2.5 text-left text-[0.7rem] font-semibold uppercase tracking-label text-zinc-500">
                    Surface
                  </th>
                  <th className="px-4 py-2.5 text-left text-[0.7rem] font-semibold uppercase tracking-label text-zinc-500">
                    What it is
                  </th>
                  <th className="px-4 py-2.5 text-left text-[0.7rem] font-semibold uppercase tracking-label text-zinc-500">
                    Entry point
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                <tr>
                  <td className="px-4 py-2.5 font-medium text-zinc-200">
                    MCP Server
                  </td>
                  <td className="px-4 py-2.5 text-zinc-400">
                    Agents call <code>mithril_remember</code> /{" "}
                    <code>mithril_recall</code> over stdio
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-zinc-500">
                    mcp_server/server.py
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium text-zinc-200">
                    Ingestion Connector
                  </td>
                  <td className="px-4 py-2.5 text-zinc-400">
                    Parse Slack export or .txt/.jsonl file and run every
                    message through the gate
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-zinc-500">
                    mithril/ingest.py
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium text-zinc-200">
                    REST API + Dashboard
                  </td>
                  <td className="px-4 py-2.5 text-zinc-400">
                    FastAPI backend + Next.js provenance UI
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-zinc-500">
                    api/main.py
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Project layout */}
        <section>
          <h2 className="landing-heading mb-4 text-xl">Project Layout</h2>
          <CodeBlock
            language="text"
            filename="project structure"
            code={`mithril/           Core package
  ├── firewall.py       Main Mithril class — chains the full pipeline
  ├── scorer.py         Weighted trust score formula
  ├── gate.py           Admission gate (score → status)
  ├── reputation.py     Adaptive source reputation (SQLite EWMA)
  ├── memory_analysis.py  Contradiction detection + corroboration
  ├── secrets.py        Credential exfiltration guard (11 patterns)
  ├── ingest.py         Slack export / file ingestion connectors
  ├── audit.py          SQLite audit log
  ├── quarantine.py     SQLite quarantine store
  ├── models.py         Shared dataclasses and enums
  ├── config.py         Weights, thresholds, source priors
  └── utils.py          Recall text extraction helpers

mcp_server/        MCP server — exposes 4 tools to agents
api/               FastAPI backend (9 endpoints)
benchmark/         Labeled memory-poisoning benchmark
demo/              Attack demo, vanilla comparison, ingestion demo
tests/             Unit + integration tests
ui/                Next.js landing page + provenance dashboard`}
          />
        </section>
      </div>
    </DocsLayout>
  );
}
