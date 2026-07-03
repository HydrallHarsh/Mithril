"use client";

import { motion } from "framer-motion";
import {
  fadeUp,
  scrollReveal,
  scrollRevealStagger,
} from "@/components/landing/motion";

const FEATURES = [
  {
    icon: "🛡",
    title: "Adaptive Source Reputation",
    body: "Sources earn trust slowly and lose it fast. Slack starts at 0.60. After two blocked claims, it drops to 0.38. The math is intentionally asymmetric, because that is how real trust works.",
    accent: "from-brand-500/20 to-brand-500/5",
    border: "group-hover:border-brand-500/40",
  },
  {
    icon: "⚔️",
    title: "LLM Contradiction Engine",
    body: "Mithril pulls existing verified context from Cognee first, then asks an LLM one specific question: does this new claim contradict what we already know? It returns a float, not vibes. 0.9 means you are lying.",
    accent: "from-memory-500/20 to-memory-500/5",
    border: "group-hover:border-memory-500/40",
  },
  {
    icon: "🔐",
    title: "Credential Exfiltration Guard",
    body: "Poisoning is not the only threat. Agents can also plant secrets into shared memory. Mithril catches AWS keys, GitHub tokens, JWTs, PEM blocks, and DB URIs on the way in, redacts them, and penalizes the source.",
    accent: "from-accent-500/20 to-accent-500/5",
    border: "group-hover:border-accent-500/40",
  },
  {
    icon: "📐",
    title: "Deterministic Trust Math",
    body: "The trust score is a weighted formula you can read in one line: source reputation × 0.40, corroboration × 0.30, freshness × 0.10, minus contradiction penalty × 0.40. Every decision can be explained to an auditor.",
    accent: "from-brand-500/20 to-accent-500/5",
    border: "group-hover:border-brand-500/40",
  },
  {
    icon: "🚦",
    title: "Five-Tier Admission Gate",
    body: "Not everything is accept or reject. Mithril has five tiers: Accept, Warn, Review, Quarantine, and Reject. Claims that score low are isolated in SQLite. Nothing gets silently dropped.",
    accent: "from-memory-500/20 to-brand-500/5",
    border: "group-hover:border-memory-500/40",
  },
  {
    icon: "🔌",
    title: "MCP Server + FastAPI + Slack Ingest",
    body: "Plug it into Claude Desktop via MCP, call it from your FastAPI backend, or bulk-import a Slack export. Three entry points, one gate. The trust pipeline is always the same.",
    accent: "from-accent-500/20 to-memory-500/5",
    border: "group-hover:border-accent-500/40",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-28">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          className="mb-16 max-w-2xl"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={scrollRevealStagger}
        >
          <motion.p variants={fadeUp} className="landing-eyebrow mb-3 text-accent-400/80">
            What the shield does
          </motion.p>
          <motion.h2 variants={fadeUp} className="landing-heading text-5xl sm:text-6xl">
            Six guards between your agent and{" "}
            <span className="text-gradient-brand">corrupted memory.</span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mt-6 text-xl leading-relaxed text-zinc-400 sm:text-2xl"
          >
            All of this is shipping code. The trust engine, the credential
            scanner, and the reputation tracker are in the repo, tested,
            and running in the demo right now.
          </motion.p>
        </motion.div>

        <motion.div
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={scrollRevealStagger}
        >
          {FEATURES.map((feature) => (
            <motion.article
              key={feature.title}
              variants={scrollReveal}
              whileHover={{ y: -6 }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
              className={`group relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-8 backdrop-blur-sm transition-colors duration-500 ${feature.border}`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.accent} opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />
              <div className="relative z-10">
                <span className="mb-4 inline-block text-2xl">{feature.icon}</span>
                <h3 className="font-display mb-3 text-2xl font-medium tracking-tight text-zinc-100">
                  {feature.title}
                </h3>
                <p className="text-base leading-relaxed text-zinc-400">
                  {feature.body}
                </p>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
