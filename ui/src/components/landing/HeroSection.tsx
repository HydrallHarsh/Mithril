import Link from "next/link";
import { HeroBackground } from "@/components/landing/HeroBackground";
import { DemoVideoFrame } from "@/components/landing/DemoVideoFrame";

export function HeroSection() {
  return (
    <section className="relative flex min-h-screen flex-col items-center overflow-hidden pb-24 pt-28 sm:pt-32">
      <HeroBackground />

      {/* Centered copy — Manthan-style vertical stack */}
      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center px-4 text-center sm:px-6">
        <a
          href="#how-it-works"
          className="mb-10 inline-flex items-center overflow-hidden rounded-full border border-zinc-800 bg-zinc-950/60 text-xs backdrop-blur-sm transition hover:border-zinc-700"
        >
          <span className="bg-emerald-400/90 px-3 py-1.5 font-medium text-zinc-950">
            Cognee
          </span>
          <span className="px-3 py-1.5 text-zinc-400">
            Trust layer for agent memory →
          </span>
        </a>

        <h1 className="font-display text-[2.75rem] font-bold leading-[1.08] tracking-tight text-white sm:text-6xl md:text-7xl">
          Stop poisoned claims{" "}
          <span className="font-serif italic text-zinc-100">
            before they stick.
          </span>
        </h1>

        <p className="mt-6 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
          Mithril sits between your agent and Cognee — scoring source
          reputation, checking contradictions against verified memory, and
          gating every write with an audit trail you can actually defend.
        </p>

        <Link
          href="/dashboard"
          className="mt-10 inline-flex items-center gap-2 rounded-full bg-emerald-400 px-8 py-3.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300"
        >
          Open dashboard
          <span aria-hidden>→</span>
        </Link>
      </div>

      {/* Demo video frame — below hero text */}
      <div className="relative z-10 mt-16 w-full px-4 sm:mt-20 sm:px-6">
        <DemoVideoFrame />
      </div>
    </section>
  );
}
