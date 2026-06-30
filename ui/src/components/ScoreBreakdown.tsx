"use client";

import { useEffect, useRef, useState } from "react";
import { SignalBars } from "@/components/SignalBars";
import { scoreColorClass } from "@/types";

interface ScoreBreakdownProps {
  score: number;
  decisionReason: string;
  reasons: string[];
}

export function ScoreBreakdown({
  score,
  decisionReason,
  reasons,
}: ScoreBreakdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const pct = Math.round(score * 100);

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-md px-1 py-0.5 transition hover:bg-zinc-800/80"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <SignalBars score={score} />
        <span className="font-mono text-sm text-zinc-200">{pct}%</span>
        <svg
          className={`h-3 w-3 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-surface-border bg-surface-card p-4 shadow-xl"
        >
          <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full rounded-full transition-all duration-300 ${scoreColorClass(score)}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mb-3 text-xs text-zinc-500">{decisionReason}</p>
          <ul className="space-y-1.5 text-xs text-zinc-300">
            {reasons.map((reason) => (
              <li key={reason} className="flex gap-2">
                <span className="text-zinc-600">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
