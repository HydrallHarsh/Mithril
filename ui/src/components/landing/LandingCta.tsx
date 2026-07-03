"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { fadeUp, scrollRevealStagger } from "@/components/landing/motion";

const STATS = [
  { value: "100%", label: "Attacks blocked in benchmark" },
  { value: "0", label: "False negatives (poison in memory)" },
  { value: "8-step", label: "Full governance pipeline" },
  { value: "14+", label: "Source reputation tiers" },
];

export function LandingCta() {
  return (
    <section className="relative py-28">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />

      {/* Stats row */}
      <motion.div
        className="mx-auto mb-16 grid max-w-4xl grid-cols-2 gap-6 px-4 sm:grid-cols-4 sm:px-6"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={scrollRevealStagger}
      >
        {STATS.map((stat) => (
          <motion.div
            key={stat.label}
            variants={fadeUp}
            className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-5 text-center backdrop-blur-sm"
          >
            <p className="font-display text-2xl font-semibold text-gradient-brand">
              {stat.value}
            </p>
            <p className="mt-1 text-xs leading-snug text-zinc-500">{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* CTA */}
      <motion.div
        className="mx-auto max-w-2xl px-4 text-center sm:px-6"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={scrollRevealStagger}
      >
        <motion.h2 variants={fadeUp} className="landing-heading text-4xl sm:text-5xl">
          See it yourself.
          <br />
          <motion.span
            variants={fadeUp}
            className="inline-block font-medium text-gradient-brand"
          >
            Submit a claim. Watch it get scored.
          </motion.span>
        </motion.h2>
        <motion.p
          variants={fadeUp}
          className="mt-5 text-lg leading-relaxed text-zinc-400 sm:text-xl"
        >
          The dashboard lets you submit memory claims, see the full trust
          breakdown live, inspect the audit trail, and watch source
          reputations shift after each decision.
        </motion.p>
        <motion.div
          variants={fadeUp}
          className="mt-8 flex flex-wrap justify-center gap-3"
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link
              href="/dashboard"
              className="inline-flex rounded-lg bg-zinc-100 px-8 py-3.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-white"
            >
              Open dashboard
              <span className="ml-2" aria-hidden>→</span>
            </Link>
          </motion.div>
          <motion.code
            whileHover={{ scale: 1.03, rotate: -1 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center rounded-lg border border-zinc-800 bg-zinc-950 px-6 py-3.5 font-mono text-xs text-zinc-400"
          >
            make demo
          </motion.code>
        </motion.div>
      </motion.div>
    </section>
  );
}
