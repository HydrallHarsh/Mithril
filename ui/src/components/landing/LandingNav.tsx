"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function LandingNav() {
  return (
    <motion.nav
      className="fixed top-0 z-50 w-full bg-black/40 backdrop-blur-md"
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-memory-500/40 bg-zinc-900 font-mono text-xs font-semibold text-gradient-brand">
            M
          </div>
          <span className="font-display text-[0.95rem] font-semibold text-zinc-100">
            Mithril
          </span>
        </Link>

        <div className="flex items-center gap-3 sm:gap-4">
          <motion.a
            href="#comparison"
            className="hidden text-sm text-zinc-400 sm:inline"
            whileHover={{ scale: 1.05, color: "#f4f4f5" }}
            whileTap={{ scale: 0.95 }}
          >
            Compare
          </motion.a>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link
              href="/dashboard"
              className="rounded-lg bg-brand-400 px-4 py-2 text-sm font-medium text-zinc-950 shadow-lg shadow-brand-500/20 transition-colors hover:bg-brand-300"
            >
              Dashboard
            </Link>
          </motion.div>
        </div>
      </div>
    </motion.nav>
  );
}
