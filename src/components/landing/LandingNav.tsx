"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { List, X } from "@phosphor-icons/react";
import { ToriiMark } from "@/components/brand/Logo";

const shortcuts = [
  { id: "demo", label: "Demo" },
  { id: "awal-mula", label: "Awal Mula" },
  { id: "tim", label: "Tim" },
];

function scrollToId(id: string) {
  if (typeof document === "undefined") return;
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * Minimal auto-hiding landing nav.
 * Desktop: logo + center shortcuts + auth actions.
 * Mobile: logo + hamburger; shortcuts & auth live inside a dropdown sheet.
 */
export function LandingNav() {
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    if (y > prev && y > 160) setHidden(true);
    else setHidden(false);
  });

  // Close the mobile sheet when tapping anywhere outside the header.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const handleShortcut = (id: string) => {
    setOpen(false);
    scrollToId(id);
  };

  return (
    <motion.header
      ref={headerRef}
      initial={{ y: -90, opacity: 0 }}
      animate={{ y: hidden ? -90 : 0, opacity: hidden ? 0 : 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4 touch-pan-y"
    >
      <nav className="flex w-full max-w-6xl items-center justify-between gap-3 rounded-full border border-line/70 bg-cream/80 px-4 py-2.5 backdrop-blur-md shadow-soft md:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="LinguaFlow">
          <ToriiMark width={22} height={22} color="var(--color-jp-red)" />
          <span className="text-base font-bold tracking-tight text-navy">LinguaFlow</span>
          <span className="jp hidden text-[10px] text-jp-red/40 sm:inline">言語</span>
        </Link>

        {/* Desktop shortcuts */}
        <div className="hidden items-center gap-1 md:flex">
          {shortcuts.map((s) => (
            <button
              key={s.id}
              onClick={() => scrollToId(s.id)}
              className="rounded-full px-3 py-1.5 text-sm font-medium text-navy/70 transition-colors hover:bg-navy/5 hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jp-red focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Desktop auth */}
        <div className="hidden shrink-0 items-center gap-2 md:flex">
          <Link
            href="/login"
            className="rounded-full px-4 py-1.5 text-sm font-semibold text-navy transition-colors hover:bg-navy/5"
          >
            Masuk
          </Link>

        </div>

        {/* Mobile burger */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Tutup menu" : "Buka menu"}
          aria-expanded={open}
          className="flex h-11 w-11 items-center justify-center rounded-full text-navy transition-colors hover:bg-navy/5 md:hidden"
        >
          {open ? <X size={20} /> : <List size={20} />}
        </button>
      </nav>

      {/* Mobile dropdown sheet */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-4 right-4 top-[60px] z-50 flex flex-col gap-1 rounded-2xl border border-line/70 bg-cream/95 p-3 shadow-soft backdrop-blur-md md:hidden"
          >
            {shortcuts.map((s) => (
              <button
                key={s.id}
                onClick={() => handleShortcut(s.id)}
                className="rounded-xl px-4 py-3 text-left text-sm font-medium text-navy transition-colors hover:bg-navy/5"
              >
                {s.label}
              </button>
            ))}
            <div className="my-1 h-px bg-line/60" />
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="rounded-xl px-4 py-3 text-left text-sm font-semibold text-navy transition-colors hover:bg-navy/5"
            >
              Masuk
            </Link>
            <Link
              href="/kontak"
              onClick={() => setOpen(false)}
              className="rounded-xl px-4 py-3 text-left text-sm font-semibold text-navy transition-colors hover:bg-navy/5"
            >
              Kontak
            </Link>

          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
