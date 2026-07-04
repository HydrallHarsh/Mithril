"use client";

import { DocsLayout } from "@/components/docs/DocsLayout";
import {
  CodeBlock,
  InfoCard,
  StepCard,
  ParamTable,
} from "@/components/docs/DocsPrimitives";

export default function PythonSdkPage() {
  return (
    <DocsLayout>
      <div className="space-y-8">
        {/* Header */}
        <header>
          <p className="landing-eyebrow mb-2">Direct Integration</p>
          <h1 className="landing-heading text-3xl sm:text-4xl">Python SDK</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-400">
            Import Mithril directly in your Python code. No HTTP server needed —
            the same governance pipeline used by the MCP server and REST API is
            available as a simple async class.
          </p>
        </header>

        {/* Quick start */}
        <section>
          <h2 className="landing-heading mb-5 text-xl">Quick Start</h2>

          <CodeBlock
            language="python"
            filename="example.py"
            code={`from mithril import Mithril

firewall = Mithril()
await firewall.setup()

# Submit a memory claim through the trust gate
result = await firewall.remember(
    text="Passwords must be hashed using Argon2id",
    source="Security Policy",
    author="policy_admin",
)

print(result.status)                     # AdmissionStatus.ACCEPT
print(result.trust_breakdown.final_score)  # 0.91
print(result.decision_reason)            # "Score 0.91 meets acceptance..."
print(result.trust_breakdown.reasons)    # Explainable breakdown list

# Query verified memory only
answer = await firewall.recall("How should we hash passwords?")
print(answer)  # "Passwords must be hashed using Argon2id..."

# Query with metadata (candidates count, blocked count)
result = await firewall.recall_with_metadata("How should we hash passwords?")
print(result.answer)
print(result.candidate_count)  # 3
print(result.blocked_count)    # 2`}
          />
        </section>

        {/* Installation */}
        <section>
          <h2 className="landing-heading mb-5 text-xl">Installation</h2>

          <div className="space-y-2">
            <StepCard step={1} title="Clone and install">
              <CodeBlock
                code={`git clone <repo-url>
cd hack-ideas2
uv pip install -e ".[dev]"
# or: pip install -e ".[dev]"`}
                filename="terminal"
              />
            </StepCard>

            <StepCard step={2} title="Configure environment">
              <p className="mb-3">
                Copy <code>.env.example</code> to <code>.env</code> and fill in
                your LLM API key (needed for contradiction detection):
              </p>
              <CodeBlock
                code={`cp .env.example .env
# Set LLM_API_KEY, LLM_ENDPOINT, LLM_MODEL in .env`}
                filename="terminal"
              />
            </StepCard>
          </div>
        </section>

        {/* Mithril class reference */}
        <section>
          <h2 className="landing-heading mb-5 text-xl">
            Mithril Class Reference
          </h2>

          {/* setup */}
          <div className="mb-8 space-y-3">
            <h3 className="flex items-center gap-2 font-display text-base font-semibold text-zinc-200">
              <span className="rounded-md bg-memory-500/15 px-2 py-0.5 font-mono text-xs text-memory-400 border border-memory-500/20">
                async
              </span>
              setup()
            </h3>
            <p className="text-sm text-zinc-400">
              Initialize SQLite stores (audit, quarantine, reputation). Must be
              called once before using the firewall.
            </p>
            <CodeBlock
              language="python"
              code={`firewall = Mithril()
await firewall.setup()`}
            />
          </div>

          {/* remember */}
          <div className="mb-8 space-y-3">
            <h3 className="flex items-center gap-2 font-display text-base font-semibold text-zinc-200">
              <span className="rounded-md bg-memory-500/15 px-2 py-0.5 font-mono text-xs text-memory-400 border border-memory-500/20">
                async
              </span>
              remember(text, source, author, metadata)
            </h3>
            <p className="text-sm text-zinc-400">
              Submit a memory claim through the full governance pipeline:
              credential redaction → source reputation lookup → contradiction
              detection → trust scoring → admission gate → storage or quarantine
              → audit logging → reputation update.
            </p>
            <ParamTable
              params={[
                {
                  name: "text",
                  type: "str",
                  required: true,
                  description: "The claim or fact to evaluate.",
                },
                {
                  name: "source",
                  type: "str",
                  required: true,
                  description:
                    'Channel or origin — e.g. "Slack", "Security Policy".',
                },
                {
                  name: "author",
                  type: "str",
                  required: false,
                  description:
                    'Who produced the claim. Defaults to "unknown".',
                },
                {
                  name: "metadata",
                  type: "dict | None",
                  required: false,
                  description:
                    "Additional metadata to attach to the claim.",
                },
              ]}
            />
            <p className="text-sm text-zinc-400">
              Returns an{" "}
              <code>AdmissionResult</code> with the full decision and provenance.
            </p>
          </div>

          {/* recall */}
          <div className="mb-8 space-y-3">
            <h3 className="flex items-center gap-2 font-display text-base font-semibold text-zinc-200">
              <span className="rounded-md bg-memory-500/15 px-2 py-0.5 font-mono text-xs text-memory-400 border border-memory-500/20">
                async
              </span>
              recall(query) → str
            </h3>
            <p className="text-sm text-zinc-400">
              Query only verified memory. Returns the answer as a string.
              Poisoned / quarantined data is excluded. Secrets are re-scrubbed
              on output.
            </p>
          </div>

          {/* recall_with_metadata */}
          <div className="mb-8 space-y-3">
            <h3 className="flex items-center gap-2 font-display text-base font-semibold text-zinc-200">
              <span className="rounded-md bg-memory-500/15 px-2 py-0.5 font-mono text-xs text-memory-400 border border-memory-500/20">
                async
              </span>
              recall_with_metadata(query) → RecallResult
            </h3>
            <p className="text-sm text-zinc-400">
              Same as <code>recall()</code> but returns a{" "}
              <code>RecallResult</code> with <code>answer</code>,{" "}
              <code>candidate_count</code>, and <code>blocked_count</code>.
            </p>
          </div>

          {/* get_audit_trail */}
          <div className="mb-8 space-y-3">
            <h3 className="flex items-center gap-2 font-display text-base font-semibold text-zinc-200">
              <span className="rounded-md bg-memory-500/15 px-2 py-0.5 font-mono text-xs text-memory-400 border border-memory-500/20">
                async
              </span>
              get_audit_trail() → list[dict]
            </h3>
            <p className="text-sm text-zinc-400">
              Returns the full audit log — every claim evaluated, with status,
              score, source, reason, and timestamp.
            </p>
          </div>

          {/* get_quarantine */}
          <div className="mb-8 space-y-3">
            <h3 className="flex items-center gap-2 font-display text-base font-semibold text-zinc-200">
              <span className="rounded-md bg-memory-500/15 px-2 py-0.5 font-mono text-xs text-memory-400 border border-memory-500/20">
                async
              </span>
              get_quarantine() → list[dict]
            </h3>
            <p className="text-sm text-zinc-400">
              Returns all quarantined / rejected / review claims with provenance.
            </p>
          </div>

          {/* get_reputation */}
          <div className="mb-8 space-y-3">
            <h3 className="flex items-center gap-2 font-display text-base font-semibold text-zinc-200">
              <span className="rounded-md bg-memory-500/15 px-2 py-0.5 font-mono text-xs text-memory-400 border border-memory-500/20">
                async
              </span>
              get_reputation() → list[dict]
            </h3>
            <p className="text-sm text-zinc-400">
              Returns all sources with current live reputation, prior, delta,
              and accept/block counts.
            </p>
          </div>

          {/* get_stats */}
          <div className="mb-8 space-y-3">
            <h3 className="flex items-center gap-2 font-display text-base font-semibold text-zinc-200">
              <span className="rounded-md bg-memory-500/15 px-2 py-0.5 font-mono text-xs text-memory-400 border border-memory-500/20">
                async
              </span>
              get_stats() → FirewallStats
            </h3>
            <p className="text-sm text-zinc-400">
              Aggregate metrics: total evaluated, accepted, warned, reviewed,
              quarantined, rejected, block rate, and average trust score.
            </p>
          </div>

          {/* reset */}
          <div className="mb-8 space-y-3">
            <h3 className="flex items-center gap-2 font-display text-base font-semibold text-zinc-200">
              <span className="rounded-md bg-memory-500/15 px-2 py-0.5 font-mono text-xs text-memory-400 border border-memory-500/20">
                async
              </span>
              reset()
            </h3>
            <p className="text-sm text-zinc-400">
              Wipe all Cognee memory and all SQLite stores (audit, quarantine,
              reputation). Reseeds reputation priors. Used for clean demos.
            </p>
          </div>

          {/* improve */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 font-display text-base font-semibold text-zinc-200">
              <span className="rounded-md bg-memory-500/15 px-2 py-0.5 font-mono text-xs text-memory-400 border border-memory-500/20">
                async
              </span>
              improve()
            </h3>
            <p className="text-sm text-zinc-400">
              Run Cognee graph enrichment on the verified memory dataset. Builds
              richer connections between accepted claims.
            </p>
          </div>
        </section>

        {/* Data models */}
        <section>
          <h2 className="landing-heading mb-5 text-xl">
            Key Data Models
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <InfoCard icon="📦" title="AdmissionResult">
              <div className="space-y-1 font-mono text-xs">
                <p><code>.claim</code> — MemoryClaim</p>
                <p><code>.trust_breakdown</code> — TrustScoreBreakdown</p>
                <p><code>.status</code> — AdmissionStatus enum</p>
                <p><code>.decision_reason</code> — human-readable string</p>
                <p><code>.cognee_dataset</code> — set if stored in Cognee</p>
                <p><code>.redacted_secrets</code> — list of secret kinds found</p>
              </div>
            </InfoCard>
            <InfoCard icon="📊" title="TrustScoreBreakdown">
              <div className="space-y-1 font-mono text-xs">
                <p><code>.final_score</code> — normalized 0–1</p>
                <p><code>.source_reputation</code> — live reputation used</p>
                <p><code>.contradiction_penalty</code> — 0–1 LLM score</p>
                <p><code>.corroboration_bonus</code> — 0–0.3</p>
                <p><code>.freshness_bonus</code> — 0–0.05</p>
                <p><code>.reasons</code> — explainable breakdown list</p>
              </div>
            </InfoCard>
            <InfoCard icon="🚦" title="AdmissionStatus">
              <div className="space-y-1 font-mono text-xs">
                <p><code>ACCEPT</code> — stored in Cognee (verified)</p>
                <p><code>WARN</code> — stored but flagged</p>
                <p><code>REVIEW</code> — held for human review</p>
                <p><code>QUARANTINE</code> — isolated in SQLite</p>
                <p><code>REJECT</code> — rejected outright</p>
              </div>
            </InfoCard>
            <InfoCard icon="🔍" title="RecallResult">
              <div className="space-y-1 font-mono text-xs">
                <p><code>.query</code> — original question</p>
                <p><code>.answer</code> — verified-only answer</p>
                <p><code>.candidate_count</code> — verified chunks found</p>
                <p><code>.blocked_count</code> — quarantined claims excluded</p>
              </div>
            </InfoCard>
          </div>
        </section>

        {/* Ingestion connectors */}
        <section>
          <h2 className="landing-heading mb-5 text-xl">
            Ingestion Connectors
          </h2>
          <p className="mb-4 text-sm text-zinc-400">
            Bulk-ingest real message feeds through the governance pipeline:
          </p>

          <CodeBlock
            language="python"
            filename="slack_ingest_example.py"
            code={`from mithril import (
    Mithril,
    ingest_slack_export,
    load_generic_file,
    ingest_messages,
)

firewall = Mithril()
await firewall.setup()

# Ingest a Slack export JSON
results = await ingest_slack_export(firewall, "data/slack_export.json")
print(f"{len(results)} messages processed")

# Ingest a generic .txt or .jsonl file
messages = load_generic_file("data/claims.jsonl")
results = await ingest_messages(
    firewall, messages, source="Internal Wiki"
)

# Each result is an AdmissionResult with full provenance
for r in results:
    print(f"{r.status.value}: {r.claim.text[:50]}")`}
          />

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <InfoCard icon="💬" title="Slack Export">
              Parses the standard workspace-export JSON (array of message
              objects or object with <code>messages</code> key). Bot/system
              noise is automatically skipped. Author and timestamp are preserved
              as real provenance.
            </InfoCard>
            <InfoCard icon="📄" title="Generic File">
              One claim per line (<code>.txt</code>) or one JSON object per line
              (<code>.jsonl</code> with <code>text</code>, <code>source</code>,
              <code>author</code> keys). Lines that fail to parse are skipped
              with a warning.
            </InfoCard>
          </div>
        </section>

        {/* Standalone utilities */}
        <section>
          <h2 className="landing-heading mb-5 text-xl">
            Standalone Utilities
          </h2>

          <CodeBlock
            language="python"
            filename="utilities.py"
            code={`from mithril import (
    compute_trust_score,
    redact_secrets,
    contains_secret,
    scan_secrets,
    ReputationStore,
)

# Check a string for secrets
has_secret = contains_secret("my-api-key: sk-proj-abc123xyz")
print(has_secret)  # True

# Redact secrets and get match details
redacted, matches = redact_secrets(
    "Use token ghp_abc123def456ghi789jkl012mno345pqr678"
)
print(redacted)   # "Use token [REDACTED:github_token]"
print(matches[0].kind)  # "github_token"

# Scan without redacting
matches = scan_secrets("Bearer eyJhbGciOiJIUzI1NiIs...")
for m in matches:
    print(f"{m.kind}: chars {m.start}–{m.end}")`}
          />
        </section>
      </div>
    </DocsLayout>
  );
}
