"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Check,
  X,
  TrendingUp,
  BookOpen,
  RefreshCw,
  Share2,
  Sparkles,
  PartyPopper,
  Trophy,
  Zap,
  Target,
  ClipboardList,
} from "lucide-react";
import { StudentShell } from "@/components/layout/StudentShell";
import { Button } from "@/components/ui/Button";
import { RingProgress } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { AnimatedPage, staggerContainer, staggerItem } from "@/components/ui/AnimatedPage";

interface KuisSession {
  items: { no: number; q: string; kanji: string; furigana: string; user: string; correct: string; ok: boolean; exp: string }[];
  score: number;
  correctCount: number;
  total: number;
  totalXP: number;
}

function readSession(): KuisSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem("lf-quiz-session");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as KuisSession;
    if (!Array.isArray(parsed.items) || parsed.items.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export default function KuisReview() {
  const router = useRouter();
  const [session, setSession] = useState<KuisSession | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  // Baca sesi kuis di client setelah mount (sessionStorage tidak tersedia
  // saat render server → hindari hydration mismatch).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Pola hydration-safe: baca sessionStorage setelah mount.
    setSession(readSession());
  }, []);

  if (!session) {
    return (
      <StudentShell noHeader>
        <AnimatedPage>
          <motion.div variants={staggerContainer} initial="initial" animate="animate">
            <motion.div variants={staggerItem} className="mt-16 flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-tint-soft">
                <ClipboardList size={32} className="text-indigo/40" />
              </div>
              <p className="text-sm font-bold text-ink">Belum ada hasil kuis</p>
              <p className="mt-1 max-w-[16rem] text-xs text-ink-soft">
                Selesaikan dulu satu sesi kuis untuk melihat hasilnya di sini.
              </p>
              <div className="mt-5 w-48">
                <Button fullWidth onClick={() => router.push("/m/kuis/soal")}>
                  Mulai Kuis
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatedPage>
      </StudentShell>
    );
  }

  const review = session.items;
  const { correctCount, total, score, totalXP } = session;

  const scoreLabel = score >= 80 ? "Lulus!" : score >= 60 ? "Hampir Lulus!" : "Ayo belajar lagi!";
  const scoreColor = score >= 80 ? "success" : score >= 60 ? "gold" : "error";
  const ScoreIcon = score >= 80 ? Trophy : score >= 60 ? TrendingUp : BookOpen;

  return (
    <StudentShell noHeader>
      <AnimatedPage>
        <motion.div variants={staggerContainer} initial="initial" animate="animate">
          {/* ════════════════════════════════════════ */}
          {/* SCORE HERO — dramatic reveal */}
          {/* ════════════════════════════════════════ */}
          <motion.div variants={staggerItem} className="flex flex-col items-center pt-4 text-center">
            {/* Score ring with glow */}
            <div className="relative">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              >
                <RingProgress value={score} size={130} color={scoreColor}>
                  <span className="text-3xl font-bold text-indigo">{score}</span>
                  <span className="text-[10px] text-ink-soft">/ 100</span>
                </RingProgress>
              </motion.div>

              {/* Decorative sparkle dots */}
              {score >= 80 && (
                <>
                  <motion.span
                    className="absolute -right-2 -top-1 text-gold"
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                  >
                    <Sparkles size={20} fill="currentColor" />
                  </motion.span>
                  <motion.span
                    className="absolute -left-1 -bottom-2 text-success"
                    initial={{ scale: 0, rotate: 30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                  >
                    <PartyPopper size={18} />
                  </motion.span>
                </>
              )}
              {score >= 60 && score < 80 && (
                <motion.span
                  className="absolute -right-1 -top-1 text-gold"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: "spring" }}
                >
                  <Target size={18} />
                </motion.span>
              )}
            </div>

            {/* Score label */}
            <motion.div
              className="mt-3 flex items-center justify-center gap-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold ${
                  scoreColor === "success"
                    ? "bg-success/10 text-success"
                    : scoreColor === "gold"
                      ? "bg-gold/10 text-gold"
                      : "bg-error/10 text-error"
                }`}
              >
                <ScoreIcon size={18} />
                {scoreLabel}
              </span>
            </motion.div>

            <motion.p
              className="mt-2 text-xs text-ink-soft"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
            >
              {correctCount} dari {total} soal dijawab benar
            </motion.p>
          </motion.div>

          {/* ════════════════════════════════════════ */}
          {/* STATS — premium cards (angka asli) */}
          {/* ════════════════════════════════════════ */}
          <motion.div variants={staggerItem} className="mt-5 grid grid-cols-3 gap-2.5">
            {[
              { v: `${correctCount}/${total}`, l: "Benar", icon: Check, c: "text-success", bg: "bg-success/10" },
              { v: `+${totalXP}`, l: "Total XP", icon: Zap, c: "text-gold", bg: "bg-gold/10" },
              { v: `${total - correctCount}`, l: "Salah", icon: X, c: "text-error", bg: "bg-error/10" },
            ].map((s, i) => (
              <motion.div
                key={s.l}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
                className="rounded-card bg-paper border border-line p-3.5 text-center shadow-soft transition-all hover:shadow-soft-lg"
              >
                <div className={`mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg ${s.bg}`}>
                  <s.icon size={16} className={s.c} />
                </div>
                <p className="text-base font-bold text-indigo">{s.v}</p>
                <p className="text-[10px] text-ink-soft">{s.l}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* ════════════════════════════════════════ */}
          {/* REVIEW ACCORDION — polished */}
          {/* ════════════════════════════════════════ */}
          <motion.div variants={staggerItem} className="mt-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-ink">Review Jawaban</h2>
              <Badge tone="neutral" className="text-[10px]">
                {correctCount} benar · {total - correctCount} salah
              </Badge>
            </div>

            <div className="space-y-2">
              {review.map((r, i) => {
                const isOpen = open === r.no;
                return (
                  <motion.div
                    key={r.no}
                    variants={staggerItem}
                    custom={i}
                    className={`overflow-hidden rounded-card border transition-all duration-200 ${
                      isOpen
                        ? r.ok
                          ? "border-success/30 shadow-soft"
                          : "border-error/30 shadow-soft"
                        : "border-line hover:shadow-soft"
                    }`}
                  >
                    <button
                      onClick={() => setOpen(isOpen ? null : r.no)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                        isOpen
                          ? r.ok
                            ? "bg-success/[0.02]"
                            : "bg-error/[0.02]"
                          : "bg-paper hover:bg-indigo-tint-soft/30"
                      }`}
                    >
                      {/* Status indicator */}
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          r.ok
                            ? "bg-success/10 text-success"
                            : "bg-error/10 text-error"
                        }`}
                      >
                        {r.ok ? <Check size={14} /> : <X size={14} />}
                      </span>

                      <span className="flex-1 text-sm font-semibold text-ink">
                        <span className="text-ink-soft mr-1">{r.no}.</span>
                        <span className="jp">{r.kanji}</span> {r.q.replace(`${r.kanji}`, "").trim()}
                      </span>

                      <ChevronDown
                        size={16}
                        className={`shrink-0 text-ink-soft transition-transform duration-300 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          key="content"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-line bg-gradient-to-b from-indigo-tint-soft/20 to-transparent px-4 py-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="rounded-btn bg-paper/80 px-3 py-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft/60">
                                  Jawabanmu
                                </p>
                                <p className={`mt-0.5 text-sm font-bold ${
                                  r.ok ? "text-success" : "text-error"
                                }`}>
                                  {r.user}
                                </p>
                              </div>
                              <div className="rounded-btn bg-paper/80 px-3 py-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft/60">
                                  Jawaban Benar
                                </p>
                                <p className="mt-0.5 text-sm font-bold text-success">{r.correct}</p>
                              </div>
                            </div>
                            <div className="mt-2 rounded-btn bg-indigo-tint-soft/30 px-3 py-2">
                              <p className="text-xs text-ink leading-relaxed">{r.exp}</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* ════════════════════════════════════════ */}
          {/* ACTION BUTTONS — premium */}
          {/* ════════════════════════════════════════ */}
          <motion.div variants={staggerItem} className="mt-6 space-y-2.5">
            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}>
              <Button
                fullWidth
                size="lg"
                onClick={() => router.push("/m/kuis/soal")}
              >
                <RefreshCw size={16} /> Coba Lagi
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}>
              <Button
                fullWidth
                variant="outline"
                size="lg"
                onClick={() => router.push("/m/dashboard")}
              >
                Kembali ke Dashboard
              </Button>
            </motion.div>
            <div className="flex items-center justify-center pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: "Hasil Kuis LinguaFlow", text: `Aku dapat skor ${score} di kuis bahasa Jepang!` });
                  }
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft transition-colors hover:text-indigo"
              >
                <Share2 size={14} /> Bagikan Hasil
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatedPage>
    </StudentShell>
  );
}
