"use client";

import { DocsLayout } from "@/components/docs/DocsLayout";
import {
  CodeBlock,
  Endpoint,
  InfoCard,
  StepCard,
  ParamTable,
} from "@/components/docs/DocsPrimitives";

export default function RestApiPage() {
  return (
    <DocsLayout>
      <div className="space-y-8">
        {/* Header */}
        <header>
          <p className="landing-eyebrow mb-2">Integration Guide</p>
          <h1 className="landing-heading text-3xl sm:text-4xl">REST API</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-400">
            A{" "}
            <span className="text-zinc-200">
              FastAPI backend
            </span>{" "}
            that exposes Mithril&apos;s trust-scoring, admission gating, and
            audit trail over standard HTTP endpoints. Powers the dashboard and
            can be used by any HTTP client.
          </p>
        </header>

        {/* Quick start */}
        <section>
          <h2 className="landing-heading mb-5 text-xl">Quick Start</h2>

          <div className="space-y-2">
            <StepCard step={1} title="Start the API server">
              <CodeBlock
                code={`make api
# or
uvicorn api.main:app --port 8000 --reload`}
                filename="terminal"
              />
              <p className="mt-2">
                The server runs at{" "}
                <code>http://localhost:8000</code>. Interactive docs are
                available at <code>/docs</code> (Swagger UI).
              </p>
            </StepCard>

            <StepCard step={2} title="Submit a memory claim">
              <CodeBlock
                language="bash"
                filename="terminal"
                code={`curl -X POST http://localhost:8000/api/remember \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "Passwords must use Argon2id.",
    "source": "Security Policy",
    "author": "policy_admin"
  }'`}
              />
            </StepCard>

            <StepCard step={3} title="Query verified memory">
              <CodeBlock
                language="bash"
                filename="terminal"
                code={`curl -X POST http://localhost:8000/api/recall \\
  -H "Content-Type: application/json" \\
  -d '{"query": "How should we hash passwords?"}'`}
              />
            </StepCard>
          </div>
        </section>

        {/* Endpoints */}
        <section>
          <h2 className="landing-heading mb-5 text-xl">Endpoints</h2>

          <div className="space-y-3">
            <Endpoint
              method="POST"
              path="/api/remember"
              description="Submit a memory claim through the trust gate"
            />
            <Endpoint
              method="POST"
              path="/api/recall"
              description="Query verified memory only"
            />
            <Endpoint
              method="GET"
              path="/api/audit"
              description="Full audit trail of all evaluated claims"
            />
            <Endpoint
              method="GET"
              path="/api/quarantine"
              description="List quarantined / rejected claims"
            />
            <Endpoint
              method="GET"
              path="/api/reputation"
              description="Live source reputation scores"
            />
            <Endpoint
              method="GET"
              path="/api/stats"
              description="Aggregate dashboard metrics"
            />
            <Endpoint
              method="GET"
              path="/api/config"
              description="Current scoring weights and thresholds"
            />
            <Endpoint
              method="POST"
              path="/api/reset"
              description="Clear all Cognee memory and audit stores"
            />
            <Endpoint
              method="GET"
              path="/api/health"
              description="Health check"
            />
          </div>
        </section>

        {/* POST /api/remember detail */}
        <section>
          <h2 className="landing-heading mb-4 text-xl">
            POST /api/remember
          </h2>
          <p className="mb-4 text-sm text-zinc-400">
            Submit a text claim for trust scoring and conditional storage into
            Cognee. Returns the admission decision, full trust-score breakdown,
            and any secrets that were redacted.
          </p>

          <h3 className="mb-3 font-display text-sm font-semibold text-zinc-300">
            Request Body
          </h3>
          <ParamTable
            params={[
              {
                name: "text",
                type: "string",
                required: true,
                description: "The memory claim to evaluate (min 1 character).",
              },
              {
                name: "source",
                type: "string",
                required: true,
                description:
                  'Channel / origin — e.g. "Slack", "Security Policy", "AI Agent".',
              },
              {
                name: "author",
                type: "string",
                required: false,
                description:
                  'Who submitted the claim. Defaults to "demo_user".',
              },
            ]}
          />

          <h3 className="mb-3 mt-5 font-display text-sm font-semibold text-zinc-300">
            Example Response
          </h3>
          <CodeBlock
            language="json"
            filename="200 OK"
            code={`{
  "status": "accept",
  "decision_reason": "High-trust source, no contradictions",
  "trust_breakdown": {
    "source_reputation": 0.98,
    "contradiction_penalty": 0.0,
    "corroboration_bonus": 0.0,
    "freshness_bonus": 0.10,
    "final_score": 0.91,
    "reasons": [
      "Source reputation (Security Policy): 0.98",
      "Freshness bonus: +0.10",
      "No contradiction detected"
    ]
  },
  "cognee_dataset": "verified_memories",
  "redacted_secrets": []
}`}
          />
        </section>

        {/* POST /api/recall detail */}
        <section>
          <h2 className="landing-heading mb-4 text-xl">
            POST /api/recall
          </h2>
          <p className="mb-4 text-sm text-zinc-400">
            Answers a natural-language question using only claims that passed the
            trust gate. Blocked / quarantined data is automatically excluded.
          </p>

          <ParamTable
            params={[
              {
                name: "query",
                type: "string",
                required: true,
                description:
                  "The question to answer from verified memory.",
              },
            ]}
          />

          <CodeBlock
            language="json"
            filename="200 OK"
            code={`{
  "query": "How should we hash passwords?",
  "answer": "Passwords must be hashed using Argon2id with a minimum cost factor of 12.",
  "candidate_count": 3,
  "blocked_count": 2
}`}
          />
        </section>

        {/* Admission statuses */}
        <section>
          <h2 className="landing-heading mb-5 text-xl">
            Admission Statuses
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoCard icon="✅" title="accept (≥ 0.85)">
              High-trust claim stored directly in Cognee verified memory.
            </InfoCard>
            <InfoCard icon="⚠️" title="warn (≥ 0.60)">
              Stored but flagged — moderate confidence, may need human review.
            </InfoCard>
            <InfoCard icon="🔍" title="review (≥ 0.40)">
              Held for manual review. Not stored until approved.
            </InfoCard>
            <InfoCard icon="🚫" title="quarantine (≥ 0.20)">
              Contradicts verified memory or very low trust. Stored in
              quarantine DB only.
            </InfoCard>
            <InfoCard icon="❌" title="reject (&lt; 0.20)">
              Extremely low trust. Rejected outright and logged to audit trail.
            </InfoCard>
          </div>
        </section>

        {/* Source reputation table */}
        <section>
          <h2 className="landing-heading mb-4 text-xl">
            Default Source Reputation
          </h2>
          <p className="mb-4 text-sm text-zinc-400">
            Each source starts with a prior reputation. Scores adapt over time
            as claims from that source are accepted or blocked.
          </p>
          <div className="overflow-hidden rounded-xl border border-surface-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-surface-card/60">
                  <th className="px-4 py-2.5 text-left text-[0.7rem] font-semibold uppercase tracking-label text-zinc-500">
                    Source
                  </th>
                  <th className="px-4 py-2.5 text-left text-[0.7rem] font-semibold uppercase tracking-label text-zinc-500">
                    Prior Score
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {[
                  ["Security Policy", "0.98"],
                  ["HR System", "0.95"],
                  ["Official Docs", "0.95"],
                  ["GitHub PR", "0.90"],
                  ["Jira", "0.85"],
                  ["Engineering Blog", "0.80"],
                  ["Internal Wiki", "0.75"],
                  ["Slack", "0.60"],
                  ["Email", "0.55"],
                  ["Customer Support", "0.50"],
                  ["AI Agent", "0.40"],
                  ["External Email", "0.40"],
                  ["Unknown Agent", "0.30"],
                  ["Public Web", "0.25"],
                  ["Untrusted", "0.10"],
                ].map(([source, score]) => {
                  const val = parseFloat(score);
                  const color =
                    val >= 0.8
                      ? "text-brand-400"
                      : val >= 0.5
                        ? "text-amber-400"
                        : "text-red-400";
                  return (
                    <tr key={source}>
                      <td className="px-4 py-2 text-zinc-300">{source}</td>
                      <td className={`px-4 py-2 font-mono ${color}`}>
                        {score}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DocsLayout>
  );
}
