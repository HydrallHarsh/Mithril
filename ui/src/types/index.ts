export type AdmissionStatus =
  | "accept"
  | "warn"
  | "review"
  | "quarantine"
  | "reject";

export interface AuditEntry {
  id: number;
  text: string;
  source: string;
  author: string | null;
  trust_score: number;
  status: AdmissionStatus;
  decision_reason: string;
  score_reasons: string;
  entered_cognee: number;
  cognee_dataset: string | null;
  timestamp: string;
}

export interface TrustBreakdown {
  source_reputation: number;
  contradiction_penalty: number;
  corroboration_bonus: number;
  freshness_bonus: number;
  source_component: number;
  corroboration_component: number;
  freshness_component: number;
  contradiction_component: number;
  raw_weighted_score: number;
  final_score: number;
  reasons: string[];
}

export interface RememberResult {
  text: string;
  source: string;
  author: string | null;
  status: AdmissionStatus;
  trust_score: number;
  decision_reason: string;
  trust_breakdown: TrustBreakdown;
  reasons: string[];
  entered_cognee: boolean;
  cognee_dataset: string | null;
  timestamp: string;
}

export interface DashboardStats {
  total_evaluated: number;
  accepted: number;
  warned: number;
  reviewed: number;
  quarantined: number;
  rejected: number;
  entered_cognee: number;
  blocked: number;
  block_rate: number;
  avg_trust_score: number;
}

export interface AppConfig {
  source_reputation: Record<string, number>;
  source_options: string[];
  thresholds: Record<string, number>;
  weights: Record<string, number>;
  max_theoretical_score: number;
}

export interface RecallResult {
  query: string;
  answer: string;
  candidate_count: number;
  blocked_count: number;
}

export type ConnectionMode = "live" | "mock";

export interface StatusConfig {
  label: string;
  dot: string;
  badge: string;
  text: string;
}

export const STATUS_CONFIG: Record<AdmissionStatus, StatusConfig> = {
  accept: {
    label: "Accepted",
    dot: "bg-emerald-400",
    badge: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30",
    text: "text-emerald-400",
  },
  warn: {
    label: "Warn",
    dot: "bg-amber-400",
    badge: "bg-amber-500/15 text-amber-400 ring-amber-500/30",
    text: "text-amber-400",
  },
  review: {
    label: "Review",
    dot: "bg-orange-400",
    badge: "bg-orange-500/15 text-orange-400 ring-orange-500/30",
    text: "text-orange-400",
  },
  quarantine: {
    label: "Quarantined",
    dot: "bg-red-400",
    badge: "bg-red-500/15 text-red-400 ring-red-500/30",
    text: "text-red-400",
  },
  reject: {
    label: "Rejected",
    dot: "bg-zinc-400",
    badge: "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30",
    text: "text-zinc-400",
  },
};

export type FilterTab = "all" | AdmissionStatus | "blocked";

export function parseScoreReasons(entry: AuditEntry): string[] {
  try {
    const parsed = JSON.parse(entry.score_reasons);
    return Array.isArray(parsed) ? parsed : [entry.score_reasons];
  } catch {
    return entry.score_reasons ? [entry.score_reasons] : [];
  }
}

export function formatTimestamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function scoreColorClass(score: number): string {
  if (score >= 0.85) return "bg-emerald-400";
  if (score >= 0.6) return "bg-amber-400";
  if (score >= 0.4) return "bg-orange-400";
  return "bg-red-400";
}

export function isBlockedStatus(status: AdmissionStatus): boolean {
  return status === "quarantine" || status === "reject" || status === "review";
}
