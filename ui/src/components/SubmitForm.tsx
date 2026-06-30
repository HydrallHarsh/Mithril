"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { submitRemember } from "@/lib/api";
import type { AppConfig, RememberResult } from "@/types";

interface SubmitFormProps {
  config: AppConfig;
  onSubmitted: () => void;
  disabled?: boolean;
}

export function SubmitForm({ config, onSubmitted, disabled }: SubmitFormProps) {
  const [text, setText] = useState("");
  const [source, setSource] = useState(config.source_options[0] ?? "Slack");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RememberResult | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim() || loading || disabled) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await submitRemember({ text: text.trim(), source });
      setResult(response);
      setText("");
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-surface-border bg-surface-card p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-200">
        <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
        Submit a claim
      </h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='e.g. "Always hash passwords using MD5"'
          rows={4}
          disabled={loading || disabled}
          className="w-full resize-none rounded-md border border-surface-border bg-black/30 px-3 py-2 font-mono text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-brand-500/50 focus:outline-none focus:ring-1 focus:ring-brand-500/30 disabled:opacity-50"
        />
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          disabled={loading || disabled}
          className="w-full rounded-md border border-surface-border bg-black/30 px-3 py-2 text-sm text-zinc-200 focus:border-brand-500/50 focus:outline-none focus:ring-1 focus:ring-brand-500/30 disabled:opacity-50"
        >
          {config.source_options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading || disabled || !text.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-brand-400 px-4 py-2 text-sm font-semibold text-zinc-950 shadow-lg shadow-brand-500/20 transition hover:bg-brand-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          {loading && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-950" />
          )}
          {loading ? "Evaluating…" : "Submit →"}
        </button>
      </form>

      {error && (
        <p className="mt-3 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-4 space-y-3 rounded-md border border-surface-border bg-black/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <StatusBadge status={result.status} />
            <ScoreBreakdown
              score={result.trust_score}
              decisionReason={result.decision_reason}
              reasons={result.reasons}
            />
          </div>
          <p className="font-mono text-xs text-zinc-400">{result.text}</p>
        </div>
      )}
    </div>
  );
}
