import type { AdmissionStatus, AuditEntry, FilterTab } from "@/types";
import { STATUS_CONFIG, isBlockedStatus } from "@/types";

interface FilterTabsProps {
  active: FilterTab;
  entries: AuditEntry[];
  onChange: (tab: FilterTab) => void;
}

function countForTab(entries: AuditEntry[], tab: FilterTab): number {
  if (tab === "all") return entries.length;
  if (tab === "blocked") return entries.filter((e) => isBlockedStatus(e.status)).length;
  return entries.filter((e) => e.status === tab).length;
}

const TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "accept", label: "Accepted" },
  { id: "warn", label: "Warned" },
  { id: "blocked", label: "Blocked" },
];

export function FilterTabs({ active, entries, onChange }: FilterTabsProps) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-surface-border px-4 py-2">
      {TABS.map(({ id, label }) => {
        const count = countForTab(entries, id);
        const isActive = active === id;
        const dot =
          id !== "all" && id !== "blocked"
            ? STATUS_CONFIG[id as AdmissionStatus]?.dot
            : id === "blocked"
              ? "bg-red-400"
              : null;

        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition ${
              isActive
                ? "border-b border-zinc-300 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {dot && count > 0 && (
              <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
            )}
            {label}
            <span className="font-mono text-xs text-zinc-600">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
