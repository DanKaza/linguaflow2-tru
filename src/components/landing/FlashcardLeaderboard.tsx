"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { viewportOnce, easeOut } from "@/lib/motion";
import { Crown, ArrowCounterClockwise } from "@phosphor-icons/react";
/**
 * Section — "05 Flashcard" + "06 Peringkat" side by side.
 * Left: flip card (hover desktop, tap mobile). Right: podium.
 */

export function FlashcardLeaderboard() {
  const [flipped, setFlipped] = useState(false);

  return (
    <section aria-label="Flashcard dan Peringkat" className="relative py-20 overflow-hidden">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <div className="grid gap-10 md:grid-cols-2 md:gap-8">
          {/* ─── Left: Flashcard ─── */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportOnce}
            transition={{ duration: 0.7, ease: easeOut }}
            className="group"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-jp-red mb-4">05 Flashcard</p>
            <div className="w-full max-w-xs [perspective:800px]">
              <motion.div
                className="relative h-[260px] w-full cursor-pointer"
                style={{ transformStyle: "preserve-3d" }}
                animate={{ rotateY: flipped ? 180 : 0 }}
                whileHover={{ rotateY: flipped ? 180 : 0 }}
                onClick={() => setFlipped(!flipped)}
                transition={{ duration: 0.6, ease: [0.65, 0, 0.35, 1] }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFlipped(!flipped); } }}
                aria-label={flipped ? "Balik ke depan" : "Balik ke belakang"}
              >
                {/* Front */}
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-line bg-white p-6 shadow-xl" style={{ backfaceVisibility: "hidden" }}>
                  <span lang="ja" className="jp-bold text-5xl text-navy">食べる</span>
                  <span lang="ja" className="jp mt-3 text-base text-ink-soft">たべる</span>
                  <span className="mt-1 text-xs text-ink-soft">taberu</span>
                  {/* Flip hint */}
                  <motion.div
                    className="absolute bottom-3 right-3 flex items-center gap-1 text-[9px] text-ink-soft/30"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5 }}
                  >
                    <ArrowCounterClockwise size={10} />
                    <span>Tap</span>
                  </motion.div>
                </div>
                {/* Back */}
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-line bg-navy p-6 shadow-xl" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold mb-2">Arti</p>
                  <p className="text-2xl font-bold text-cream">Makan</p>
                  <p lang="ja" className="jp mt-4 text-xs text-cream/60">毎日ご飯を食べる</p>
                  {/* Tap to flip back */}
                  <span className="absolute bottom-3 right-3 text-[9px] text-cream/20">Tap balik</span>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* ─── Right: Leaderboard ─── */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportOnce}
            transition={{ duration: 0.7, ease: easeOut, delay: 0.1 }}
            className="group"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-jp-red mb-4">06 Peringkat</p>
            <div className="rounded-2xl border border-line bg-white/60 p-6 shadow-sm backdrop-blur-[2px] md:backdrop-blur-sm transition-all duration-500 group-hover:shadow-xl">
              <div className="flex items-end justify-center gap-3 mb-6">
                {[
                  { rank: 2, name: "Siti N.", xp: 3120, h: 24, initial: "SN" },
                  { rank: 1, name: "Budi S.", xp: 3580, h: 32, initial: "BS", crown: true },
                  { rank: 3, name: "Rina M.", xp: 2980, h: 20, initial: "RM" },
                ].map((p) => (
                  <div key={p.rank} className="flex flex-1 flex-col items-center">
                    <motion.div
                      className={`relative flex w-full flex-col items-center justify-end rounded-t-2xl ${p.crown ? "bg-gradient-to-t from-navy to-navy/60" : "bg-navy/20"}`}
                      initial={{ height: 28 }}
                      whileInView={{ height: p.h * 5 }}
                      viewport={viewportOnce}
                      transition={{ duration: 0.8, ease: easeOut, delay: 0.15 * p.rank }}
                    >
                      {p.crown && <div className="absolute -top-3 left-1/2 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full bg-gold shadow-lg"><Crown size={12} className="text-navy" /></div>}
                      <div className={`mb-1.5 flex ${p.crown ? "h-9 w-9" : "h-7 w-7"} items-center justify-center rounded-full bg-navy text-[11px] font-bold text-cream`}>{p.initial}</div>
                    </motion.div>
                    <p className="mt-1.5 text-xs font-bold text-navy">{p.name}</p>
                    <p className="text-[10px] text-ink-soft">{p.xp.toLocaleString()} XP</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-jp-red/10 bg-jp-red/[0.03] p-3 text-center">
                <p className="text-xs text-ink-soft">Kamu peringkat <span className="font-bold text-jp-red">#5</span> · 2.450 XP</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
