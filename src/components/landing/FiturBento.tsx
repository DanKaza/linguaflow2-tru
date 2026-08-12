"use client";

import { motion } from "framer-motion";
import { viewportOnce, easeOut } from "@/lib/motion";
import { Sparkle } from "@phosphor-icons/react";
/**
 * Bento section — "02 Belajar" + "03 AI Sensei" side by side.
 * Left: study lesson card mockup. Right: AI chat preview.
 */

export function FiturBento() {
  return (
    <section aria-label="Fitur belajar" className="relative py-20 overflow-hidden">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        {/* Header */}

        <div className="grid gap-8 md:grid-cols-2">
          {/* ─── Left: Belajar Kosakata ─── */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportOnce}
            transition={{ duration: 0.7, ease: easeOut }}
            className="group"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-jp-red mb-4">02 Belajar</p>
            <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-xl transition-all duration-500 group-hover:shadow-2xl">
              <div className="border-b border-line/60 bg-cream-deep/30 px-5 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-ink-soft/50">BAB 3 — KATA KERJA</p>
                <h3 className="mt-1 text-base font-bold text-navy font-display">Daftar Kosakata</h3>
              </div>
              <div className="divide-y divide-line/40 px-5">
                {["食べる", "飲む", "話す", "聞く"].map((jp, i) => (
                  <div key={jp} className="flex items-center gap-4 py-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy/5 text-[11px] font-bold text-ink-soft/50">{i + 1}</span>
                    <span lang="ja" className="jp-bold text-sm text-navy">{jp}</span>
                    <span className="ml-auto text-xs text-ink-soft">{["Makan", "Minum", "Bicara", "Dengar"][i]}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-line/60 px-5 py-3.5">
                <span className="rounded-full bg-navy px-4 py-1.5 text-[11px] font-semibold text-cream">Mulai Belajar</span>
                <span className="text-[11px] font-semibold text-jp-red">4/10</span>
              </div>
            </div>
          </motion.div>

          {/* ─── Right: AI Sensei Chat ─── */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportOnce}
            transition={{ duration: 0.7, ease: easeOut, delay: 0.1 }}
            className="group"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-jp-red mb-4">03 AI Sensei</p>
            <div className="rounded-2xl border border-line bg-white p-5 shadow-xl transition-all duration-500 group-hover:shadow-2xl h-full">
              <div className="flex items-center gap-3 mb-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/20">
                  <Sparkle size={16} className="text-gold" />
                </span>
                <div>
                  <p className="text-sm font-bold text-navy font-display">Teman Belajar</p>
                  <p className="text-[11px] text-ink-soft/60">Siap bantu kamu belajar</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-br-md bg-navy px-4 py-2.5 text-xs text-cream">
                    Apa bedanya は sama が?
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="flex gap-1 rounded-2xl rounded-bl-md bg-cream-deep px-4 py-2.5">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-ink-soft/30 [animation-delay:0ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-ink-soft/30 [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-ink-soft/30 [animation-delay:300ms]" />
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-cream-deep px-4 py-2.5 text-xs text-navy">
                    <p className="font-semibold text-jp-red">は untuk topik.</p>
                    <p className="font-semibold text-jp-red mt-0.5">が untuk subjek.</p>
                    <p className="mt-1.5 text-ink-soft">
                      Contoh: <span lang="ja" className="jp">わたしは学生です。</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
