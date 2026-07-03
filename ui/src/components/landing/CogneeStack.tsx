"use client";

import { motion } from "framer-motion";
import {
  fadeUp,
  scrollRevealStagger,
} from "@/components/landing/motion";

const PIPELINE = [
  {
    step: "01",
    label: "Claim enters",
    detail: "Text, source, author, timestamp",
    color: "text-zinc-400",
    dotColor: "bg-zinc-600",
  },
  {
    step: "02",
    label: "Secrets redacted",
    detail: "AWS keys, tokens, PEM blocks stripped",
    color: "text-accent-400",
    dotColor: "bg-accent-500",
  },
  {
    step: "03",
    label: "Reputation loaded",
    detail: "Live adaptive trust for the source",
    color: "text-memory-400",
    dotColor: "bg-memory-500",
  },
  {
    step: "04",
    label: "Contradiction scored",
    detail: "LLM scores against verified memory",
    color: "text-memory-400",
    dotColor: "bg-memory-500",
  },
  {
    step: "05",
    label: "Trust score computed",
    detail: "Weighted formula → normalized 0–1",
    color: "text-brand-400",
    dotColor: "bg-brand-500",
  },
  {
    step: "06",
    label: "Gate decision",
    detail: "Accept / Warn / Review / Quarantine / Reject",
    color: "text-brand-400",
    dotColor: "bg-brand-500",
  },
  {
    step: "07",
    label: "Stored or isolated",
    detail: "Cognee NodeSet or SQLite quarantine",
    color: "text-brand-300",
    dotColor: "bg-brand-400",
  },
  {
    step: "08",
    label: "Audit + reputation update",
    detail: "Every decision logged, source trust adjusted",
    color: "text-brand-300",
    dotColor: "bg-brand-400",
  },
];

export function CogneeStack() {
  return (
    <section className="relative py-28">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-start gap-16 lg:grid-cols-2">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={scrollRevealStagger}
          >
            <motion.p variants={fadeUp} className="landing-eyebrow mb-3 text-brand-400/80">
              The pipeline
            </motion.p>
            <motion.h2 variants={fadeUp} className="landing-heading text-4xl sm:text-5xl">
              One path from{" "}
              <span className="text-gradient-brand">claim to verdict.</span>
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="mt-5 text-lg leading-relaxed text-zinc-400 sm:text-xl"
            >
              Every write goes through all eight steps. Accepted claims still
              get audited. Rejected claims still update source trust. There
              is no shortcut, no backdoor, and no silent drop. MCP, REST,
              or Slack bulk import all hit the same gate.
            </motion.p>

            <motion.div
              variants={fadeUp}
              className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950/60 p-5"
            >
              <p className="mb-2 font-mono text-xs font-medium text-accent-300">
                Trust Formula
              </p>
              <p className="font-mono text-sm leading-relaxed text-zinc-300">
                score = source_rep × <span className="text-brand-400">0.40</span>{" "}
                + corroboration × <span className="text-brand-400">0.30</span>{" "}
                + freshness × <span className="text-brand-400">0.10</span>{" "}
                − contradiction × <span className="text-rose-400">0.40</span>
              </p>
            </motion.div>
          </motion.div>

          <motion.div
            className="relative"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={scrollRevealStagger}
          >
            {/* Vertical connector line */}
            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-zinc-700 via-brand-500/40 to-brand-500/20" />

            <div className="space-y-1">
              {PIPELINE.map((step) => (
                <motion.div
                  key={step.step}
                  variants={fadeUp}
                  className="group relative flex items-start gap-4 rounded-lg px-1 py-3 transition-colors duration-300 hover:bg-zinc-900/40"
                >
                  <div className={`relative z-10 mt-1.5 h-[9px] w-[9px] flex-shrink-0 rounded-full ${step.dotColor} ring-2 ring-zinc-950 transition-all duration-300 group-hover:scale-125 group-hover:ring-zinc-800`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-zinc-600">
                        {step.step}
                      </span>
                      <span className={`text-[0.94rem] font-medium ${step.color}`}>
                        {step.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm leading-relaxed text-zinc-500">
                      {step.detail}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
