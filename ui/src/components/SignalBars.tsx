import { scoreColorClass } from "@/types";

const BAR_HEIGHTS = ["h-2", "h-3", "h-4", "h-5", "h-6"] as const;

interface SignalBarsProps {
  score: number;
  className?: string;
}

export function SignalBars({ score, className = "" }: SignalBarsProps) {
  const filled = Math.max(0, Math.min(5, Math.round(score * 5)));
  const color = scoreColorClass(score);
  const pct = Math.round(score * 100);

  return (
    <div
      className={`flex items-end gap-0.5 ${className}`}
      role="img"
      aria-label={`Trust signal ${pct} percent`}
    >
      {BAR_HEIGHTS.map((height, index) => (
        <span
          key={height}
          className={`w-1 rounded-sm ${height} ${
            index < filled ? color : "bg-zinc-700"
          }`}
        />
      ))}
    </div>
  );
}
