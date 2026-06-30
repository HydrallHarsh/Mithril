import type { DashboardStats } from "@/types";

interface StatsBarProps {
  stats: DashboardStats;
}

type Accent = "neutral" | "brand" | "rose" | "accent" | "memory";

const ACCENT: Record<Accent, { value: string; dot: string; glow: string }> = {
  neutral: { value: "text-zinc-100", dot: "bg-zinc-500", glow: "" },
  brand: { value: "text-brand-300", dot: "bg-brand-400", glow: "from-brand-500/10" },
  rose: { value: "text-rose-300", dot: "bg-rose-400", glow: "from-rose-500/10" },
  accent: { value: "text-accent-300", dot: "bg-accent-400", glow: "from-accent-500/10" },
  memory: { value: "text-memory-300", dot: "bg-memory-400", glow: "from-memory-500/10" },
};

const CELLS: {
  key: keyof DashboardStats;
  label: string;
  accent: Accent;
  format?: (v: number) => string;
}[] = [
  { key: "total_evaluated", label: "Total evaluated", accent: "neutral" },
  { key: "entered_cognee", label: "In Cognee", accent: "brand" },
  { key: "blocked", label: "Blocked", accent: "rose" },
  {
    key: "block_rate",
    label: "Block rate",
    accent: "accent",
    format: (v) => `${Math.round(v * 100)}%`,
  },
  {
    key: "avg_trust_score",
    label: "Avg trust",
    accent: "memory",
    format: (v) => v.toFixed(2),
  },
];

export function StatsBar({ stats }: StatsBarProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {CELLS.map(({ key, label, accent, format }) => {
        const tone = ACCENT[accent];
        return (
          <div
            key={key}
            className="group relative overflow-hidden rounded-lg border border-surface-border bg-surface-card px-4 py-3.5 transition-colors hover:border-zinc-700"
          >
            {tone.glow && (
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tone.glow} to-transparent opacity-0 transition-opacity group-hover:opacity-100`}
              />
            )}
            <div className="relative">
              <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-zinc-500">
                <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                {label}
              </p>
              <p className={`mt-1.5 font-mono text-2xl font-medium tabular-nums ${tone.value}`}>
                {format ? format(stats[key] as number) : stats[key]}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
