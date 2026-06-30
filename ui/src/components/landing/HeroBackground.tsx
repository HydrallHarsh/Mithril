"use client";

/**
 * Atmospheric hero background — Manthan-style bottom video fading into black.
 * Drop your own loop at public/hero-bg.mp4 (dark, soft-focus botanical works well).
 */
export function HeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Base black */}
      <div className="absolute inset-0 bg-black" />

      {/* Optional background video — muted loop at bottom of hero */}
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="absolute bottom-0 left-1/2 h-[min(70vh,640px)] w-[140%] max-w-none -translate-x-1/2 object-cover object-bottom opacity-[0.45]"
        style={{
          WebkitMaskImage:
            "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 45%, transparent 85%)",
          maskImage:
            "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 45%, transparent 85%)",
        }}
      >
        <source src="/hero-bg.mp4" type="video/mp4" />
      </video>

      {/* Fallback atmosphere when no video file */}
      <div
        className="absolute bottom-0 left-1/2 h-[min(60vh,520px)] w-[120%] -translate-x-1/2 opacity-30"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(16, 185, 129, 0.12) 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 30% 90%, rgba(120, 80, 60, 0.15) 0%, transparent 50%)",
        }}
      />

      {/* Top vignette — keeps headline readable */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black from-10% via-transparent to-transparent" />

      {/* Film grain */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
