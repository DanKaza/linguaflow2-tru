"use client";

import { useEffect } from "react";
import Lenis from "lenis";

function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

/** Smooth-scroll provider (Lenis). Mounted once at the landing root.
 *
 *  Automatically disabled on touch devices (phones, tablets) where
 *  native scrolling is dramatically smoother on low-RAM hardware.
 *  Desktop retains the buttery Lenis experience.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Skip Lenis on touch devices — native scroll is lighter & smoother
    // on 4 GB RAM phones where a JS rAF loop adds ~16 ms layout jank.
    if (isTouchDevice()) return;

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      autoRaf: true,
    });

    return () => {
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
