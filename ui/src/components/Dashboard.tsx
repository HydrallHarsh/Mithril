"use client";

import { useCallback, useEffect, useState } from "react";
import { AuditTable } from "@/components/AuditTable";
import { Header } from "@/components/Header";
import { RecallPanel } from "@/components/RecallPanel";
import { SourceReputationChart } from "@/components/SourceReputationChart";
import { StatsBar } from "@/components/StatsBar";
import { SubmitForm } from "@/components/SubmitForm";
import { ThresholdLegend } from "@/components/ThresholdLegend";
import {
  fetchAudit,
  fetchConfig,
  fetchHealth,
  fetchStats,
  resetDashboard,
} from "@/lib/api";
import { MOCK_AUDIT, MOCK_CONFIG, MOCK_STATS } from "@/lib/mock-data";
import type {
  AppConfig,
  AuditEntry,
  ConnectionMode,
  DashboardStats,
} from "@/types";

export function Dashboard() {
  const [mode, setMode] = useState<ConnectionMode>("mock");
  const [audit, setAudit] = useState<AuditEntry[]>(MOCK_AUDIT);
  const [stats, setStats] = useState<DashboardStats>(MOCK_STATS);
  const [config, setConfig] = useState<AppConfig>(MOCK_CONFIG);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [health, auditData, statsData, configData] = await Promise.all([
      fetchHealth(),
      fetchAudit().catch(() => MOCK_AUDIT),
      fetchStats().catch(() => MOCK_STATS),
      fetchConfig().catch(() => MOCK_CONFIG),
    ]);

    setMode(health.mode);
    setAudit(auditData);
    setStats(statsData);
    setConfig(configData);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleReset() {
    if (!confirm("Clear all Cognee memory and audit logs?")) return;
    try {
      await resetDashboard();
      await load();
    } catch {
      alert("Reset failed — is the FastAPI backend running?");
    }
  }

  const liveOnly = mode !== "live";

  return (
    <div className="min-h-screen bg-surface">
      <Header
        mode={mode}
        onRefresh={handleRefresh}
        onReset={handleReset}
        refreshing={refreshing}
      />

      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6">
        {loading ? (
          <div className="rounded-lg border border-surface-border bg-surface-card p-12 text-center text-sm text-zinc-500">
            Loading dashboard…
          </div>
        ) : (
          <>
            {liveOnly && (
              <div className="rounded-md border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-200/90">
                Backend offline — showing mock audit data. Run{" "}
                <code>make api</code> then refresh for live Mithril decisions.
              </div>
            )}

            <StatsBar stats={stats} />

            <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
              <AuditTable entries={audit} />

              <aside className="space-y-4">
                <SubmitForm
                  config={config}
                  onSubmitted={handleRefresh}
                  disabled={liveOnly}
                />
                <RecallPanel disabled={liveOnly} />
                <ThresholdLegend thresholds={config.thresholds} />
                <SourceReputationChart reputation={config.source_reputation} />
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
