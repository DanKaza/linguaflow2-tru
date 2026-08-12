"use client";

import { useRef, useState, useCallback } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowRight, CaretRight } from "@phosphor-icons/react";
import { easeOut } from "@/lib/motion";
import { JapaneseCloud } from "@/components/landing/JapaneseCloud";
import { schoolName, stats } from "@/data/landing";

/**
 * Hero — Editorial Japanese hero with floating glass cards,
 * zen garden background photo, and centered typography.
 */
export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const prefersReduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  const yKanjiVal = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const yHeadVal = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const opHeadVal = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const noParallax = prefersReduced;
  const yKanji = noParallax ? 0 : yKanjiVal;
  const yHead = noParallax ? 0 : yHeadVal;
  const opHead = noParallax ? 1 : opHeadVal;

  // Mouse parallax for floating cards — throttled with rAF (max once per frame)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const tickingRef = useRef(false);
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (tickingRef.current) return;
    tickingRef.current = true;
    requestAnimationFrame(() => {
      const x = (window.innerWidth - e.clientX * 2) / 80;
      const y = (window.innerHeight - e.clientY * 2) / 80;
      setMousePos({ x, y });
      tickingRef.current = false;
    });
  }, []);

  return (
    <section
      aria-label="Hero"
      ref={ref}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-washi"
      onMouseMove={handleMouseMove}
    >
      {/* ─── Washi Texture Background (WebP, fades out at bottom via CSS mask) ─── */}
      <div
        className="pointer-events-none absolute inset-0 z-0 will-change-transform"
        aria-hidden="true"
        style={{
          maskImage: "linear-gradient(to bottom, black 55%, transparent 92%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 55%, transparent 92%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero-bg.webp"
          alt=""
          className="h-full w-full object-cover"
          loading="eager"
          fetchPriority="high"
          decoding="async"
          width={1376}
          height={768}
        />
      </div>

      {/* ─── Embossed Japanese Patterns ─── */}
      <div className="seigaiha-gold pointer-events-none absolute inset-0 z-[1] animate-seigaiha opacity-30" aria-hidden="true" />
      <div className="asanoha pointer-events-none absolute inset-0 z-[1] opacity-[0.04]" aria-hidden="true" />

      {/* ─── Japanese Cloud Watermarks — Kasumi-style ─── */}
      <motion.div
        style={{ y: yKanji }}
        className="pointer-events-none absolute inset-0 z-[1] overflow-visible"
        aria-hidden="true"
      >
        {/* Cloud kiri atas — kasumi besar, melayang */}
        <div className="absolute top-0 left-0 w-[65%] max-w-[620px] -translate-x-[8%] -translate-y-[20%]">
          <JapaneseCloud
            variant="kasumi-large"
            color="navy"
            className="blur-[2px]"
          />
        </div>
        {/* Cloud kanan bawah — kasumi medium, aksen */}
        <div className="absolute bottom-0 right-0 w-[50%] max-w-[480px] translate-x-[6%] translate-y-[25%]">
          <JapaneseCloud
            variant="kasumi-medium"
            color="ink"
            className="blur-[1.5px]"
          />
        </div>
      </motion.div>

      {/* ─── Floating Glass Card 1: AI Card (Top Left) ─── */}
      <motion.div
        className="pointer-events-none absolute top-[12%] left-[4%] lg:left-[8%] z-20 hidden md:block"
        style={{
          x: mousePos.x * -1.2,
          y: mousePos.y * -0.8,
        }}
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: easeOut, delay: 0.5 }}
      >
        <div className="w-64 p-5 rounded-2xl shadow-xl border border-vermillion/10 bg-paper/80 backdrop-blur-sm md:backdrop-blur-md -rotate-2 transition-all hover:rotate-0 hover:scale-[1.02] duration-500">
          <div className="flex items-center justify-between mb-3">
            <span className="text-vermillion font-bold text-[10px] tracking-[0.15em] uppercase">
              Latihan AI
            </span>
            <span className="text-vermillion text-lg font-bold">~</span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-1.5 bg-indigo-tint-soft rounded-full overflow-hidden mb-1.5">
            <motion.div
              className="h-full bg-vermillion rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: "75%" }}
              transition={{ duration: 1.2, delay: 0.8, ease: easeOut }}
            />
          </div>
          <p className="text-[10px] font-semibold text-ink-soft/60">
            Akurasi Pengucapan: 88%
          </p>
          {/* Chat bubble */}
          <div className="mt-3 p-3 bg-white/60 rounded-lg border border-line/20 italic text-[12px] text-ink/80 leading-relaxed">
            &ldquo;Konnichiwa, hajimemashite...&rdquo;
          </div>
        </div>
      </motion.div>

      {/* ─── Floating Glass Card 2: JLPT Badge (Bottom Right) ─── */}
      <motion.div
        className="pointer-events-none absolute bottom-[12%] right-[4%] lg:right-[8%] z-20 hidden md:block"
        style={{
          x: mousePos.x * 1.2,
          y: mousePos.y * 0.8,
        }}
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: easeOut, delay: 0.7 }}
      >
        <div className="w-48 p-6 rounded-2xl shadow-2xl bg-navy/95 backdrop-blur-[2px] md:backdrop-blur-sm rotate-3 border border-white/10 transition-all hover:rotate-0 hover:scale-[1.02] duration-500">
          <div className="text-5xl font-bold text-white mb-1 tracking-tight">N5</div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">
            Siap Ujian
          </p>
          <div className="mt-4 flex gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-vermillion" />
            <span className="w-2.5 h-2.5 rounded-full bg-vermillion/30" />
            <span className="w-2.5 h-2.5 rounded-full bg-vermillion/30" />
          </div>
        </div>
      </motion.div>

      {/* ─── Decorative Image Frame (Left Edge, from items 1-2) ─── */}
      <motion.div
        className="absolute bottom-8 left-6 z-10 hidden lg:block pointer-events-none"
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, ease: easeOut, delay: 0.9 }}
      >
        <div className="w-[280px] h-[360px] rounded-[32px] overflow-hidden border-[10px] border-white shadow-2xl -rotate-[5deg]">
          {/* Decorative gradient placeholder instead of external image */}
          <div className="w-full h-full bg-gradient-to-br from-navy-soft via-navy to-navy flex items-center justify-center">
            <span className="jp-bold text-6xl text-white/20">学</span>
          </div>
        </div>
      </motion.div>

      {/* ─── Main Content ─── */}
      <motion.div
        style={{ y: yHead, opacity: opHead }}
        className="relative z-30 mx-auto w-full max-w-5xl px-6 text-center flex flex-col items-center"
      >
        {/* Status Badge — Japanese greeting */}
        <motion.div
          className="inline-flex items-center gap-3 bg-paper/60 backdrop-blur-[2px] md:backdrop-blur-sm px-5 py-2 rounded-full border border-vermillion/10 mb-10 shadow-sm mt-14 md:mt-0"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easeOut, delay: 0.1 }}
        >
          <span className="inline-flex h-2 w-2 rounded-full bg-jp-red" />
          <span className="jp mr-1 text-xs font-semibold text-vermillion">いらっしゃいませ</span>
          <span className="text-[10px] text-ink-soft/50">|</span>
          <span className="text-xs font-semibold text-ink-soft/70">
            SMK Texar Project
          </span>
        </motion.div>

        {/* Editorial Headline — uses Playfair Display for premium serif feel */}
        <h1 className="font-bold text-4xl md:text-6xl lg:text-7xl leading-[1.1] tracking-tight text-navy mb-8">
          <motion.span
            className="block font-display"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: easeOut, delay: 0.2 }}
          >
            Website Belajar Bahasa Jepang
          </motion.span>
          <motion.span
            className="block font-display font-normal italic text-ink-soft/60 mt-2"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: easeOut, delay: 0.4 }}
          >
            Siswa SMK Texar
          </motion.span>
        </h1>

        {/* Vermillion brushstroke accent — animated width */}
        <motion.div
          className="mb-8"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 60, opacity: 1 }}
          transition={{ duration: 0.6, ease: easeOut, delay: 0.5 }}
        >
          <span
            className="block h-0.5 bg-jp-red mx-auto animate-brushstroke-pulse"
            style={{ width: 60 }}
          />
        </motion.div>

        {/* Subheadline */}
        <motion.p
          className="text-base md:text-lg text-ink-soft/70 max-w-2xl mx-auto mb-12 leading-relaxed font-light"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: easeOut, delay: 0.5 }}
        >
          LinguaFlow is built for the SMK Texar community. Belajar bahasa
          Jepang jadi lebih dekat, lebih seru, dan lebih personal — dari
          flashcard, latihan ucapan, sampai AI Sensei yang siap nemenin
          setiap langkahmu.
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="flex flex-col sm:flex-row gap-5 items-center justify-center w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: easeOut, delay: 0.7 }}
        >
          <Link
            href="/login"
            className="group relative px-10 py-4 bg-jp-red text-white rounded-full font-bold text-sm flex items-center gap-2 transition-all hover:scale-[1.03] hover:shadow-xl hover:shadow-jp-red/20 active:brightness-[0.92] overflow-hidden"
          >
            {/* Animated shimmer overlay */}
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            <span className="relative z-10">Masuk ke Kelas</span>
            <ArrowRight
              size={16}
              className="relative z-10 transition-transform group-hover:translate-x-1"
            />
          </Link>
          <Link
            href="/kontak"
            className="px-10 py-4 border border-line text-navy rounded-full text-sm font-semibold hover:bg-white/60 transition-all flex items-center gap-2 group backdrop-blur-sm"
          >
            Butuh Bantuan?
            <CaretRight
              size={16}
              className="group-hover:translate-y-0.5 transition-transform"
            />
          </Link>
        </motion.div>

        {/* Trust Signal — jumlah murid yang sudah belajar */}
        <motion.div
          className="mt-16 flex flex-col items-center gap-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: easeOut, delay: 0.9 }}
        >
          <p className="text-sm text-ink-soft/60">
            Sudah membantu{" "}
            <span className="font-bold text-navy">{stats.totalMurid} murid {schoolName}</span>{" "}
            belajar bahasa Jepang.
          </p>
        </motion.div>
      </motion.div>

      {/* Scroll cue — fades in after hero loads */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-30"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6, duration: 0.8, ease: easeOut }}
      >
        <span className="text-[9px] font-bold uppercase tracking-[0.35em] text-ink-soft/30">
          Scroll
        </span>
        <div className="text-ink-soft/40 animate-scroll-bounce">
          <ArrowDown size={16} />
        </div>
      </motion.div>
    </section>
  );
}
