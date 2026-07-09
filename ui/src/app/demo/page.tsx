"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Brain,
  CheckCircle2,
  Cloud,
  Database,
  Flame,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldCheck,
  Timer,
} from "lucide-react";

import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { StatusBadge } from "@/components/StatusBadge";
import {
  RateLimitError,
  fetchBenchmarkResults,
  fetchDemo,
  fetchHealth,
  fetchReputation,
  fetchStats,
  resetDashboard,
  submitRecall,
  submitRemember,
} from "@/lib/api";
import type {
  BenchmarkResults,
  ConnectionMode,
  DashboardStats,
  DemoState,
  RateLimitSnapshot,
  RecallResult,
  RememberResult,
  ReputationEntry,
  SuggestedClaim,
} from "@/types";
import { isBlockedStatus } from "@/types";

const RECALL_QUERY = "How should we hash passwords?";

const FALLBACK_SOURCES = [
  "Slack",
  "Unknown Agent",
  "AI Agent",
  "External Email",
  "Public Web",
  "Security Policy",
  "Official Docs",
];

function connectionCopy(mode: ConnectionMode) {
  return mode === "live" ? "Live backend" : "Backend offline";
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default function JudgeDemoPage() {
  const [mode, setMode] = useState<ConnectionMode>("mock");
  const [demo, setDemo] = useState<DemoState | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [reputation, setReputation] = useState<ReputationEntry[]>([]);
  const [benchmark, setBenchmark] = useState<BenchmarkResults | null>(null);
  const [recall, setRecall] = useState<RecallResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Claim composer
  const [claimText, setClaimText] = useState("");
  const [claimSource, setClaimSource] = useState("Slack");
  const [lastResult, setLastResult] = useState<RememberResult | null>(null);

  // Rate-limit banner (shared Gemini free tier)
  const [rateLimit, setRateLimit] = useState<RateLimitSnapshot | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    const health = await fetchHealth();
    setMode(health.mode);

    const [demoData, statsData, reputationData] = await Promise.all([
      fetchDemo().catch(() => null),
      fetchStats().catch(() => null),
      fetchReputation().catch(() => []),
    ]);

    setDemo(demoData);
    setStats(statsData);
    setReputation(reputationData);
    if (demoData?.rate_limit) setRateLimit(demoData.rate_limit);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    fetchBenchmarkResults()
      .then(setBenchmark)
      .catch(() => setBenchmark(null));
  }, []);

  // Poll while the baseline is still warming so the UI flips to "ready".
  useEffect(() => {
    if (demo?.seed_state !== "warming") return;
    const id = setInterval(() => {
      fetchDemo()
        .then((next) => {
          setDemo(next);
          if (next.rate_limit) setRateLimit(next.rate_limit);
        })
        .catch(() => undefined);
    }, 4000);
    return () => clearInterval(id);
  }, [demo?.seed_state]);

  const startCooldown = useCallback((seconds: number) => {
    const total = Math.max(1, Math.ceil(seconds));
    setCooldown(total);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const hosted = Boolean(demo?.seed_enabled);
  const live = mode === "live";
  const seedState = demo?.seed_state ?? "idle";
  const warming = seedState === "warming";
  const rateLimited = cooldown > 0;

  const sourceOptions = demo?.source_options?.length
    ? demo.source_options
    : FALLBACK_SOURCES;
  const suggestions: SuggestedClaim[] = demo?.suggested_claims ?? [];

  function applySuggestion(s: SuggestedClaim) {
    setClaimText(s.text);
    setClaimSource(s.source);
    setLastResult(null);
    setError(null);
  }

  async function handleSubmitClaim() {
    if (!claimText.trim() || busy) return;
    setBusy("submit");
    setError(null);
    setLastResult(null);
    try {
      const result = await submitRemember({
        text: claimText.trim(),
        source: claimSource,
        author: "public_demo",
      });
      setLastResult(result);
      await load();
    } catch (err) {
      if (err instanceof RateLimitError) {
        if (err.rateLimit) setRateLimit(err.rateLimit);
        startCooldown(err.retryAfter);
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Claim failed");
      }
    } finally {
      setBusy(null);
    }
  }

  async function handleRecall() {
    setBusy("recall");
    setError(null);
    try {
      const result = await submitRecall(RECALL_QUERY);
      setRecall(result);
    } catch (err) {
      if (err instanceof RateLimitError) {
        startCooldown(err.retryAfter);
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Recall failed");
      }
    } finally {
      setBusy(null);
    }
  }

  async function handleReset() {
    setBusy("reset");
    setError(null);
    setRecall(null);
    setLastResult(null);
    try {
      await resetDashboard();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setBusy(null);
    }
  }

  const topReputation = useMemo(() => reputation.slice(0, 5), [reputation]);

  return (
    <main className="min-h-screen bg-surface font-body text-zinc-100">
      <header className="border-b border-surface-border bg-surface/90">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-zinc-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
          <div className="h-4 w-px bg-surface-border" />
          <div>
            <h1 className="font-display text-lg font-semibold tracking-display text-zinc-50">
              Try the Firewall
            </h1>
            <p className="text-xs text-zinc-500">
              Seeded verified memory — submit one claim and watch the gate decide
            </p>
          </div>
          <div className="flex-1" />
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
              live
                ? "border-brand-500/30 bg-brand-500/5 text-brand-300"
                : "border-amber-500/30 bg-amber-500/5 text-amber-300"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                live ? "animate-pulse bg-brand-400" : "bg-amber-400"
              }`}
            />
            {connectionCopy(mode)}
          </span>
          <Link
            href="/dashboard"
            className="rounded-md border border-surface-border px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-zinc-900"
          >
            Dashboard
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          {/* Rate-limit banner */}
          {rateLimited && (
            <div className="flex items-start gap-3 border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              <Timer className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <div>
                <p className="font-medium">
                  Demo is rate-limited — retry in {cooldown}s
                </p>
                <p className="mt-1 text-amber-100/80">
                  This live demo shares one Google Gemini free-tier key
                  {rateLimit
                    ? ` (${rateLimit.limit} requests / ${rateLimit.interval_seconds}s).`
                    : "."}{" "}
                  Your claim wasn&apos;t evaluated — try again once the timer ends.
                </p>
              </div>
            </div>
          )}

          {!live && (
            <div className="flex items-start gap-3 border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-100/90">
              <Cloud className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <span>
                Backend offline. Start FastAPI with <code>make api</code> (or open
                the hosted deployment) to run live claims through Mithril.
              </span>
            </div>
          )}

          {/* Intro */}
          <div className="border border-surface-border bg-surface-card p-5">
            <div className="mb-4 flex flex-wrap items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-brand-500/30 bg-brand-500/10 text-brand-300">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="landing-eyebrow mb-2">Live Walkthrough</p>
                <h2 className="font-display text-2xl font-semibold tracking-display text-zinc-50 sm:text-3xl">
                  Try to poison verified memory. Watch Mithril stop it.
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  The knowledge base below is already seeded with trusted security
                  policy. Pick a pre-written attack, or write your own claim, and
                  submit it — you&apos;ll see the real trust score, contradiction
                  check, and admission decision.
                </p>
              </div>
            </div>

            {stats && (
              <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
                <span>{stats.total_evaluated} evaluated</span>
                <span>{stats.blocked} blocked</span>
                <span>{stats.entered_cognee} entered Cognee</span>
                {rateLimit && (
                  <span className="text-zinc-400">
                    {rateLimit.remaining}/{rateLimit.limit} requests left this
                    window
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Verified memory (seeded) */}
          <section className="border border-surface-border bg-surface-card">
            <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-brand-300" />
                <h2 className="font-display text-base font-semibold tracking-display text-zinc-100">
                  Verified Memory
                </h2>
              </div>
              {warming ? (
                <span className="inline-flex items-center gap-2 text-xs text-amber-300">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Warming up…
                </span>
              ) : (
                <span className="text-xs text-zinc-500">
                  what the firewall currently trusts
                </span>
              )}
            </div>
            <div className="divide-y divide-surface-border">
              {loading ? (
                <div className="px-5 py-8 text-sm text-zinc-500">Loading…</div>
              ) : demo && demo.verified_facts.length > 0 ? (
                demo.verified_facts.map((fact) => (
                  <div
                    key={fact.text}
                    className="flex items-start gap-3 px-5 py-3.5"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" />
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-200">{fact.text}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {fact.source}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-5 py-8 text-sm text-zinc-500">
                  No verified memory loaded.
                </div>
              )}
            </div>
          </section>

          {/* Try to infiltrate */}
          <section className="border border-surface-border bg-surface-card p-5">
            <div className="mb-4 flex items-center gap-3">
              <Flame className="h-5 w-5 text-accent-300" />
              <h2 className="font-display text-base font-semibold tracking-display text-zinc-100">
                Try to Infiltrate
              </h2>
            </div>

            {suggestions.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => applySuggestion(s)}
                    title={s.hint}
                    className="rounded-full border border-surface-border bg-black/20 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-accent-500/40 hover:bg-accent-500/5"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            <label className="mb-2 block text-xs uppercase tracking-label text-zinc-500">
              Claim
            </label>
            <textarea
              value={claimText}
              onChange={(e) => setClaimText(e.target.value)}
              rows={3}
              placeholder="e.g. Always hash passwords using MD5."
              className="mb-3 w-full resize-none rounded-md border border-surface-border bg-black/30 p-3 font-mono text-sm text-zinc-100 outline-none transition focus:border-brand-500/40"
            />

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs uppercase tracking-label text-zinc-500">
                  Source
                </label>
                <select
                  value={claimSource}
                  onChange={(e) => setClaimSource(e.target.value)}
                  className="rounded-md border border-surface-border bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-brand-500/40"
                >
                  {sourceOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1" />
              <button
                type="button"
                onClick={handleSubmitClaim}
                disabled={
                  !live || warming || rateLimited || busy !== null || !claimText.trim()
                }
                className="inline-flex items-center gap-2 rounded-md bg-brand-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-brand-300 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {busy === "submit" ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Submit claim
              </button>
            </div>

            {lastResult && (
              <div className="mt-5 rounded-md border border-surface-border bg-black/20 p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={lastResult.status} />
                  {isBlockedStatus(lastResult.status) ? (
                    <span className="rounded bg-rose-500/10 px-2 py-0.5 text-xs text-rose-300">
                      kept out of memory
                    </span>
                  ) : (
                    <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
                      entered verified memory
                    </span>
                  )}
                  <span className="rounded bg-zinc-900 px-2 py-0.5 text-xs text-zinc-500">
                    {lastResult.source}
                  </span>
                  <div className="flex-1" />
                  <ScoreBreakdown
                    score={lastResult.trust_score}
                    decisionReason={lastResult.decision_reason}
                    reasons={lastResult.reasons}
                  />
                </div>
                <p className="font-mono text-xs leading-relaxed text-zinc-400">
                  {lastResult.text}
                </p>
                {lastResult.decision_reason && (
                  <p className="mt-2 text-xs text-zinc-500">
                    {lastResult.decision_reason}
                  </p>
                )}
              </div>
            )}

            {error && !rateLimited && (
              <div className="mt-4 border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            )}
          </section>

          {benchmark && <BenchmarkPanel results={benchmark} />}
        </div>

        <aside className="space-y-5">
          <section className="border border-surface-border bg-surface-card p-5">
            <div className="mb-4 flex items-center gap-3">
              <Brain className="h-5 w-5 text-memory-300" />
              <h2 className="font-display text-base font-semibold tracking-display text-zinc-100">
                Verified Recall
              </h2>
            </div>
            <p className="mb-3 font-mono text-xs text-zinc-500">{RECALL_QUERY}</p>
            <button
              type="button"
              onClick={handleRecall}
              disabled={!live || warming || rateLimited || busy !== null}
              className="mb-3 inline-flex items-center gap-2 rounded-md border border-surface-border px-3 py-1.5 text-xs text-zinc-200 transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {busy === "recall" ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Brain className="h-3.5 w-3.5" />
              )}
              Ask verified memory
            </button>
            {recall ? (
              <div className="space-y-3">
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-brand-500/20 bg-brand-500/5 p-3 font-mono text-xs leading-relaxed text-zinc-200">
                  {recall.answer}
                </pre>
                <p className="text-xs text-zinc-500">
                  {recall.candidate_count} verified candidate(s),{" "}
                  {recall.blocked_count} blocked claim(s) excluded.
                </p>
              </div>
            ) : (
              <div className="rounded-md border border-surface-border bg-black/20 p-4 text-sm text-zinc-500">
                Ask the firewall what it trusts — you only get verified answers.
              </div>
            )}
          </section>

          <section className="border border-surface-border bg-surface-card p-5">
            <div className="mb-4 flex items-center gap-3">
              <Cloud className="h-5 w-5 text-brand-300" />
              <h2 className="font-display text-base font-semibold tracking-display text-zinc-100">
                {hosted ? "Hosted on Google Gemini" : "LLM Backend"}
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-zinc-400">
              {hosted
                ? "Every decision here is a live call to Google Gemini through Mithril's gate. The demo shares one free-tier key, so submissions are rate-limited — if you hit the cap, the banner tells you when to retry."
                : "Point LLM_ENDPOINT/LLM_API_KEY at any OpenAI-compatible provider (Gemini, AgentRouter, local Ollama) to run the gate."}
            </p>
            {rateLimit && (
              <div className="mt-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Budget this window</span>
                  <span className="font-mono text-zinc-500">
                    {rateLimit.remaining}/{rateLimit.limit}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-brand-400 transition-all"
                    style={{
                      width: `${
                        rateLimit.limit
                          ? Math.round(
                              (rateLimit.remaining / rateLimit.limit) * 100,
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            )}
          </section>

          <section className="border border-surface-border bg-surface-card p-5">
            <h2 className="mb-4 font-display text-base font-semibold tracking-display text-zinc-100">
              Source Reputation
            </h2>
            <div className="space-y-3">
              {topReputation.length === 0 ? (
                <p className="text-sm text-zinc-500">No reputation data yet.</p>
              ) : (
                topReputation.map((row) => (
                  <div key={row.source} className="space-y-1">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="capitalize text-zinc-300">
                        {row.source}
                      </span>
                      <span className="font-mono text-zinc-500">
                        {formatPercent(row.reputation)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-brand-400"
                        style={{ width: `${Math.round(row.reputation * 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Local/dev-only reset — hidden on the hosted shared demo. */}
          {!hosted && live && (
            <button
              type="button"
              onClick={handleReset}
              disabled={busy !== null}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-surface-border px-3 py-2.5 text-xs text-zinc-300 transition hover:border-rose-500/40 hover:bg-rose-500/5 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <RotateCcw className="h-4 w-4 text-rose-300" />
              Reset demo state (local only)
            </button>
          )}
        </aside>
      </section>
    </main>
  );
}

function BenchmarkPanel({ results }: { results: BenchmarkResults }) {
  const summary = results.summary;
  const categories = Object.entries(results.by_category);

  return (
    <section className="border border-surface-border bg-surface-card p-5">
      <div className="mb-5 flex flex-wrap items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-brand-500/30 bg-brand-500/10 text-brand-300">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="landing-eyebrow mb-2">Full Benchmark</p>
          <h2 className="font-display text-xl font-semibold tracking-display text-zinc-50">
            {summary.confusion_matrix.true_positives}/{summary.attacks} attacks
            blocked, {summary.confusion_matrix.false_negatives} poison leaks.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Latest checked-in run from <code>benchmark/results.json</code>.
          </p>
        </div>
        <Link
          href="/benchmark-results"
          className="rounded-md border border-brand-500/30 bg-brand-500/10 px-3 py-1.5 text-xs text-brand-200 transition hover:bg-brand-500/15"
        >
          Detailed report
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <BenchmarkStat
          label="Attack detection"
          value={formatPercent(summary.detection_rate)}
          detail={`${summary.confusion_matrix.true_positives}/${summary.attacks} blocked`}
        />
        <BenchmarkStat
          label="Poison leak"
          value={formatPercent(summary.poison_leak_rate)}
          detail={`${summary.confusion_matrix.false_negatives} reached memory`}
        />
        <BenchmarkStat
          label="Precision"
          value={formatPercent(summary.precision)}
          detail="blocked claims that were attacks"
        />
        <BenchmarkStat
          label="Accuracy"
          value={formatPercent(summary.accuracy)}
          detail={`${summary.total_cases} labeled cases`}
        />
      </div>

      <div className="mt-5">
        <h3 className="mb-3 text-sm font-medium text-zinc-200">
          Attack categories
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {categories.map(([category, bucket]) => (
            <div
              key={category}
              className="flex items-center justify-between gap-3 rounded-md border border-surface-border bg-black/20 px-3 py-2 text-xs"
            >
              <span className="capitalize text-zinc-400">
                {category.replaceAll("_", " ")}
              </span>
              <span className="font-mono text-brand-300">
                {bucket.correct}/{bucket.total}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BenchmarkStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-md border border-surface-border bg-black/20 p-4">
      <p className="text-xs uppercase tracking-label text-zinc-500">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold tracking-display text-zinc-50">
        {value}
      </p>
      <p className="mt-1 text-xs text-zinc-500">{detail}</p>
    </div>
  );
}
