import Link from "next/link";
import type { ConnectionMode } from "@/types";

interface HeaderProps {
  mode: ConnectionMode;
  onRefresh: () => void;
  onReset: () => void;
  refreshing?: boolean;
}

export function Header({ mode, onRefresh, onReset, refreshing }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-surface-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-surface-border bg-surface-card font-mono text-sm text-zinc-300">
              M
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-zinc-100">
                Mithril
              </h1>
              <p className="text-xs text-zinc-500">Cognee governance layer</p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs ${
              mode === "live"
                ? "border-emerald-500/30 text-emerald-400"
                : "border-amber-500/30 text-amber-400"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                mode === "live" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
              }`}
            />
            {mode === "live" ? "Live" : "Mock data"}
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="rounded-md border border-surface-border px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-900 disabled:opacity-40"
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={onReset}
            className="rounded-md border border-red-500/30 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10"
          >
            Reset
          </button>
        </div>
      </div>
    </header>
  );
}
