"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

import { Zap, Link2, Code2, Boxes, Rocket, BarChart3 } from "lucide-react";

const NAV_ITEMS = [
  { label: "MCP Server", href: "/docs/mcp-server", icon: Zap },
  { label: "REST API", href: "/docs/rest-api", icon: Link2 },
  { label: "Python SDK", href: "/docs/python-sdk", icon: Code2 },
  { label: "Architecture", href: "/docs/architecture", icon: Boxes },
  { label: "Run Demo", href: "/docs/run-demo", icon: Rocket },
  { label: "Benchmark", href: "/docs/benchmark", icon: BarChart3 },
];

function SidebarLink({
  item,
  active,
}: {
  item: (typeof NAV_ITEMS)[0];
  active: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={`
        group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
        transition-all duration-200
        ${
          active
            ? "bg-brand-500/10 text-brand-400"
            : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
        }
      `}
    >
      {active && (
        <motion.div
          layoutId="active-doc"
          className="absolute inset-0 rounded-lg border border-brand-500/20 bg-brand-500/[0.06]"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      )}
      <span
        className={`relative z-10 flex h-7 w-7 items-center justify-center rounded border transition-colors ${
          active
            ? "border-brand-500/40 bg-brand-500/10 text-brand-400"
            : "border-zinc-700/60 bg-transparent text-zinc-500 group-hover:border-brand-500/30 group-hover:bg-brand-500/5 group-hover:text-brand-400"
        }`}
      >
        <item.icon className="h-3.5 w-3.5 stroke-[2]" />
      </span>
      <span className="relative z-10">{item.label}</span>
    </Link>
  );
}

export function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-surface font-body text-zinc-100">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-surface-border bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-zinc-400 transition-colors hover:text-white"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path
                fillRule="evenodd"
                d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm">Back</span>
          </Link>

          <span className="mx-1 text-zinc-700 select-none">/</span>

          <Link href="/docs" className="font-display text-sm font-semibold tracking-display">
            <span className="text-gradient-brand">Mithril</span>
            <span className="ml-1.5 text-zinc-500">Docs</span>
          </Link>

          <div className="flex-1" />

          <Link
            href="/dashboard"
            className="rounded-full bg-zinc-800/60 px-4 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700/60 hover:text-white"
          >
            Dashboard →
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-0 px-4 py-8 sm:px-6 lg:gap-8">
        {/* Sidebar */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <nav className="sticky top-24 space-y-1">
            <p className="mb-3 px-3 text-[0.7rem] font-semibold uppercase tracking-label text-zinc-500">
              Guides
            </p>
            {NAV_ITEMS.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                active={pathname === item.href}
              />
            ))}
          </nav>
        </aside>

        {/* Mobile nav */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2 lg:hidden">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`
                shrink-0 rounded-full px-4 py-2 text-xs font-medium transition-colors
                ${
                  pathname === item.href
                    ? "bg-brand-500/15 text-brand-400"
                    : "bg-zinc-800/50 text-zinc-400 hover:text-zinc-200"
                }
              `}
            >
              <span className="flex items-center gap-1.5">
                <item.icon className="h-3 w-3 stroke-[2]" />
                {item.label}
              </span>
            </Link>
          ))}
        </div>

        {/* Main content */}
        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="min-w-0 flex-1"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
