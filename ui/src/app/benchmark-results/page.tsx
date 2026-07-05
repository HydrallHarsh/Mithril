"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  FileJson,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { fetchBenchmarkResults } from "@/lib/api";
import type { BenchmarkCase, BenchmarkResults } from "@/types";

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatCategory(value: string) {
  return value.replaceAll("_", " ");
}

export default function BenchmarkResultsPage() {
  const [results, setResults] = useState<BenchmarkResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBenchmarkResults()
      .then(setResults)
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : "Could not load benchmark/results.json",
        ),
      );
  }, []);

  const falsePositives = useMemo(
    () =>
      results?.cases.filter(
        (item) => item.label === "legit" && item.blocked,
      ) ?? [],
    [results],
  );

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
              Benchmark Results
            </h1>
            <p className="text-xs text-zinc-500">
              Full checked-in run from benchmark/results.json
            </p>
          </div>
          <div className="flex-1" />
          <Link
            href="/demo"
            className="rounded-md border border-surface-border px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-zinc-900"
          >
            Try Demo
          </Link>
          <a
            href="/api/benchmark-results"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-surface-border px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-zinc-900"
          >
            <FileJson className="h-3.5 w-3.5" />
            Raw JSON
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {error ? (
          <div className="border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-100">
            {error}
          </div>
        ) : !results ? (
          <div className="border border-surface-border bg-surface-card p-8 text-sm text-zinc-500">
            Loading benchmark results...
          </div>
        ) : (
          <BenchmarkReport results={results} falsePositives={falsePositives} />
        )}
      </section>
    </main>
  );
}

function BenchmarkReport({
  results,
  falsePositives,
}: {
  results: BenchmarkResults;
  falsePositives: BenchmarkCase[];
}) {
  const { summary } = results;
  const hardBlocks =
    summary.confusion_matrix.false_positives - summary.legit_sent_to_review;

  return (
    <div className="space-y-6">
      <section className="border border-surface-border bg-surface-card p-6">
        <div className="mb-6 flex flex-wrap items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-brand-500/30 bg-brand-500/10 text-brand-300">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="landing-eyebrow mb-2">Security Result</p>
            <h2 className="font-display text-3xl font-semibold tracking-display text-zinc-50 sm:text-4xl">
              Mithril blocked every poisoned memory attempt.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400 sm:text-base">
              The full benchmark replayed {summary.total_cases} labeled claims:
              {" "}
              {summary.attacks} attacks and {summary.legit} legitimate updates.
              In this run, {summary.confusion_matrix.true_positives}/
              {summary.attacks} attacks were blocked and{" "}
              {summary.confusion_matrix.false_negatives} poisoned claims reached
              verified memory.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard
            label="Attack detection"
            value={formatPercent(summary.detection_rate)}
            detail={`${summary.confusion_matrix.true_positives}/${summary.attacks} attacks blocked`}
          />
          <MetricCard
            label="Poison leak"
            value={formatPercent(summary.poison_leak_rate)}
            detail={`${summary.confusion_matrix.false_negatives} attacks admitted`}
          />
          <MetricCard
            label="Precision"
            value={formatPercent(summary.precision)}
            detail="blocked items that were attacks"
          />
          <MetricCard
            label="Accuracy"
            value={formatPercent(summary.accuracy)}
            detail={`${summary.total_cases} total cases`}
          />
          <MetricCard
            label="False positives"
            value={formatPercent(summary.false_positive_rate)}
            detail={`${summary.confusion_matrix.false_positives}/${summary.legit} legit held back`}
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="border border-surface-border bg-surface-card p-5">
          <div className="mb-4 flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-brand-300" />
            <h2 className="font-display text-base font-semibold tracking-display text-zinc-100">
              Confusion Matrix
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <MatrixCell
              label="TP"
              title="Poison blocked"
              value={summary.confusion_matrix.true_positives}
              tone="good"
            />
            <MatrixCell
              label="FN"
              title="Poison leaked"
              value={summary.confusion_matrix.false_negatives}
              tone="bad"
            />
            <MatrixCell
              label="FP"
              title="Legit held back"
              value={summary.confusion_matrix.false_positives}
              tone="warn"
            />
            <MatrixCell
              label="TN"
              title="Legit admitted"
              value={summary.confusion_matrix.true_negatives}
              tone="good"
            />
          </div>
        </div>

        <div className="border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="mb-4 flex items-center gap-3">
            <TriangleAlert className="h-5 w-5 text-amber-300" />
            <h2 className="font-display text-base font-semibold tracking-display text-amber-100">
              How to Read This Honestly
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-amber-100/85">
            This run proves a fail-closed security posture: no poisoned claim
            entered verified memory. The tradeoff is review friction. Mithril
            held back {summary.confusion_matrix.false_positives}/{summary.legit}
            {" "}legitimate updates, including {summary.legit_sent_to_review} review
            decisions and {hardBlocks} quarantine or reject decisions.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-amber-100/75">
            Most missed legitimate cases are authorized updates that supersede
            older facts. The next production feature is versioned memory
            supersession, so high-trust policy updates can replace old verified
            memory without weakening attack detection.
          </p>
        </div>
      </section>

      <section className="border border-surface-border bg-surface-card p-5">
        <div className="mb-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-brand-300" />
          <h2 className="font-display text-base font-semibold tracking-display text-zinc-100">
            Attack Coverage
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(results.by_category).map(([category, bucket]) => (
            <div
              key={category}
              className="rounded-md border border-surface-border bg-black/20 p-4"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="capitalize text-sm font-medium text-zinc-200">
                  {formatCategory(category)}
                </h3>
                <span className="font-mono text-sm text-brand-300">
                  {bucket.correct}/{bucket.total}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-brand-400"
                  style={{
                    width: `${Math.round((bucket.correct / bucket.total) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border border-surface-border bg-surface-card">
        <div className="border-b border-surface-border px-5 py-4">
          <h2 className="font-display text-base font-semibold tracking-display text-zinc-100">
            Legitimate Updates Held Back
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            These explain the {formatPercent(summary.false_positive_rate)} false
            positive rate.
          </p>
        </div>
        <div className="divide-y divide-surface-border">
          {falsePositives.map((item, index) => (
            <div key={`${item.text}-${index}`} className="px-5 py-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded bg-zinc-900 px-2 py-0.5 text-xs text-zinc-500">
                  {item.source}
                </span>
                <span className="rounded bg-amber-500/10 px-2 py-0.5 text-xs text-amber-300">
                  {item.status}
                </span>
                <span className="font-mono text-xs text-zinc-500">
                  score {item.score.toFixed(2)}
                </span>
              </div>
              <p className="font-mono text-xs leading-relaxed text-zinc-400">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function MetricCard({
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
      <p className="mt-2 font-display text-3xl font-semibold tracking-display text-zinc-50">
        {value}
      </p>
      <p className="mt-1 text-xs text-zinc-500">{detail}</p>
    </div>
  );
}

function MatrixCell({
  label,
  title,
  value,
  tone,
}: {
  label: string;
  title: string;
  value: number;
  tone: "good" | "warn" | "bad";
}) {
  const toneClass =
    tone === "good"
      ? "text-brand-300 border-brand-500/20 bg-brand-500/5"
      : tone === "warn"
        ? "text-amber-300 border-amber-500/20 bg-amber-500/5"
        : "text-rose-300 border-rose-500/20 bg-rose-500/5";

  return (
    <div className={`rounded-md border p-4 ${toneClass}`}>
      <p className="font-mono text-xs">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold tracking-display">
        {value}
      </p>
      <p className="mt-1 text-xs opacity-80">{title}</p>
    </div>
  );
}
