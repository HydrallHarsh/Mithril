"use client";

import { Fragment, useMemo, useState } from "react";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { StatusBadge } from "@/components/StatusBadge";
import type { AuditEntry, FilterTab } from "@/types";
import { FilterTabs } from "@/components/FilterTabs";
import {
  formatTimestamp,
  isBlockedStatus,
  parseScoreReasons,
} from "@/types";

interface AuditTableProps {
  entries: AuditEntry[];
}

function filterEntries(entries: AuditEntry[], tab: FilterTab): AuditEntry[] {
  if (tab === "all") return entries;
  if (tab === "blocked") return entries.filter((e) => isBlockedStatus(e.status));
  return entries.filter((e) => e.status === tab);
}

export function AuditTable({ entries }: AuditTableProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filtered = useMemo(
    () => filterEntries(entries, activeTab),
    [entries, activeTab],
  );

  return (
    <div className="flex min-h-[420px] flex-col overflow-hidden rounded-lg border border-surface-border bg-surface-card">
      <FilterTabs active={activeTab} entries={entries} onChange={setActiveTab} />

      {filtered.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-12 text-center">
          <p className="text-sm text-zinc-400">No audit entries yet</p>
          <p className="text-xs text-zinc-600">
            Submit a memory claim or run <code className="text-zinc-400">make demo</code>
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-surface-border text-[11px] uppercase tracking-wide text-zinc-600">
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Memory</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Trust</th>
                <th className="px-4 py-3 font-medium">Decision</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => {
                const reasons = parseScoreReasons(entry);
                const expanded = expandedId === entry.id;

                return (
                  <Fragment key={entry.id}>
                    <tr
                      className="animate-slide-in cursor-pointer border-b border-surface-border/70 transition hover:bg-zinc-900/50"
                      onClick={() =>
                        setExpandedId(expanded ? null : entry.id)
                      }
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-zinc-500">
                        {formatTimestamp(entry.timestamp)}
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 font-mono text-zinc-200">
                        {entry.text}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-300">
                          {entry.source}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <ScoreBreakdown
                          score={entry.trust_score}
                          decisionReason={entry.decision_reason}
                          reasons={reasons}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={entry.status} />
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="bg-zinc-950/80">
                        <td colSpan={5} className="px-4 py-4">
                          <div className="space-y-3">
                            <pre className="overflow-x-auto rounded-md border border-surface-border bg-black/40 p-3 font-mono text-xs text-zinc-300">
                              {entry.text}
                            </pre>
                            <ul className="space-y-1 text-xs text-zinc-400">
                              {reasons.map((reason) => (
                                <li key={reason}>• {reason}</li>
                              ))}
                            </ul>
                            {entry.entered_cognee ? (
                              <p className="text-xs text-emerald-400">
                                Stored in Cognee dataset:{" "}
                                <span className="font-mono">
                                  {entry.cognee_dataset ?? "verified_memories"}
                                </span>
                              </p>
                            ) : (
                              <p className="text-xs text-red-400">
                                Not stored in Cognee — held in quarantine / rejected
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
