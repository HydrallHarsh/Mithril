import type { AppConfig } from "@/types";

interface ThresholdLegendProps {
  thresholds: AppConfig["thresholds"];
}

const ROWS = [
  { key: "accept", label: "Accept", suffix: "≥" },
  { key: "warn", label: "Warn", suffix: "≥" },
  { key: "review", label: "Review", suffix: "≥" },
  { key: "quarantine", label: "Quarantine", suffix: "≥" },
] as const;

const DOTS: Record<string, string> = {
  accept: "bg-emerald-400",
  warn: "bg-amber-400",
  review: "bg-orange-400",
  quarantine: "bg-red-400",
};

export function ThresholdLegend({ thresholds }: ThresholdLegendProps) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-card p-4">
      <h2 className="mb-3 text-sm font-medium text-zinc-200">Thresholds</h2>
      <ul className="space-y-2 text-sm">
        {ROWS.map(({ key, label, suffix }) => (
          <li key={key} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-zinc-400">
              <span className={`h-2 w-2 rounded-full ${DOTS[key]}`} />
              {label}
            </span>
            <span className="font-mono text-xs text-zinc-300">
              {suffix} {thresholds[key]?.toFixed(2)}
            </span>
          </li>
        ))}
        <li className="flex items-center justify-between gap-3 border-t border-surface-border pt-2">
          <span className="flex items-center gap-2 text-zinc-500">
            <span className="h-2 w-2 rounded-full bg-zinc-500" />
            Reject
          </span>
          <span className="font-mono text-xs text-zinc-500">
            &lt; {thresholds.quarantine?.toFixed(2)}
          </span>
        </li>
      </ul>
    </div>
  );
}
