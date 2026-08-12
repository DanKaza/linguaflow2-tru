"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { viewportOnce, easeOut } from "@/lib/motion";
import { JapaneseCloud } from "@/components/landing/JapaneseCloud";

export function EndingScene() {
  return (
    <section aria-label="Call to action" className="relative py-28 overflow-hidden text-center">
      {/* Top connector wave — echoes TeamScene bottom wave */}
      <div className="absolute -top-3 left-0 right-0 flex justify-center" aria-hidden="true">
        <svg className="w-64 h-4 text-navy/[0.03]" viewBox="0 0 256 16" fill="none">
          <path d="M0 8 Q 32 0 64 8 Q 96 16 128 8 Q 160 0 192 8 Q 224 16 256 8" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
      </div>
      <div className="pointer-events-none absolute left-0 top-0 w-[60%] max-w-[580px] -translate-x-[6%] -translate-y-[20%] select-none">
        <JapaneseCloud
          variant="kasumi-large"
          color="navy"
          className="blur-[2px]"
        />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={viewportOnce}
        transition={{ duration: 0.7, ease: easeOut }}
        className="relative z-10 mx-auto max-w-3xl px-6"
      >
        <p className="text-xs text-jp-red/50 italic mb-6">
          <span lang="ja" className="jp not-italic">千里の道も一歩から</span>
          <span className="mx-2 text-ink-soft/30">—</span>
          Perjalanan seribu mil dimulai dari satu langkah
        </p>
        <h2 className="text-3xl font-bold text-navy md:text-5xl leading-tight font-display">
          Mulai perjalananmu.
        </h2>
        <p className="mt-4 text-sm text-ink-soft/60 max-w-md mx-auto">
          Bahasa Jepang bukan cuma pelajaran —{" "}
          <span className="italic">it&apos;s your ticket to a bigger future</span>.{" "}
          Kerja di perusahaan Jepang, lanjut studi, atau sekadar nonton anime
          tanpa subtitle. Apapun tujuannya, LinguaFlow di sini buat nemenin.
          Gratis untuk murid SMK Texar.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/login"
            className="group relative w-full sm:w-auto rounded-full bg-navy px-10 py-3.5 text-sm font-bold text-cream shadow-xl transition-all hover:bg-navy-soft hover:scale-[1.02] active:brightness-[0.92] overflow-hidden">
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <span className="relative z-10">Masuk ke Kelas</span>
          </Link>
          <Link href="/kontak"
            className="group relative w-full sm:w-auto rounded-full border border-line bg-white px-10 py-3.5 text-sm font-bold text-navy transition-all hover:bg-navy/5 active:brightness-[0.95]">
            Butuh Bantuan?
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
