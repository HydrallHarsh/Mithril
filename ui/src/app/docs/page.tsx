"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Zap, Link2, Code2, Boxes, Rocket, BarChart3 } from "lucide-react";

const GUIDES = [
  {
    icon: Zap,
    title: "MCP Server",
    href: "/docs/mcp-server",
    description:
      "Expose Mithril over the Model Context Protocol. Claude Desktop, Cursor, and any MCP-aware agent writes memory through Mithril automatically.",
    accent: "border-brand-500/30 hover:border-brand-500/50",
    glow: "from-brand-500/10 to-transparent",
    iconTheme: "group-hover:border-brand-500/40 group-hover:bg-brand-500/10 group-hover:text-brand-400",
    tag: "Agent Integration",
  },
  {
    icon: Link2,
    title: "REST API",
    href: "/docs/rest-api",
    description:
      "FastAPI endpoints for trust-scored admission, verified recall, audit trail, quarantine, and live source reputation. Powers the dashboard.",
    accent: "border-accent-500/30 hover:border-accent-500/50",
    glow: "from-accent-500/10 to-transparent",
    iconTheme: "group-hover:border-accent-500/40 group-hover:bg-accent-500/10 group-hover:text-accent-400",
    tag: "HTTP Endpoints",
  },
  {
    icon: Code2,
    title: "Python SDK",
    href: "/docs/python-sdk",
    description:
      "Import Mithril directly in your Python code. Set up the firewall, submit claims, query verified memory, and inspect reputation — all in a few lines.",
    accent: "border-memory-500/30 hover:border-memory-500/50",
    glow: "from-memory-500/10 to-transparent",
    iconTheme: "group-hover:border-memory-500/40 group-hover:bg-memory-500/10 group-hover:text-memory-400",
    tag: "Direct Integration",
  },
  {
    icon: Boxes,
    title: "Architecture",
    href: "/docs/architecture",
    description:
      "The full governance pipeline — from incoming claim to admission decision. How source reputation, contradiction detection, and trust scoring work together.",
    accent: "border-zinc-500/30 hover:border-zinc-400/50",
    glow: "from-zinc-500/10 to-transparent",
    iconTheme: "group-hover:border-zinc-400/40 group-hover:bg-zinc-500/10 group-hover:text-zinc-300",
    tag: "System Design",
  },
  {
    icon: Rocket,
    title: "Run Demo",
    href: "/docs/run-demo",
    description:
      "End-to-end attack simulation. Seeds legitimate policies, fires off poison attacks, and shows how Mithril blocks every one with a full audit trail.",
    accent: "border-brand-500/30 hover:border-brand-500/50",
    glow: "from-brand-500/10 to-transparent",
    iconTheme: "group-hover:border-brand-500/40 group-hover:bg-brand-500/10 group-hover:text-brand-400",
    tag: "Try It Out",
  },
  {
    icon: BarChart3,
    title: "Benchmark",
    href: "/docs/benchmark",
    description:
      "A labeled evaluation suite measuring detection rate, false-positive rate, and precision across 30+ attack scenarios and legitimate updates.",
    accent: "border-accent-500/30 hover:border-accent-500/50",
    glow: "from-accent-500/10 to-transparent",
    iconTheme: "group-hover:border-accent-500/40 group-hover:bg-accent-500/10 group-hover:text-accent-400",
    tag: "Evaluation",
  },
];

const QUICK_LINKS = [
  { label: "make demo", desc: "Run the attack simulation", code: true },
  { label: "make api", desc: "Start the REST API server", code: true },
  { label: "make mcp", desc: "Run MCP server for agents", code: true },
  { label: "make benchmark", desc: "Run labeled benchmark", code: true },
  { label: "make dev", desc: "Start API + UI together", code: true },
  { label: "make test", desc: "Run unit tests", code: true },
];

