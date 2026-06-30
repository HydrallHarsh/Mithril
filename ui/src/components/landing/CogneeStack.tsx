"use client";

import { motion } from "framer-motion";
import {
  fadeUp,
  scrollReveal,
  scrollRevealStagger,
} from "@/components/landing/motion";

const APIS = [
  {
    name: "cognee.remember()",
    desc: "Verified claims only — tagged with node_set=[\"verified\", source]",
  },
  {
    name: "cognee.recall()",
    desc: "Contradiction detection (only_context) + scoped answers (node_name filter)",
  },
  {
    name: "cognee.improve()",
    desc: "Graph enrichment on the verified_memories dataset",
  },
  {
    name: "cognee.forget()",
    desc: "Clean demo reset between attack runs",
  },
];

export function CogneeStack() {
  return (
    <section className="border-t border-zinc-800 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={scrollRevealStagger}
          >
            <motion.p variants={fadeUp} className="landing-eyebrow mb-3">
              Integration
            </motion.p>
            <motion.h2 variants={fadeUp} className="landing-heading text-3xl sm:text-4xl">
              Built on Cognee,
              <br />
              not bolted on.
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="mt-4 text-base leading-relaxed text-zinc-400 sm:text-lg"
            >
              Mithril is a governance wrapper — it uses NodeSets, dataset scoping,
              and recall modes the way the Cognee judges expect to see them.
            </motion.p>
          </motion.div>

          <motion.div
            className="space-y-3"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={scrollRevealStagger}
          >
            {APIS.map((api) => (
              <motion.div
                key={api.name}
                variants={scrollReveal}
                whileHover={{ x: 6, borderColor: "rgba(34, 211, 238, 0.35)" }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4"
              >
                <p className="font-mono text-sm text-accent-300">{api.name}</p>
                <p className="mt-1 text-sm text-zinc-500">{api.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
