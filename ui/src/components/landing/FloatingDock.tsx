"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

const LINKS = [
  { label: "Dashboard", href: "/dashboard", icon: "📊" },
  { label: "MCP Server", href: "#how-it-works", icon: "🔌" },
  { label: "REST API", href: "#how-it-works", icon: "⚡" },
  { label: "Run Demo", href: "#comparison", icon: "▶️" },
  { label: "Benchmark", href: "#comparison", icon: "📈" },
];

export function FloatingDock() {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setExpanded(window.scrollY > window.innerHeight * 0.65);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 z-50"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.9, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className={`mx-auto transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          expanded
            ? "max-w-full px-0"
            : "max-w-fit px-0 mb-6"
        }`}
      >
        <nav
          className={`flex items-center justify-center gap-1 backdrop-blur-xl transition-all duration-500 ${
            expanded
              ? "rounded-none border-t border-zinc-800/80 bg-zinc-950/95 px-8 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.5)]"
              : "mx-auto rounded-2xl border border-zinc-800/60 bg-zinc-950/80 px-3 py-2.5 shadow-xl shadow-black/40"
          }`}
        >
          {LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={`group relative flex items-center gap-2 rounded-xl font-medium transition-all duration-300 hover:bg-zinc-800/70 hover:text-zinc-100 ${
                expanded
                  ? "px-5 py-2.5 text-sm text-zinc-300"
                  : "px-4 py-2 text-[0.8rem] text-zinc-500"
              }`}
            >
              <span className={`transition-all duration-300 ${expanded ? "text-lg" : "text-base"}`}>
                {link.icon}
              </span>
              <span className="whitespace-nowrap">{link.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </motion.div>
  );
}
