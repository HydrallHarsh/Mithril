import type {
  AppConfig,
  AuditEntry,
  BenchmarkResults,
  ConnectionMode,
  DashboardStats,
  RecallResult,
  RememberResult,
  ReputationEntry,
} from "@/types";

async function readJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { cache: "no-store", ...init });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchHealth(): Promise<{ mode: ConnectionMode }> {
  try {
    const data = await readJson<{ mode?: ConnectionMode; status?: string }>(
      "/api/health",
    );
    return { mode: data.mode ?? "live" };
  } catch {
    return { mode: "mock" };
  }
}

export async function fetchAudit(): Promise<AuditEntry[]> {
  return readJson<AuditEntry[]>("/api/audit");
}

export async function fetchStats(): Promise<DashboardStats> {
  return readJson<DashboardStats>("/api/stats");
}

export async function fetchConfig(): Promise<AppConfig> {
  return readJson<AppConfig>("/api/config");
}

export async function fetchReputation(): Promise<ReputationEntry[]> {
  return readJson<ReputationEntry[]>("/api/reputation");
}

export async function fetchBenchmarkResults(): Promise<BenchmarkResults> {
  return readJson<BenchmarkResults>("/api/benchmark-results");
}

export async function submitRemember(body: {
  text: string;
  source: string;
  author?: string;
}): Promise<RememberResult> {
  return readJson<RememberResult>("/api/remember", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function submitRecall(query: string): Promise<RecallResult> {
  return readJson<RecallResult>("/api/recall", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
}

export async function resetDashboard(): Promise<void> {
  await readJson("/api/reset", { method: "POST" });
}
