"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion, useAnimation } from "framer-motion";

const LINKS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "MCP Server", href: "/docs/mcp-server" },
  { label: "REST API", href: "/docs/rest-api" },
  { label: "Run Demo", href: "/docs/run-demo" },
  { label: "Benchmark", href: "/docs/benchmark" },
];

export function FloatingDock() {
  const controls = useAnimation();

  useEffect(() => {
    const handleScroll = () => {
      // Start expanding immediately.
      // Fully expanded after ~250px of scrolling.
      const progress = Math.min(window.scrollY / 250, 1);

      controls.start({
        maxWidth: 1000 * progress + 600 * (1 - progress), // Bigger starting width
        y: -(progress * 50) - 50,

        paddingLeft: 18 + progress * 14,
        paddingRight: 18 + progress * 14,

        paddingTop: 11 + progress * 3,
        paddingBottom: 11 + progress * 3,

        gap: 12 + progress * 12,

        backgroundColor: `rgba(9, 9, 11, ${1 - progress * 0.6})`, // Goes from 1.0 to 0.4 opacity
      });
    };

    // Defer the initial calculation so Framer Motion has time to mount the controls
    requestAnimationFrame(() => {
      handleScroll();
    });

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => window.removeEventListener("scroll", handleScroll);
  }, [controls]);

  return (
    <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center pointer-events-none">
      <motion.nav
        initial={{
          maxWidth: 600,
          y: 0,
          paddingLeft: 18,
          paddingRight: 18,
          paddingTop: 11,
          paddingBottom: 11,
          gap: 12,
          backgroundColor: "rgba(9, 9, 11, 1)",
        }}
        animate={controls}
        transition={{
          duration: 0.18,
          ease: "easeOut",
        }}
        className="
          pointer-events-auto
          w-[90vw]
          flex
          items-center
          justify-center
          rounded-full
          border
          border-zinc-800/70
          backdrop-blur-xl
          shadow-2xl
          overflow-hidden
        "
      >
        {LINKS.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="
              whitespace-nowrap
              rounded-full
              px-5
              py-3
              text-sm
              text-zinc-300
              transition-colors
              duration-300
              hover:bg-zinc-800
              hover:text-white
            "
          >
            {link.label}
          </Link>
        ))}
      </motion.nav>
    </div>
  );
}