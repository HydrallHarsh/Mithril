"use client";

import { useState } from "react";
import { submitRecall } from "@/lib/api";
import type { RecallResult } from "@/types";

interface RecallPanelProps {
  disabled?: boolean;
}

export function RecallPanel({ disabled }: RecallPanelProps) {
  const [query, setQuery] = useState("How should we hash passwords?");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecallResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim() || loading || disabled) return;

    setLoading(true);
    setError(null);

    try {
      const response = await submitRecall(query.trim());
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recall failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-surface-border bg-surface-card p-4">
      <h2 className="mb-1 text-sm font-medium text-zinc-200">Query verified memory</h2>
      <p className="mb-3 text-xs text-zinc-600">
        Uses Cognee recall with NodeSet filter — poisoned memories excluded
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={loading || disabled}
          className="w-full rounded-md border border-surface-border bg-black/30 px-3 py-2 font-mono text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || disabled || !query.trim()}
          className="w-full rounded-md border border-surface-border px-4 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900 disabled:opacity-40"
        >
          {loading ? "Recalling…" : "Ask Mithril"}
        </button>
      </form>

      {error && (
        <p className="mt-3 text-xs text-red-400">{error}</p>
      )}

      {result && (
        <div className="mt-4 space-y-2 rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3">
          <p className="text-[11px] uppercase tracking-wide text-emerald-500/80">
            Verified answer
          </p>
          <pre className="whitespace-pre-wrap font-mono text-xs text-zinc-200">
            {result.answer}
          </pre>
          <p className="text-[11px] text-zinc-600">
            {result.candidate_count} candidate(s) · {result.blocked_count} blocked in audit
          </p>
        </div>
      )}
    </div>
  );
}
