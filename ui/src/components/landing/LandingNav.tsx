import Link from "next/link";

export function LandingNav() {
  return (
    <nav className="fixed top-0 z-50 w-full bg-black/40 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 font-mono text-xs font-semibold text-emerald-400">
            M
          </div>
          <span className="font-display text-sm font-semibold tracking-tight text-zinc-100">
            Mithril
          </span>
        </Link>

        <div className="flex items-center gap-3 sm:gap-4">
          <a
            href="#comparison"
            className="hidden text-sm text-zinc-400 transition hover:text-zinc-100 sm:inline"
          >
            Compare
          </a>
          <Link
            href="/dashboard"
            className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-emerald-300"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </nav>
  );
}
