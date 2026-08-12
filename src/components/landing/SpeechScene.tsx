"use client";

import { motion } from "framer-motion";
import { viewportOnce, easeOut } from "@/lib/motion";

const bars = [1, 2, 3, 4, 5, 6, 7];

export function SpeechScene() {
  return (
    <section aria-label="Speech recognition" className="relative py-20 overflow-hidden">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.7, ease: easeOut }}
          className="flex flex-col lg:flex-row-reverse items-center gap-10 lg:gap-16"
        >
          {/* Visual — speech card */}
          <div className="flex-1 w-full max-w-lg">
            <div className="rounded-2xl border border-line/40 bg-white/60 p-6 text-center shadow-sm backdrop-blur-[2px] md:backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-jp-red mb-4"><span className="text-ink-soft/30 mr-2 font-normal tracking-normal">04</span> Latihan Ucapan</p>
              <p lang="ja" className="jp-bold text-3xl md:text-4xl text-navy">おはようございます</p>
              <p className="mt-2 text-sm text-ink-soft/50">Ohayou gozaimasu</p>
              {/* Waveform */}
              <div className="mx-auto flex h-16 items-center justify-center gap-1 mt-6" aria-hidden="true">
                {bars.map((_, i) => (
                  <div key={i} className="lf-waveform-bar h-10 w-1.5 rounded-full bg-jp-red/30" style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
              {/* Score */}
              <div className="mt-6 inline-flex items-center gap-3 rounded-xl border border-line/30 bg-white/80 px-5 py-3 shadow-sm">
                <span className="text-3xl font-bold text-jp-red">92</span>
                <span className="text-sm font-bold text-ink-soft/50">/ 100</span>
              </div>
            </div>
          </div>

          {/* Text */}
          <div className="flex-1 text-center lg:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-jp-red mb-3"><span className="text-ink-soft/30 mr-2 font-normal tracking-normal">04</span> Latihan Ucapan</p>
            <h2 className="text-3xl md:text-4xl font-bold text-navy leading-tight font-display">
              Latihan Pengucapan<br />
              <span className="font-display-italic text-ink-soft/60 italic font-normal">dengan AI Speech Recognition</span>
            </h2>
            <p className="mt-4 text-sm text-ink-soft/70 max-w-md leading-relaxed">
              Ucapkan kalimat bahasa Jepang dan dapatkan skor real-time untuk kejelasan, intonasi, dan kelancaran.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
