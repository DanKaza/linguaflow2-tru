"use client";

import { motion } from "framer-motion";
import { viewportOnce, easeOut } from "@/lib/motion";
import { Envelope, Lock } from "@phosphor-icons/react";
/**
 * Scene 2 — PRODUCT REVEAL
 * Compact zigzag: text left, laptop mockup right.
 */

export function ProductReveal() {
  return (
    <section aria-label="Product showcase" id="demo" className="relative py-20 overflow-hidden">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.7, ease: easeOut }}
          className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16"
        >
          {/* ─── Text (Left) ─── */}
          <div className="flex-1 text-center lg:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-jp-red mb-3"><span className="text-ink-soft/30 mr-2 font-normal tracking-normal">01</span> Produk</p>
            <h2 className="text-3xl md:text-4xl font-bold text-navy leading-tight font-display">
              Platform Belajar<br />
              <span className="font-display-italic text-ink-soft/60 italic font-normal">dari Siswa SMK Texar</span>
            </h2>
            <p className="mt-4 text-sm text-ink-soft/70 max-w-md leading-relaxed">
              Login untuk mulai belajar bahasa Jepang dengan metode yang menyenangkan.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center lg:justify-start">
              {["Murid", "Guru", "Admin"].map(r => (
                <span key={r} className="rounded-full border border-line/30 bg-white/50 px-4 py-1.5 text-[11px] font-semibold text-ink-soft">{r}</span>
              ))}
            </div>
          </div>

          {/* ─── Laptop Mockup (Right) ─── */}
          <div className="flex-1 w-full max-w-lg">
            <div className="relative [transform-style:preserve-3d]">
              <div className="absolute left-1/2 top-[94%] -translate-x-1/2 h-8 w-[70%] rounded-[50%] bg-navy/20 blur-xl" />
              <div className="relative rounded-[1.2rem] bg-[#0a1120] p-1.5 shadow-[0_25px_50px_-20px_rgba(8,14,28,0.5)] ring-1 ring-white/10">
                {/* Camera module */}
                <div className="absolute left-1/2 top-1 z-30 -translate-x-1/2 flex items-center gap-2">
                  <div className="flex items-center gap-1.5 rounded-full bg-[#1a1a2e] px-2 py-[2px] shadow-inner">
                    <div className="relative h-[4px] w-[4px] rounded-full">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#2a2a4e] to-[#0a0a1e]" />
                      <div className="absolute left-[0.5px] top-[0.5px] h-[1px] w-[1.5px] rounded-full bg-white/30" />
                    </div>
                    <div className="h-[2px] w-[2px] rounded-full bg-[#00ff88]/60" />
                  </div>
                </div>
                {/* Screen */}
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[0.6rem] bg-[#f6f1eb] shadow-inner">
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.12] via-transparent to-transparent z-10" />
                  <div className="flex h-full flex-col items-center justify-center p-4">
                    <div className="flex items-center gap-1.5 mb-3">
                      <svg viewBox="0 0 32 32" width={16} height={16} fill="none"><path d="M4 9h24" stroke="#b6171e" strokeWidth="3" strokeLinecap="round" /><path d="M6 13h20" stroke="#b6171e" strokeWidth="2" strokeLinecap="round" /><path d="M10 13v12M22 13v12" stroke="#b6171e" strokeWidth="3" strokeLinecap="round" /></svg>
                      <span className="font-bold text-navy text-[11px]">LinguaFlow</span>
                    </div>
                    <div className="relative w-full max-w-[240px] rounded-xl border border-line/30 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-[2px] md:backdrop-blur-sm">
                      <div className="absolute -top-px left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-jp-red to-transparent" />
                      <div className="space-y-2">
                        <div className="relative">
                          <Envelope size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-soft/40" />
                          <input readOnly placeholder="NIS atau Email" className="w-full rounded-lg border border-line/30 bg-white/60 py-1.5 pl-7 pr-2 text-[9px] text-navy placeholder:text-ink-soft/30" />
                        </div>
                        <div className="relative">
                          <Lock size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-soft/40" />
                          <input readOnly placeholder="Password" className="w-full rounded-lg border border-line/30 bg-white/60 py-1.5 pl-7 pr-2 text-[9px] text-navy placeholder:text-ink-soft/30" />
                        </div>
                        <button className="w-full rounded-lg bg-navy py-1.5 text-[9px] font-bold text-cream">Masuk →</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Hinge + Deck */}
              <div className="relative z-10 mx-auto h-1 w-[98%] -mt-px rounded-full bg-gradient-to-b from-navy-soft to-[#0a1120] shadow-[0_2px_4px_rgba(0,0,0,0.3)]" />
              <div className="relative mx-auto w-[110%] -ml-[5%]">
                <div className="relative h-4 rounded-b-[1.2rem] bg-gradient-to-b from-navy-soft to-navy shadow-[0_15px_30px_-10px_rgba(18,32,58,0.4)]" style={{ clipPath: "polygon(4% 0, 96% 0, 100% 100%, 0% 100%)" }}>
                  <div className="absolute left-1/2 top-1/2 h-1 w-16 -translate-x-1/2 -translate-y-1/2 rounded-md bg-cream/10" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
