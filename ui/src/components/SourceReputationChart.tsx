import type { AppConfig } from "@/types";

interface SourceReputationChartProps {
  reputation: AppConfig["source_reputation"];
}

export function SourceReputationChart({
  reputation,
}: SourceReputationChartProps) {
  const entries = Object.entries(reputation)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  return (
    <div className="rounded-lg border border-surface-border bg-surface-card p-4">
      <h2 className="mb-3 text-sm font-medium text-zinc-200">Source reputation</h2>
      <ul className="space-y-2">
        {entries.map(([source, score]) => (
          <li key={source} className="flex items-center gap-3">
            <span className="w-28 truncate capitalize text-xs text-zinc-500">
              {source}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-zinc-400"
                style={{ width: `${score * 100}%` }}
              />
            </div>
            <span className="w-10 text-right font-mono text-xs text-zinc-400">
              {score.toFixed(2)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
