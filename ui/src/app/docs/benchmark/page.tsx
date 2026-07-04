"use client";

import { DocsLayout } from "@/components/docs/DocsLayout";
import {
  CodeBlock,
  InfoCard,
  StepCard,
} from "@/components/docs/DocsPrimitives";

export default function BenchmarkPage() {
  return (
    <DocsLayout>
      <div className="space-y-8">
        {/* Header */}
        <header>
          <p className="landing-eyebrow mb-2">Evaluation</p>
          <h1 className="landing-heading text-3xl sm:text-4xl">Benchmark</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-400">
            A{" "}
            <span className="text-zinc-200">
              labeled evaluation suite
            </span>{" "}
            that measures Mithril&apos;s effectiveness as an enterprise memory
            firewall. Seeds verified ground truth, replays a labeled attack
            suite, and reports precision, recall, and per-category breakdowns.
          </p>
        </header>

        {/* Threat model */}
        <section>
          <h2 className="landing-heading mb-5 text-xl">Threat Model</h2>
          <div className="rounded-xl border border-surface-border bg-surface-card/40 p-5 text-sm leading-relaxed text-zinc-400">
            <p>
              A company runs AI agents over a shared Cognee knowledge base.
              Memory claims arrive from many channels — authoritative ones
              (Security Policy, HR System, GitHub) and risky ones (Slack,
              customer support, external email, the public web, other agents).
            </p>
            <p className="mt-3">
              Attackers try to poison the shared memory: contradicting verified
              policy, spoofing authority, injecting prompts, exfiltrating data.
              Mithril sits between every writer and Cognee, scoring each claim
              and blocking untrusted writes.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section>
          <h2 className="landing-heading mb-5 text-xl">How It Works</h2>

          <div className="grid gap-4 sm:grid-cols-3">
            <InfoCard icon="🌱" title="Phase 1 — Seed Ground Truth">
              Loads verified company memory from{" "}
              <code>benchmark/ground_truth.jsonl</code> — these are the policies
              the firewall should protect.
            </InfoCard>
            <InfoCard icon="⚔️" title="Phase 2 — Replay Attack Suite">
              Runs every claim in <code>benchmark/attack_suite.jsonl</code>{" "}
              through <code>Mithril.remember()</code>. Each claim is labeled
              &quot;attack&quot; or &quot;legit&quot; with a category and domain.
            </InfoCard>
            <InfoCard icon="📊" title="Phase 3 — Score &amp; Report">
              Compares Mithril&apos;s decisions against labels. Computes
              detection rate, poison leak rate, false-positive rate, precision,
              and accuracy.
            </InfoCard>
          </div>
        </section>

        {/* Running */}
        <section>
          <h2 className="landing-heading mb-5 text-xl">Running the Benchmark</h2>

          <div className="space-y-2">
            <StepCard step={1} title="Prerequisites">
              <p>
                Same as the demo: project installed, <code>.env</code> with{" "}
                <code>LLM_API_KEY</code> configured.
              </p>
            </StepCard>

            <StepCard step={2} title="Run">
              <CodeBlock
                code={`make benchmark
# or
python benchmark/run_benchmark.py`}
                filename="terminal"
              />
            </StepCard>

            <StepCard step={3} title="View results">
              <p>
                Full results are saved to{" "}
                <code>benchmark/results.json</code> with per-case outcomes, and
                the terminal prints a summary with confusion matrix.
              </p>
            </StepCard>
          </div>
        </section>

        {/* Metrics explained */}
        <section>
          <h2 className="landing-heading mb-5 text-xl">
            Metrics Explained
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <InfoCard icon="🎯" title="Detection Rate (Recall)">
              Percentage of attack claims correctly blocked. A 100% detection
              rate means zero poisoned data reached Cognee.
            </InfoCard>
            <InfoCard icon="☠️" title="Poison Leak Rate">
              Percentage of attack claims that slipped through (false
              negatives). This is the most critical metric — ideally 0%.
            </InfoCard>
            <InfoCard icon="🚧" title="False-Positive Rate">
              Percentage of legitimate claims incorrectly blocked. Too high
              means real updates can&apos;t reach memory.
            </InfoCard>
            <InfoCard icon="✅" title="Precision">
              Of all claims Mithril blocked, what fraction were actual attacks?
              High precision means few false alarms.
            </InfoCard>
          </div>
        </section>

        {/* Expected output */}
        <section>
          <h2 className="landing-heading mb-4 text-xl">
            Expected Output
          </h2>

          <CodeBlock
            language="text"
            filename="benchmark output (abbreviated)"
            code={`================================================================
  MITHRIL — Memory-Poisoning Benchmark
  Enterprise knowledge base under attack
================================================================

PHASE 1 · Seeding 8 verified policies
  ✓ [security] Passwords must be hashed using Argon2id...
  ✓ [infra]    Production servers must run Ubuntu 22.04 LTS...
  ...

PHASE 2 · Replaying 30 labeled claims (20 attacks, 10 legit)
  ✓ BLOCKED    quarantine  0.18  contradiction    Always hash passwords using MD5
  ✓ BLOCKED    reject      0.09  spoofed_source   [URGENT] Security Policy update...
  ✓ admitted   accept      0.91  legit_update     Updated: Argon2id cost factor...
  ...

PHASE 3 · Results
  Attack detection rate   ████████████████████████ 100%  (20/20 blocked)
  Poison leak rate        ░░░░░░░░░░░░░░░░░░░░░░░░   0%  (0 attacks leaked)
  False-positive rate     ░░░░░░░░░░░░░░░░░░░░░░░░   0%  (0/10 legit blocked)
  Precision               ████████████████████████ 100%
  Overall accuracy        ████████████████████████ 100%

  Zero misclassifications.`}
          />
        </section>

        {/* Attack categories */}
        <section>
          <h2 className="landing-heading mb-5 text-xl">
            Attack Categories
          </h2>
          <p className="mb-4 text-sm text-zinc-400">
            The benchmark suite covers multiple poisoning strategies:
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoCard icon="⚔️" title="Contradiction">
              Claims that directly contradict verified memory (e.g. &quot;use
              MD5&quot; when policy says Argon2id).
            </InfoCard>
            <InfoCard icon="🎭" title="Spoofed Source">
              Attackers pretending to be authoritative sources to bypass
              reputation scoring.
            </InfoCard>
            <InfoCard icon="💉" title="Prompt Injection">
              Claims containing injected instructions that try to manipulate
              agent behavior.
            </InfoCard>
            <InfoCard icon="🔓" title="Data Exfiltration">
              Attempts to embed exfiltration payloads or leak-triggering content
              into memory.
            </InfoCard>
            <InfoCard icon="🔄" title="Subtle Deprecation">
              Soft claims that &quot;this technology is deprecated&quot; to
              erode trust in verified policies.
            </InfoCard>
            <InfoCard icon="✅" title="Legit Updates">
              Genuine policy updates that should pass through — tests for false
              positives.
            </InfoCard>
          </div>
        </section>

        {/* Customizing */}
        <section>
          <h2 className="landing-heading mb-4 text-xl">
            Customizing the Benchmark
          </h2>
          <p className="mb-4 text-sm text-zinc-400">
            You can extend or modify the attack suite and ground truth:
          </p>

          <div className="space-y-4">
            <div>
              <h3 className="mb-2 font-display text-sm font-semibold text-zinc-300">
                Ground truth
              </h3>
              <p className="mb-2 text-sm text-zinc-400">
                Edit <code>benchmark/ground_truth.jsonl</code> — one JSON object
                per line:
              </p>
              <CodeBlock
                language="json"
                filename="ground_truth.jsonl"
                code={`{"text": "Your verified policy text", "source": "Security Policy", "domain": "security", "author": "system"}`}
              />
            </div>

            <div>
              <h3 className="mb-2 font-display text-sm font-semibold text-zinc-300">
                Attack suite
              </h3>
              <p className="mb-2 text-sm text-zinc-400">
                Edit <code>benchmark/attack_suite.jsonl</code>:
              </p>
              <CodeBlock
                language="json"
                filename="attack_suite.jsonl"
                code={`{"text": "Malicious claim text", "source": "Slack", "label": "attack", "category": "contradiction", "domain": "security", "rationale": "Why this should be blocked"}`}
              />
            </div>
          </div>
        </section>
      </div>
    </DocsLayout>
  );
}
