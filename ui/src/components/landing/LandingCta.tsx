import Link from "next/link";

export function LandingCta() {
  return (
    <section className="border-t border-zinc-800 py-24">
      <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
        <h2 className="font-display text-4xl font-bold tracking-tight text-zinc-50 sm:text-5xl">
          Run the attack demo.
          <br />
          <span className="text-emerald-400">Watch poison fail.</span>
        </h2>
        <p className="mt-4 text-lg text-zinc-400">
          Terminal demo, live dashboard, or both — the full pipeline is already
          wired.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-full bg-zinc-100 px-8 py-3.5 text-sm font-semibold text-zinc-900 transition hover:bg-white"
          >
            Open dashboard
          </Link>
          <code className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-950 px-6 py-3.5 font-mono text-xs text-zinc-400">
            make demo
          </code>
        </div>
      </div>
    </section>
  );
}
