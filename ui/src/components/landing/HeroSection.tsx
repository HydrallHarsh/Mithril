"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { HeroBackground } from "@/components/landing/HeroBackground";
import { fadeUp, staggerContainer } from "@/components/landing/motion";

export function HeroSection() {
  return (
    <section className="relative flex min-h-screen flex-col items-center overflow-hidden pb-28 pt-28 sm:pt-32">
      <HeroBackground />

      <motion.div
        className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center px-4 text-center sm:px-6"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.a
          href="#how-it-works"
          variants={fadeUp}
          className="landing-eyebrow mb-10 inline-flex items-center overflow-hidden rounded-md border border-zinc-800/90 bg-zinc-950/70 normal-case tracking-normal backdrop-blur-sm transition hover:border-zinc-700"
        >
          <span className="bg-brand-500/15 px-3 py-2 text-brand-300">
            Cognee governance
          </span>
          <span className="px-3 py-2 text-zinc-400">
            Trust layer for agent memory
          </span>
        </motion.a>

        <motion.h1
          variants={fadeUp}
          className="font-hero text-[2.35rem] font-bold leading-[1.08] text-white sm:text-5xl md:text-[4.1rem]"
        >
          Stop poisoned claims
          <br />
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="font-semibold text-gradient-brand"
          >
            before they stick.
          </motion.span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="mt-6 max-w-xl text-base leading-[1.7] text-zinc-400 sm:text-[1.3rem]"
        >
          Mithril sits between your agent and Cognee — scoring source
          reputation, checking contradictions against verified memory, and
          gating every write with an audit trail you can actually defend.
        </motion.p>

        <motion.div variants={fadeUp}>
          <motion.div whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.95 }}>
            <Link
              href="/dashboard"
              className="mt-10 inline-flex items-center gap-2 rounded-lg bg-brand-400 px-8 py-3.5 text-xl font-semibold text-zinc-950 shadow-lg shadow-brand-500/20 transition-colors hover:bg-brand-300"
            >
              Open dashboard
              <span aria-hidden>→</span>
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
