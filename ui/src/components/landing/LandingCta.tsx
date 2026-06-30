"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { fadeUp, scrollRevealStagger } from "@/components/landing/motion";

export function LandingCta() {
  return (
    <section className="border-t border-zinc-800 py-24">
      <motion.div
        className="mx-auto max-w-2xl px-4 text-center sm:px-6"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={scrollRevealStagger}
      >
        <motion.h2 variants={fadeUp} className="landing-heading text-3xl sm:text-4xl">
          Run the attack demo.
          <br />
          <motion.span
            variants={fadeUp}
            className="inline-block font-medium text-gradient-brand"
          >
            Watch poison fail.
          </motion.span>
        </motion.h2>
        <motion.p
          variants={fadeUp}
          className="mt-4 text-base leading-relaxed text-zinc-400 sm:text-lg"
        >
          Terminal demo, live dashboard, or both — the full pipeline is already
          wired.
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
