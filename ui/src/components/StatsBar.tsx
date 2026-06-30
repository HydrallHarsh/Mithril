import type { DashboardStats } from "@/types";

interface StatsBarProps {
  stats: DashboardStats;
}

const CELLS: { key: keyof DashboardStats; label: string; format?: (v: number) => string }[] = [
  { key: "total_evaluated", label: "Total evaluated" },
  { key: "entered_cognee", label: "In Cognee" },
  { key: "blocked", label: "Blocked" },
  {
    key: "block_rate",
    label: "Block rate",
    format: (v) => `${Math.round(v * 100)}%`,
  },
  {
    key: "avg_trust_score",
    label: "Avg trust",
    format: (v) => v.toFixed(2),
  },
];

export function StatsBar({ stats }: StatsBarProps) {
  return (
    <div className="grid grid-cols-2 divide-x divide-zinc-800 border border-surface-border bg-surface-card sm:grid-cols-5">
      {CELLS.map(({ key, label, format }) => (
        <div key={key} className="px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-zinc-600">
            {label}
          </p>
          <p className="font-mono text-lg text-zinc-100">
            {format ? format(stats[key] as number) : stats[key]}
          </p>
        </div>
      ))}
    </div>
  );
}
