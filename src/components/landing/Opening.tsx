"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";

/** Subscribe to OS-level reduced-motion preference changes. */
function subscribeReducedMotion(callback: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}
function getReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Opening — a cinematic intro before the hero.
 * Cream void → single kanji fades in → thin line grows → dissolves.
 * - Skipped entirely when the user prefers reduced motion.
 * - Saves a sessionStorage flag so returning visitors skip it.
 * - Traps focus and uses aria-modal for a11y.
 */
export function Opening({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"kanji" | "line" | "out">("kanji");
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    () => false,
  );
  const overlayRef = useRef<HTMLDivElement>(null);

  // Auto-focus the overlay so keyboard users don't tab behind it
  useEffect(() => {
    // Small delay so the DOM is ready
    const id = setTimeout(() => overlayRef.current?.focus(), 50);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    // 1. Skip if user prefers reduced motion
    if (reducedMotion) {
      onDone();
      return;
    }

    // 2. Skip for returning visitors (same session)
    try {
      if (sessionStorage.getItem("lf-opening-seen") === "1") {
        onDone();
        return;
      }
    } catch { /* sessionStorage may be blocked */ }

    // 3. Play the cinematic sequence
    const t1 = setTimeout(() => setPhase("line"), 700);
    const t2 = setTimeout(() => setPhase("out"), 1500);
    const t3 = setTimeout(() => {
      try { sessionStorage.setItem("lf-opening-seen", "1"); } catch { /* noop */ }
      onDone();
    }, 1850);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onDone, reducedMotion]);

  if (reducedMotion) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={overlayRef}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-washi"
        role="dialog"
        aria-modal="true"
        aria-label="Opening animation — tekan Escape untuk lewati"
        tabIndex={-1}
        initial={{ opacity: 1 }}
        animate={phase === "out" ? { opacity: 0 } : { opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            try { sessionStorage.setItem("lf-opening-seen", "1"); } catch { /* noop */ }
            onDone();
          }
        }}
      >
        {/* Decorative patterns */}
        <div className="seigaiha pointer-events-none absolute inset-0 z-0 opacity-30" aria-hidden="true" />
        <div className="seigaiha-gold pointer-events-none absolute inset-0 z-0 opacity-20 scale-y-[-1]" aria-hidden="true" />

        <div className="relative z-10 flex flex-col items-center">
          {/* Vermillion brushstroke reveal */}
          <motion.div
            className="mb-8"
            initial={{ width: 0, opacity: 0 }}
            animate={phase === "kanji" ? { width: 60, opacity: 1 } : { width: 0, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="block h-0.5 bg-jp-red" style={{ width: 60 }} />
          </motion.div>

          <motion.span
            lang="ja"
            className="jp-bold text-7xl text-navy md:text-9xl"
            initial={{ opacity: 0, scale: 0.92, filter: "blur(8px)" }}
            animate={
              phase === "kanji"
                ? { opacity: 1, scale: 1, filter: "blur(0px)" }
                : { opacity: 0.18, scale: 1.04, filter: "blur(0px)" }
            }
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            日本語
          </motion.span>
          <div className="mt-6 h-px w-0 overflow-hidden bg-navy/40">
            <motion.div
              className="h-px bg-navy"
              initial={{ width: 0 }}
              animate={phase === "line" ? { width: 160 } : { width: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <motion.p
            className="mt-5 text-xs uppercase tracking-[0.4em] text-ink-soft"
            initial={{ opacity: 0 }}
            animate={phase === "line" ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            LinguaFlow
          </motion.p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