export default function DocsIndexPage() {
  return (
    <div className="min-h-screen bg-surface font-body text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-surface-border bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-zinc-400 transition-colors hover:text-white"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path
                fillRule="evenodd"
                d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm">Home</span>
          </Link>
          <div className="h-4 w-px bg-surface-border" />
          <span className="font-display text-sm font-semibold tracking-display">
            <span className="text-gradient-brand">Mithril</span>
            <span className="ml-1.5 text-zinc-500">Documentation</span>
          </span>
          <div className="flex-1" />
          <Link
            href="/dashboard"
            className="rounded-full bg-zinc-800/60 px-4 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700/60 hover:text-white"
          >
            Dashboard →
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mb-16 text-center"
        >
          <p className="landing-eyebrow mb-3 text-accent-400/80">
            Documentation
          </p>
          <h1 className="landing-heading text-4xl sm:text-5xl lg:text-6xl">
            Build with{" "}
            <span className="text-gradient-brand">Mithril</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-zinc-400">
            Integrate Mithril&apos;s governance pipeline into your stack — via
            MCP for agents, REST API for services, or the Python SDK for direct
            use. Every memory write is trust-scored, contradiction-checked, and
            audited.
          </p>
        </motion.div>

        {/* Guide cards grid */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
          className="mb-20 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {GUIDES.map((guide, i) => (
            <Link key={guide.href} href={guide.href}>
              <motion.article
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  delay: 0.1 + i * 0.06,
                  ease: "easeOut",
                }}
                whileHover={{ y: -4 }}
                className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-surface-card/50 p-6 transition-colors duration-300 ${guide.accent}`}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${guide.glow} opacity-0 transition-opacity duration-500 group-hover:opacity-100`}
                />
                <div className="relative z-10 flex flex-1 flex-col">
                  <div className="mb-4 flex items-center justify-between">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700/60 bg-transparent text-zinc-500 transition-colors ${guide.iconTheme}`}>
                      <guide.icon className="h-5 w-5 stroke-[1.5]" />
                    </span>
                    <span className="rounded-full bg-zinc-800/60 px-2.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-label text-zinc-500">
                      {guide.tag}
                    </span>
                  </div>
                  <h2 className="mb-2 font-display text-lg font-semibold tracking-display text-zinc-100">
                    {guide.title}
                  </h2>
                  <p className="flex-1 text-sm leading-relaxed text-zinc-400">
                    {guide.description}
                  </p>
                  <div className="mt-4 flex items-center gap-1 text-xs font-medium text-zinc-500 transition-colors group-hover:text-zinc-300">
                    Read guide
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
                    >
                      <path
                        fillRule="evenodd"
                        d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              </motion.article>
            </Link>
          ))}
        </motion.div>

        {/* Quick commands */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
        >
          <h2 className="landing-heading mb-6 text-center text-2xl">
            Quick Commands
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {QUICK_LINKS.map((cmd) => (
              <div
                key={cmd.label}
                className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface-card/40 px-4 py-3 transition-colors hover:border-zinc-700/60"
              >
                <code className="shrink-0 rounded-md bg-zinc-800/80 px-2.5 py-1 font-mono text-xs text-brand-400">
                  {cmd.label}
                </code>
                <span className="text-sm text-zinc-400">{cmd.desc}</span>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Architecture overview */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
          className="mt-20"
        >
          <h2 className="landing-heading mb-6 text-center text-2xl">
            Pipeline at a Glance
          </h2>
          <div className="overflow-hidden rounded-2xl border border-surface-border bg-[#0a0c12] p-6 sm:p-8">
            <pre className="overflow-x-auto font-mono text-[0.78rem] leading-relaxed text-zinc-400">
              {`Incoming Claim  (MCP tool · Slack export · file · API · dashboard)
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│  Credential Exfiltration Guard                          │
│  AWS keys, GitHub tokens, JWTs, PEM → redacted          │
└─────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│  Adaptive Source Reputation (SQLite-backed, self-tuning) │
│  source_rep × 0.40                                      │
└─────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│  Contradiction Detection (cognee.recall + LLM scoring)  │
│  contradiction × -0.40                                  │
└─────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│  Trust Score = normalize(src + corroboration + fresh     │
│               - contradiction)                          │
└─────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│  Admission Gate                                         │
│  ≥0.85 Accept · ≥0.60 Warn · ≥0.40 Review              │
│  ≥0.20 Quarantine · <0.20 Reject                        │
└─────────────────────────────────────────────────────────┘
     │
     ├── ACCEPT / WARN  → cognee.remember(verified)
     ├── QUARANTINE / REVIEW / REJECT → SQLite quarantine
     ├── Source reputation updated from outcome
     └── All decisions → Audit log`}
            </pre>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
