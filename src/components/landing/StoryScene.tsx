"use client";

import { motion } from "framer-motion";
import { viewportOnce, easeOut } from "@/lib/motion";
import { JapaneseCloud } from "@/components/landing/JapaneseCloud";

import { stats as siteStats } from "@/data/landing";

const stats = [
  { label: "Jam belajar terkumpul", val: siteStats.jamBelajar },
  { label: "Kosakata dikuasai", val: siteStats.kosakata },
  { label: "Murid aktif", val: String(siteStats.totalMurid) },
];

export function StoryScene() {
  return (
    <section aria-label="Cerita kami" id="awal-mula" className="relative py-20 overflow-hidden">
      {/* Decorative background cloud — kasumi-style */}
      <div className="pointer-events-none absolute top-0 right-0 w-[65%] max-w-[620px] translate-x-[4%] -translate-y-[10%] select-none">
        <JapaneseCloud
          variant="kasumi-large"
          color="navy"
          className="blur-[2px]"
        />
      </div>

      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.7, ease: easeOut }}
        >
          {/* ─── Header ─── */}
          <div className="relative mb-14 md:mb-20">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-jp-red mb-3">
              <span className="text-ink-soft/30 mr-2 font-normal tracking-normal">07</span>
              Awal Mula
            </p>
            <h2 className="text-3xl md:text-5xl font-bold text-navy leading-[1.15] relative font-display">
              Kenapa{" "}
              <span className="text-gold relative">
                LinguaFlow
                {/* Under-glow */}
                <span className="absolute -bottom-1 left-0 right-0 h-2 rounded-full bg-gold/20 blur-sm" />
              </span>
              ?
            </h2>
            {/* Decorative divider — asymmetric brushstroke */}
            <span
              className="block mt-4 h-[3px] w-24 rounded-full bg-gradient-to-r from-jp-red/50 via-jp-red/30 to-transparent"
              aria-hidden="true"
            />
          </div>

          {/* ─── Puzzle Grid ─── */}
          <div className="relative md:grid md:grid-cols-12 md:gap-6">
            {/* Text — col 1-7 */}
            <div className="md:col-span-7 md:pr-6 lg:pr-12">
              <p className="text-sm md:text-base text-ink-soft/70 leading-relaxed md:leading-loose">
                SMK Texar itu bukan cuma sekolah — ini rumah buat ribuan murid
                yang punya mimpi besar, termasuk menguasai bahasa Jepang untuk
                masa depan.
              </p>
              <p className="mt-4 md:mt-6 text-sm md:text-base text-ink-soft/60 leading-relaxed md:leading-loose">
                Masalahnya, belajar bahasa Jepang sering terasa berat: grammar
                rumit, kanji banyak, dan nggak ada yang bimbing dengan cara yang
                bener-bener deket. Itu yang mau LinguaFlow ubah.
              </p>
              <p className="mt-4 md:mt-6 text-sm md:text-base text-ink-soft/60 leading-relaxed md:leading-loose">
                Belajar yang serius, tapi tetap terasa ringan —{" "}
                <span className="italic text-ink-soft/70">
                  because learning a language should feel like an adventure,
                  not a burden.
                </span>
              </p>
            </div>

            {/* Stats — col 9-13, overlapping into col 8 */}
            <div className="relative md:col-span-5 md:col-start-8 mt-8 md:mt-0">
              {/* Connecting diagonal line */}
              <svg
                className="hidden md:block absolute -top-6 -left-16 w-24 h-24 text-jp-red/10"
                viewBox="0 0 100 100"
                fill="none"
                aria-hidden="true"
              >
                <path d="M0 90 Q 40 30 100 0" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>

              {/* Stat items — each floats at different position */}
              {/* Stat 1 — Jam */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={viewportOnce}
                transition={{ duration: 0.6, delay: 0.1, ease: easeOut }}
                className="relative z-10 mb-4 md:mb-3 md:ml-4 md:mr-8"
              >
                <div className="rounded-xl border border-line/40 bg-white/70 p-4 shadow-sm backdrop-blur-[2px] md:backdrop-blur-sm transition-all duration-300 hover:shadow-md hover:border-jp-red/20">
                  <p className="text-2xl md:text-3xl font-bold text-navy tabular-nums">{stats[0].val}</p>
                  <p className="text-xs text-ink-soft mt-0.5">{stats[0].label}</p>
                </div>
              </motion.div>

              {/* Stat 2 — Kosakata (pushes left, overlapping text area on desktop) */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={viewportOnce}
                transition={{ duration: 0.6, delay: 0.25, ease: easeOut }}
                className="relative z-20 mb-4 md:mb-3 md:-ml-10 md:mr-4"
              >
                <div className="rounded-xl border border-jp-red/15 bg-white/80 p-4 shadow-sm backdrop-blur-[2px] md:backdrop-blur-sm transition-all duration-300 hover:shadow-md hover:border-jp-red/30">
                  <p className="text-2xl md:text-3xl font-bold text-navy tabular-nums">{stats[1].val}</p>
                  <p className="text-xs text-ink-soft mt-0.5">{stats[1].label}</p>
                </div>
              </motion.div>

              {/* Stat 3 — Murid (bottom right) */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={viewportOnce}
                transition={{ duration: 0.6, delay: 0.4, ease: easeOut }}
                className="relative z-30 md:ml-6"
              >
                <div className="rounded-xl border border-line/40 bg-white/70 p-4 shadow-sm backdrop-blur-[2px] md:backdrop-blur-sm transition-all duration-300 hover:shadow-md hover:border-jp-red/20">
                  <p className="text-2xl md:text-3xl font-bold text-navy tabular-nums">{stats[2].val}</p>
                  <p className="text-xs text-ink-soft mt-0.5">{stats[2].label}</p>
                </div>
              </motion.div>

              {/* Decorative connecting dot */}
              <div className="hidden md:block absolute -bottom-4 -left-8 w-3 h-3 rounded-full bg-jp-red/10" aria-hidden="true" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
