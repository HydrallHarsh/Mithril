"use client";

import { DocsLayout } from "@/components/docs/DocsLayout";
import {
  CodeBlock,
  InfoCard,
  StepCard,
} from "@/components/docs/DocsPrimitives";

export default function RunDemoPage() {
  return (
    <DocsLayout>
      <div className="space-y-8">
        {/* Header */}
        <header>
          <p className="landing-eyebrow mb-2">Try It Out</p>
          <h1 className="landing-heading text-3xl sm:text-4xl">Run Demo</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-400">
            A full{" "}
            <span className="text-zinc-200">
              end-to-end attack simulation
            </span>{" "}
            that demonstrates how Mithril protects Cognee memory from poisoning.
            Seeds legitimate policies, fires off attacks, and proves the firewall
            blocks every one.
          </p>
        </header>

        {/* What the demo does */}
        <section>
          <h2 className="landing-heading mb-5 text-xl">
            What the Demo Does
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <InfoCard icon="📋" title="Phase 1 — Seed Legitimate Memory">
              Loads 3 verified security policies (Argon2id hashing, cost factor
              requirements, bcrypt fallback) from trusted sources into Cognee
              through Mithril&apos;s trust gate.
            </InfoCard>
            <InfoCard icon="⚡" title="Phase 2 — Simulate Attacks">
              Fires 3 poisoning attempts: a direct contradiction via Slack
              (&quot;use MD5&quot;), a deprecation claim from an unknown agent, and
              misinformation via email. All should be blocked.
            </InfoCard>
            <InfoCard icon="✅" title="Phase 3 — Legitimate Update">
              Ingests a genuine policy update from the CISO to prove real updates
              still pass the trust gate without being blocked.
            </InfoCard>
            <InfoCard icon="🔍" title="Phase 4 — Query Verified Memory">
              Asks &quot;How should we hash passwords?&quot; — the answer comes
              only from verified memory. Poisoned claims are excluded.
            </InfoCard>
          </div>
        </section>

        {/* Running the demo */}
        <section>
          <h2 className="landing-heading mb-5 text-xl">Running the Demo</h2>

          <div className="space-y-2">
            <StepCard step={1} title="Prerequisites">
              <p>
                Make sure you have the project installed and <code>.env</code>{" "}
                configured with your <code>LLM_API_KEY</code> (needed for
                contradiction detection via the LLM):
              </p>
              <div className="mt-3">
                <CodeBlock
                  code={`uv pip install -e ".[dev]"
cp .env.example .env
# Set LLM_API_KEY in .env`}
                  filename="terminal"
                />
              </div>
            </StepCard>

            <StepCard step={2} title="Run the attack demo">
              <CodeBlock
                code={`make demo
# or
python demo/run_demo.py`}
                filename="terminal"
              />
            </StepCard>

            <StepCard step={3} title="Compare: run without Mithril">
              <p className="mb-3">
                See what happens when Cognee has no protection — all poisoned
                claims are stored and returned:
              </p>
              <CodeBlock
                code={`make vanilla
# or
python demo/vanilla_demo.py`}
                filename="terminal"
              />
            </StepCard>
          </div>
        </section>

        {/* Expected output */}
        <section>
          <h2 className="landing-heading mb-4 text-xl">
            Expected Output
          </h2>
          <p className="mb-4 text-sm text-zinc-400">
            The demo prints a colorized, step-by-step report. Here&apos;s a
            summary of what you&apos;ll see:
          </p>

          <CodeBlock
            language="text"
            filename="demo output (abbreviated)"
            code={`============================================================
  MITHRIL — Attack Demo
  Protecting Cognee from memory poisoning
============================================================

PHASE 1: Loading legitimate security policies
  ✅ ACCEPTED  Passwords must be hashed using Argon2id...  (score: 0.91)
  ✅ ACCEPTED  Argon2id requires minimum cost factor...    (score: 0.91)
  ✅ ACCEPTED  bcrypt is acceptable as a fallback...       (score: 0.89)
  → 3 verified policies now in Cognee

PHASE 2: Simulating memory poisoning attacks
  ⚡ Attack 1: Direct contradiction via Slack
    🚫 QUARANTINE
    Score:  0.18
    Reason: Contradicts verified memory

  ⚡ Attack 2: Subtle deprecation claim from unknown agent
    ❌ REJECT
    Score:  0.09
    Reason: Low-trust source + contradiction detected

  ⚡ Attack 3: Plausible misinformation via email
    🚫 QUARANTINE
    Score:  0.15
    Reason: Contradicts verified memory

PHASE 4: Querying verified memory
  Question: How should we hash passwords?
  Mithril Answer: Passwords must be hashed using Argon2id
  with a minimum cost factor of 12...

PHASE 5: Audit Summary
  Attacks blocked: 3 / 3

  ✅ Mithril protected Cognee from all poisoning attacks.`}
          />
        </section>

        {/* Other demo scripts */}
        <section>
          <h2 className="landing-heading mb-5 text-xl">
            Other Demo Scripts
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoCard icon="📂" title="Ingest Demo">
              <code>python demo/ingest_demo.py</code> — Bulk-ingest a Slack
              export JSON through Mithril, demonstrating the batch ingestion
              pipeline with trust scoring applied to every message.
            </InfoCard>
            <InfoCard icon="🌱" title="Seed Data">
              <code>python demo/seed_data.py</code> — Pre-load a set of
              verified policies without the full attack sequence. Useful for
              populating the dashboard with realistic data.
            </InfoCard>
          </div>
        </section>
      </div>
    </DocsLayout>
  );
}
