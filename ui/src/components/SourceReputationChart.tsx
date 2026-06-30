"use client";

import type { ReputationEntry } from "@/types";

interface SourceReputationChartProps {
  reputation: ReputationEntry[];
}

function barColor(score: number): string {
  if (score >= 0.8) return "bg-brand-400";
  if (score >= 0.5) return "bg-accent-400";
  if (score >= 0.3) return "bg-amber-400";
  return "bg-rose-400";
}

function titleCase(source: string): string {
  return source.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function SourceReputationChart({
  reputation,
}: SourceReputationChartProps) {
  const entries = [...reputation]
    .sort((a, b) => b.reputation - a.reputation)
    .slice(0, 8);

  const moved = reputation.filter((r) => Math.abs(r.delta) >= 0.005).length;

  return (
    <div className="rounded-lg border border-surface-border bg-surface-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-medium text-zinc-200">
          <span className="h-1.5 w-1.5 rounded-full bg-memory-400" />
          Source reputation
        </h2>
        {moved > 0 && (
          <span className="rounded-full border border-memory-500/30 bg-memory-500/10 px-2 py-0.5 font-mono text-[10px] text-memory-300">
            {moved} adapted
          </span>
        )}
      </div>

      <ul className="space-y-2.5">
        {entries.map((entry) => {
          const pct = Math.round(entry.reputation * 100);
          const down = entry.delta < -0.005;
          const up = entry.delta > 0.005;
          return (
            <li key={entry.source} className="flex items-center gap-3">
              <span className="w-28 truncate text-xs text-zinc-400">
                {titleCase(entry.source)}
              </span>
              <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-surface-raised">
                {/* ghost marker for the prior, so movement is visible */}
                {(up || down) && (
                  <span
                    className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-zinc-600"
                    style={{ left: `${Math.round(entry.prior * 100)}%` }}
                  />
                )}
                <div
                  className={`h-full rounded-full transition-all duration-700 ${barColor(entry.reputation)}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="flex w-16 items-center justify-end gap-1 font-mono text-xs">
                <span className="text-zinc-400">{entry.reputation.toFixed(2)}</span>
                {down && (
                  <span className="text-rose-400" title={`was ${entry.prior.toFixed(2)}`}>
                    ▼
                  </span>
                )}
                {up && (
                  <span className="text-brand-400" title={`was ${entry.prior.toFixed(2)}`}>
                    ▲
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 border-t border-surface-border pt-2 text-[11px] text-zinc-600">
        Reputation adapts live — sources caught contradicting verified memory
        lose trust.
      </p>
    </div>
  );
}
