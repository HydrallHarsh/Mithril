import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Cool slate-tinted dark base — more depth than flat black.
        surface: {
          DEFAULT: "#07080b",
          card: "#0e1015",
          raised: "#13161d",
          border: "#20242e",
        },
        // Brand / trust signal — emerald (also "accept" tier).
        brand: {
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
        },
        // Secondary / interactive accent — cyan.
        accent: {
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
        },
        // Memory / ambient motif — violet (ties the hero into the page).
        memory: {
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)"],
        mono: ["var(--font-geist-mono)"],
        display: ["var(--font-outfit)", "var(--font-geist-sans)", "system-ui", "sans-serif"],
        body: ["var(--font-figtree)", "var(--font-geist-sans)", "system-ui", "sans-serif"],
        hero: ["var(--font-syne)", "var(--font-outfit)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        display: "-0.03em",
        label: "0.16em",
      },
      keyframes: {
        "slide-in": {
          from: { opacity: "0", transform: "translateY(-4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "slide-in": "slide-in 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
