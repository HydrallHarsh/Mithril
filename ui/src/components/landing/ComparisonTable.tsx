"use client";

import { motion } from "framer-motion";
import {
  fadeUp,
  scrollReveal,
  scrollRevealStagger,
} from "@/components/landing/motion";

const ROWS = [
  {
    label: "Poisoned inputs stored",
    vanilla: "All 3 attacks",
    mithril: "0 — blocked at gate",
  },
  {
    label: "Provenance tracked",
    vanilla: "No",
    mithril: "Full audit trail",
  },
  {
    label: "Contradiction detected",
    vanilla: "No",
    mithril: "Before storage",
  },
  {
    label: 'Answer: "How to hash passwords?"',
    vanilla: "May return MD5",
    mithril: "Argon2id from verified memory",
  },
];

export function ComparisonTable() {
  return (
    <section id="comparison" className="border-t border-zinc-800 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          className="mb-12 max-w-2xl"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={scrollRevealStagger}
        >
          <motion.p variants={fadeUp} className="landing-eyebrow mb-3">
            Comparison
          </motion.p>
          <motion.h2 variants={fadeUp} className="landing-heading text-3xl sm:text-4xl">
            Same graph. Safer writes.
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mt-4 text-base leading-relaxed text-zinc-400 sm:text-lg"
          >
            Vanilla Cognee stores what it&apos;s told. Mithril checks first —
            then only verified claims reach the graph.
          </motion.p>
        </motion.div>

        <motion.div
          className="overflow-hidden rounded-xl border border-zinc-800"
          initial={{ opacity: 0, y: 32, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950">
                <th className="px-4 py-3 font-medium text-zinc-500" />
                <th className="px-4 py-3 font-medium text-zinc-400">
                  Vanilla Cognee
                </th>
                <th className="px-4 py-3 font-medium text-brand-400">
                  Mithril + Cognee
                </th>
              </tr>
            </thead>
            <motion.tbody
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={scrollRevealStagger}
            >
              {ROWS.map((row) => (
                <motion.tr
                  key={row.label}
                  variants={fadeUp}
                  className="border-b border-zinc-800/80 last:border-0"
                >
                  <td className="px-4 py-4 text-zinc-300">{row.label}</td>
                  <td className="px-4 py-4 font-mono text-xs text-rose-400/90">
                    {row.vanilla}
                  </td>
                  <td className="px-4 py-4 font-mono text-xs text-brand-400/90">
                    {row.mithril}
                  </td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </motion.div>
      </div>
    </section>
  );
}
