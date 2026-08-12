"use client";

import type { ReactNode } from "react";

/**
 * LandingSectionBg — reusable background layer extracted from Hero.
 *
 * Renders the washi texture + gold seigaiha + inverted seigaiha +
 * asanoha + sumi-e radial blur gradients behind any section content.
 *
 * Usage: wrap a <section> (or any block) to give it the same
 * warm Japanese-paper background that Hero uses.
 *
 * Dark/ navy sections should NOT use this wrapper — they keep their
 * own solid bg-navy.
 */
export function LandingSectionBg({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-hidden bg-washi">
      {/* Gold seigaiha wave — animated */}
      <div
        className="seigaiha-gold pointer-events-none absolute inset-0 z-0 animate-seigaiha opacity-40"
        aria-hidden="true"
      />
      {/* Inverted seigaiha — subtle contrast */}
      <div
        className="seigaiha pointer-events-none absolute inset-0 z-0 scale-y-[-1] opacity-20"
        aria-hidden="true"
      />
      {/* Asanoha hemp pattern — very faint texture */}
      <div
        className="asanoha pointer-events-none absolute inset-0 z-0 opacity-[0.015]"
        aria-hidden="true"
      />

      {/* Sumi-e brushstroke radial blurs */}
      <div
        className="pointer-events-none absolute left-[5%] top-[15%] z-0 h-64 w-64 opacity-[0.03]"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse at 30% 50%, rgba(18,32,58,0.4) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <div
        className="pointer-events-none absolute right-[10%] bottom-[20%] z-0 h-80 w-48 opacity-[0.02]"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse, rgba(200,55,58,0.3) 0%, transparent 70%)",
          filter: "blur(50px)",
        }}
      />

      {/* Foreground content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
