"use client";

import { motion } from "framer-motion";
import { fadeUp } from "@/components/landing/motion";
import Link from "next/link";

export function LandingFooter() {
  return (
    <motion.footer
      className="relative py-12"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeUp}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 font-mono text-xs text-zinc-300">
            M
          </div>
          <span className="text-sm text-zinc-500">
            Mithril — trust layer for Cognee memory
          </span>
        </div>
        <div className="flex gap-6 text-sm text-zinc-500">
          <Link href="/dashboard" className="transition hover:text-zinc-300">
            Dashboard
          </Link>
          <a href="#how-it-works" className="transition hover:text-zinc-300">
            Docs
          </a>
        </div>
        <p className="text-xs text-zinc-600">© 2026 Mithril</p>
      </div>
    </motion.footer>
  );
}
