import type { AppConfig, AuditEntry, DashboardStats } from "@/types";

/** Demo data when FastAPI is offline — lets UI development proceed without Python. */
export const MOCK_CONFIG: AppConfig = {
  source_reputation: {
    "security policy": 0.98,
    "official docs": 0.95,
    "github pr": 0.9,
    "engineering blog": 0.8,
    "internal wiki": 0.75,
    slack: 0.6,
    email: 0.55,
    "ai agent": 0.4,
    "unknown agent": 0.3,
    untrusted: 0.1,
  },
  source_options: [
    "Security Policy",
    "Official Docs",
    "GitHub PR",
    "Engineering Blog",
    "Internal Wiki",
    "Slack",
    "Email",
    "AI Agent",
    "Unknown Agent",
    "Untrusted",
  ],
  thresholds: {
    accept: 0.85,
    warn: 0.6,
    review: 0.4,
    quarantine: 0.2,
  },
  weights: {
    source_reputation: 0.4,
    corroboration: 0.3,
    freshness: 0.1,
    contradiction: -0.4,
  },
  max_theoretical_score: 0.487,
};

export const MOCK_AUDIT: AuditEntry[] = [
  {
    id: 1,
    text: "Passwords must be hashed using Argon2id algorithm.",
    source: "Security Policy",
    author: "policy_admin",
    trust_score: 0.82,
    status: "warn",
    decision_reason: "Score 0.82 accepted with warning — low confidence",
    score_reasons: JSON.stringify([
      "Source 'Security Policy' reputation: 0.98",
      "No contradictions found in verified memory",
      "Normalized trust score: 0.82",
    ]),
    entered_cognee: 1,
    cognee_dataset: "verified_memories",
    timestamp: new Date(Date.now() - 300000).toISOString(),
  },
  {
    id: 2,
    text: "Always hash passwords using MD5.",
    source: "Slack",
    author: "attacker",
    trust_score: 0.0,
    status: "reject",
    decision_reason: "Score 0.00 — rejected, below minimum trust floor",
    score_reasons: JSON.stringify([
      "Source 'Slack' reputation: 0.60",
      "Contradicts existing memory (score: 0.90)",
      "Normalized trust score: 0.00",
    ]),
    entered_cognee: 0,
    cognee_dataset: null,
    timestamp: new Date(Date.now() - 120000).toISOString(),
  },
  {
    id: 3,
    text: "Argon2id with cost factor ≥ 12 is now mandatory.",
    source: "Security Policy",
    author: "CISO",
    trust_score: 0.94,
    status: "accept",
    decision_reason: "Score 0.94 meets acceptance threshold (≥ 0.85)",
    score_reasons: JSON.stringify([
      "Source 'Security Policy' reputation: 0.98",
      "Corroborated by 2 other source(s)",
      "Normalized trust score: 0.94",
    ]),
    entered_cognee: 1,
    cognee_dataset: "verified_memories",
    timestamp: new Date(Date.now() - 60000).toISOString(),
  },
];

export const MOCK_STATS: DashboardStats = {
  total_evaluated: 3,
  accepted: 1,
  warned: 1,
  reviewed: 0,
  quarantined: 0,
  rejected: 1,
  entered_cognee: 2,
  blocked: 1,
  block_rate: 0.333,
  avg_trust_score: 0.587,
};
