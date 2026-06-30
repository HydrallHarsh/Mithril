"use client";

import { motion } from "framer-motion";
import {
  fadeUp,
  scrollReveal,
  scrollRevealStagger,
} from "@/components/landing/motion";

const STEPS = [
  {
    num: "01",
    title: "Ingest.",
    body: "Every memory claim enters through Mithril — with source, author, and timestamp attached. Nothing writes directly to Cognee.",
    tags: ["MemoryClaim", "provenance"],
  },
  {
    num: "02",
    title: "Investigate.",
    body: "Mithril recalls verified context via cognee.recall(only_context=True), scores contradictions with the LLM, and weights source reputation into a normalized trust score.",
    tags: ["cognee.recall", "contradiction", "scorer"],
  },
  {
    num: "03",
    title: "Gate.",
    body: "Accept and warn tiers land in Cognee with NodeSet tags. Quarantine, review, and reject stay out of the graph — but every decision hits the audit log.",
    tags: ["node_set", "audit", "quarantine"],
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-zinc-800 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          className="mb-16 max-w-2xl"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={scrollRevealStagger}
        >
          <motion.p variants={fadeUp} className="landing-eyebrow mb-3">
            How Mithril works
          </motion.p>
          <motion.h2 variants={fadeUp} className="landing-heading text-3xl sm:text-4xl">
            From signal to a verified memory.
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mt-4 text-base leading-relaxed text-zinc-400 sm:text-lg"
          >
            Three steps. No prompt engineering. Cognee APIs you can name in the
            README.
          </motion.p>
        </motion.div>

        <motion.div
          className="grid gap-6 md:grid-cols-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={scrollRevealStagger}
        >
          {STEPS.map((step) => (
            <motion.article
              key={step.num}
              variants={scrollReveal}
              whileHover={{ y: -4, borderColor: "rgb(63 63 70)" }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
              className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-6"
            >
              <p className="mb-4 font-display text-3xl font-light tabular-nums text-memory-400/70">
                {step.num}
              </p>
              <h3 className="font-display mb-3 text-lg font-semibold text-zinc-100">
                {step.title}
              </h3>
              <p className="mb-4 text-sm leading-relaxed text-zinc-400">
                {step.body}
              </p>
              <div className="flex flex-wrap gap-2">
                {step.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-0.5 font-mono text-[11px] text-zinc-500"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
