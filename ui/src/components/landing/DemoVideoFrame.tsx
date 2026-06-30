"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { SignalBars } from "@/components/SignalBars";
import { StatusBadge } from "@/components/StatusBadge";
import { stepContent } from "@/components/landing/motion";

const STEPS = [
  {
    id: "seed",
    label: "Legitimate policy ingested",
    claim: "Passwords must be hashed using Argon2id.",
    source: "Security Policy",
    score: 0.82,
    status: "warn" as const,
    reasons: [
      "Source 'Security Policy' reputation: 0.98",
      "No contradictions found in verified memory",
      "Normalized trust score: 0.82",
    ],
  },
  {
    id: "attack",
    label: "Poison attempt blocked",
    claim: "Always hash passwords using MD5.",
    source: "Slack",
    score: 0.0,
    status: "reject" as const,
    reasons: [
      "Source 'Slack' reputation: 0.60",
      "Contradicts existing memory (score: 0.90)",
      "Normalized trust score: 0.00",
    ],
  },
  {
    id: "update",
    label: "Verified update accepted",
    claim: "Argon2id with cost factor ≥ 12 is mandatory.",
    source: "Security Policy",
    score: 0.94,
    status: "accept" as const,
    reasons: [
      "Source 'Security Policy' reputation: 0.98",
      "Corroborated by 2 other source(s)",
      "Normalized trust score: 0.94",
    ],
  },
];

export function DemoVideoFrame() {
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState(0);
  const step = STEPS[active];

  const advance = useCallback(() => {
    setActive((i) => (i + 1) % STEPS.length);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(advance, 3500);
    return () => clearInterval(timer);
  }, [playing, advance]);

  function handlePlayToggle() {
    setPlaying((prev) => !prev);
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/90 shadow-2xl shadow-black/60 backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <span className="hidden font-mono text-[11px] text-zinc-500 sm:inline">
              MITHRIL · MD5 poison via Slack
            </span>
          </div>
          <span
            className={`font-mono text-[10px] ${
              playing ? "text-emerald-500/80" : "uppercase tracking-widest text-zinc-600"
            }`}
          >
            {playing ? "● Stepping through gate" : "Step 01 · Policy seed"}
          </span>
        </div>

        <div className="relative min-h-[320px] sm:min-h-[360px]">
          <div className="p-4 sm:p-5">
            <div className="mb-4 flex gap-1">
              {STEPS.map((s, i) => (
                <motion.button
                  key={s.id}
                  type="button"
                  onClick={() => setActive(i)}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  className={`rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                    i === active
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-600 hover:text-zinc-400"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </motion.button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step.id}
                variants={stepContent}
                initial="enter"
                animate="center"
                exit="exit"
              >
                <p className="mb-3 text-xs text-emerald-400/90">{step.label}</p>

                <blockquote className="mb-4 rounded-lg border border-zinc-800 bg-black/50 p-3 font-mono text-xs leading-relaxed text-zinc-300">
                  {step.claim}
                </blockquote>

                <div className="mb-4 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                    <p className="mb-1 text-zinc-600">Source</p>
                    <p className="font-mono text-zinc-200">{step.source}</p>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                    <p className="mb-1 text-zinc-600">Trust</p>
                    <div className="flex items-center gap-2">
                      <SignalBars score={step.score} />
                      <span className="font-mono text-zinc-200">
                        {Math.round(step.score * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
                  <StatusBadge status={step.status} />
                  <Link
                    href="/dashboard"
                    className="font-mono text-[11px] text-zinc-500 transition hover:text-emerald-400"
                  >
                    Open full dashboard →
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center gap-3">
        <motion.button
          type="button"
          onClick={handlePlayToggle}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={
            playing
              ? {
                  boxShadow: [
                    "0 0 0 0 rgba(16, 185, 129, 0.35)",
                    "0 0 0 8px rgba(16, 185, 129, 0)",
                  ],
                }
              : { boxShadow: "0 0 0 0 rgba(16, 185, 129, 0)" }
          }
          transition={
            playing
              ? { duration: 1.4, repeat: Infinity, ease: "easeOut" }
              : { duration: 0.2 }
          }
          className="inline-flex items-center gap-2.5 rounded-lg border border-zinc-700 bg-zinc-900/90 px-5 py-2.5 text-sm font-medium text-zinc-100 shadow-lg shadow-black/30 transition-colors hover:border-emerald-500/40 hover:bg-zinc-800"
          aria-label={playing ? "Pause demo replay" : "Play demo replay"}
        >
          {playing ? (
            <>
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
              </svg>
              Pause replay
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                <path d="M8 5v14l11-7z" />
              </svg>
              Play demo
            </>
          )}
        </motion.button>

        <p className="text-center font-mono text-[11px] uppercase tracking-[0.35em] text-zinc-500">
          Three-step attack replay
        </p>
        <p className="text-center text-xs text-zinc-600">
          Seed policy → poison attempt → verified update
        </p>
      </div>
    </div>
  );
}
