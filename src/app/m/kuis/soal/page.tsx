"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, AlertTriangle, ChevronRight, Check, X, Zap, Sparkles } from "lucide-react";
import { StudentShell } from "@/components/layout/StudentShell";
import { Button } from "@/components/ui/Button";
import { KanjiText } from "@/components/ui/KanjiText";
import { AnimatedPage } from "@/components/ui/AnimatedPage";
import { vocabulary } from "@/data/vocabulary";

interface Soal {
  id: number;
  kanji: string;
  furigana: string;
  question: string;
  options: { id: string; text: string }[];
  correct: string;
}

export interface KuisSessionItem {
  no: number;
  q: string;
  kanji: string;
  furigana: string;
  user: string;
  correct: string;
  ok: boolean;
  exp: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Generate 10 soal pilihan ganda dari word bank N5 (arti kata). */
function buildQuiz(): Soal[] {
  const n5 = vocabulary.filter((w) => w.level === "N5" && w.arti.trim().length > 0);
  const picked = shuffle(n5).slice(0, 10);
  return picked.map((w, i) => {
    // Distractor: arti berbeda dari kata-kata N5 lain.
    const distractors = shuffle(
      n5.filter(
        (x) =>
          x.kanji !== w.kanji &&
          x.arti.toLowerCase() !== w.arti.toLowerCase(),
      ),
    )
      .map((x) => x.arti)
      .filter((a, idx, self) => self.indexOf(a) === idx)
      .slice(0, 3);
    // Pastikan selalu 3 distractor unik.
    for (const candidate of n5) {
      if (distractors.length >= 3) break;
      const a = candidate.arti;
      if (a !== w.arti && !distractors.includes(a)) distractors.push(a);
    }
    // Acak posisi opsi DULU, baru tetapkan id berdasarkan posisi,
    // agar jawaban benar tidak selalu di posisi A.
    const shuffled = shuffle([w.arti, ...distractors]);
    const options = shuffled.map((text, idx) => ({
      id: (["A", "B", "C", "D"] as const)[idx],
      text,
    }));
    return {
      id: i + 1,
      kanji: w.kanji,
      furigana: w.furigana,
      question: "Apa arti kata di atas?",
      options,
      correct: options.find((o) => o.text === w.arti)?.id ?? "A",
    };
  });
}

const TIMER_DURATION = 45;

export default function KuisSoal() {
  const router = useRouter();
  const [soalList, setSoalList] = useState<Soal[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [time, setTime] = useState(TIMER_DURATION);
  const [timeoutTriggered, setTimeoutTriggered] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const answersRef = useRef<Record<number, string>>({});

  // Generate soal di client setelah mount (menghindari hydration mismatch
  // karena Math.random tidak boleh jalan saat render server).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Pola hydration-safe: generate setelah mount.
    setSoalList(buildQuiz());
  }, []);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const currentSoal = soalList[currentIndex];
  const answered = picked !== null || timeoutTriggered;
  const total = soalList.length;
  const progress = total > 0 ? ((currentIndex + 1) / total) * 100 : 0;
  const isLast = currentIndex === total - 1;

  // Countdown timer
  useEffect(() => {
    if (answered) return;
    const interval = setInterval(() => {
      setTime((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimeoutTriggered(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [answered, currentIndex]);

  // Keyboard shortcuts: 1-4 for options
  useEffect(() => {
    if (answered) return;
    function handleKey(e: KeyboardEvent) {
      const keyMap: Record<string, string> = { "1": "A", "2": "B", "3": "C", "4": "D" };
      const optionId = keyMap[e.key];
      if (currentSoal && optionId && currentSoal.options.find((o) => o.id === optionId)) {
        setPicked(optionId);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [answered, currentSoal]);

  const handleNext = useCallback(() => {
    if (!currentSoal) return;
    const finalAnswer = picked ?? "";
    const withCurrent = { ...answersRef.current, [currentSoal.id]: finalAnswer };
    setAnswers(withCurrent);

    if (!isLast) {
      setCurrentIndex((i) => i + 1);
      setPicked(null);
      setTime(TIMER_DURATION);
      setTimeoutTriggered(false);
      return;
    }

    // Selesai — susun hasil asli berdasarkan jawaban, simpan untuk halaman review.
    const items: KuisSessionItem[] = soalList.map((s) => {
      const user = withCurrent[s.id] ?? "";
      const correctText = s.options.find((o) => o.id === s.correct)?.text ?? "";
      const userText = s.options.find((o) => o.id === user)?.text ?? "Tidak dijawab";
      return {
        no: s.id,
        q: "Apa arti kata di atas?",
        kanji: s.kanji,
        furigana: s.furigana,
        user: userText,
        correct: correctText,
        ok: user === s.correct,
        exp: `${s.kanji} (${s.furigana}) berarti "${correctText}".`,
      };
    });
    const score = Math.round((items.filter((it) => it.ok).length / items.length) * 100);
    const baseXP = items.filter((it) => it.ok).length * 10;
    const bonusXP = score >= 80 ? 20 : score >= 60 ? 10 : 0;
    try {
      sessionStorage.setItem(
        "lf-quiz-session",
        JSON.stringify({ items, score, correctCount: items.filter((it) => it.ok).length, total: items.length, totalXP: baseXP + bonusXP }),
      );
    } catch {
      /* sessionStorage unavailable */
    }
    router.push("/m/kuis/review");
  }, [picked, currentSoal, isLast, soalList, router]);

  const timerPct = (time / TIMER_DURATION) * 100;
  const urgent = time <= 10;

  if (soalList.length === 0) {
    return (
      <StudentShell title="Soal">
        <AnimatedPage>
          <div className="flex items-center justify-center py-20 text-sm text-ink-soft">
            Menyiapkan soal&hellip;
          </div>
        </AnimatedPage>
      </StudentShell>
    );
  }

  return (
    <StudentShell title="Soal">
      <AnimatedPage>
        {/* ════════════════════════════════════════ */}
        {/* PREMIUM PROGRESS + TIMER */}
        {/* ════════════════════════════════════════ */}
        <div className="flex items-center gap-3">
          {/* Progress track with segment indicators */}
          <div className="relative flex-1">
            <div className="h-2 rounded-full bg-indigo-tint-soft overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-vermillion to-vermillion-soft"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            {/* Dots for each question */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-0.5">
              {Array.from({ length: total }).map((_, i) => (
                <span
                  key={i}
                  className={`block h-1.5 w-1.5 rounded-full transition-colors duration-300 ${
                    i < currentIndex ? "bg-vermillion" : i === currentIndex ? "bg-vermillion/50" : "bg-indigo-tint-soft"
                  }`}
                />
              ))}
            </div>
          </div>

          <motion.span
            key={currentIndex}
            className="text-xs font-bold text-ink-soft min-w-[36px] text-right"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {currentIndex + 1}/{total}
          </motion.span>

          {/* Premium timer badge */}
          <motion.div
            className={`relative flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all duration-500 ${
              urgent
                ? "bg-error/10 ring-2 ring-error/20"
                : "bg-indigo-tint-soft"
            }`}
            animate={urgent ? { scale: [1, 1.04, 1] } : {}}
            transition={urgent ? { duration: 0.8, repeat: Infinity } : {}}
          >
            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" className="text-indigo-tint-soft" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15"
                fill="none"
                stroke={urgent ? "var(--color-error)" : "var(--color-vermillion)"}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={94.2}
                strokeDashoffset={94.2 - (timerPct / 100) * 94.2}
                style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.3s ease" }}
              />
            </svg>
            <span className={`relative z-10 flex items-center gap-1 text-xs font-bold ${
              urgent ? "text-error" : "text-vermillion"
            }`}>
              {urgent ? <AlertTriangle size={12} className="animate-pulse" /> : <Clock size={12} />}
              {String(time).padStart(2, "0")}s
            </span>
          </motion.div>
        </div>

        {/* ════════════════════════════════════════ */}
        {/* QUESTION CARD */}
        {/* ════════════════════════════════════════ */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSoal.id}
            initial={{ opacity: 0, x: 40, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -40, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Question display */}
            <div className="mt-6 rounded-card border border-line bg-paper p-6 text-center shadow-soft">
              {/* Question number badge */}
              <div className="mx-auto mb-4 inline-flex items-center gap-1.5 rounded-full bg-indigo-tint-soft px-3 py-1">
                <Zap size={12} className="text-indigo" />
                <span className="text-[11px] font-semibold text-indigo">Soal {currentIndex + 1}</span>
              </div>

              <KanjiText kanji={currentSoal.kanji} furigana={currentSoal.furigana} size="lg" />

              <div className="mx-auto mt-5 h-px w-12 bg-line" />

              <p className="mt-4 text-base font-bold text-ink">{currentSoal.question}</p>
            </div>

            {/* ════════════════════════════════════════ */}
            {/* PREMIUM OPTIONS */}
            {/* ════════════════════════════════════════ */}
            <div className="mt-4 space-y-2.5">
              {currentSoal.options.map((o, i) => {
                const isCorrect = o.id === currentSoal.correct;
                const isPicked = picked === o.id;
                const optionLabel = ["A", "B", "C", "D"][i];

                let containerCls = "border-line bg-paper";
                let labelCls = "border-line text-ink-soft";
                let textCls = "text-ink";

                if (answered) {
                  if (isCorrect) {
                    containerCls = "border-success bg-success/5 ring-2 ring-success/20";
                    labelCls = "border-success/30 bg-success text-white";
                    textCls = "text-success";
                  } else if (isPicked) {
                    containerCls = "border-error bg-error/5 ring-2 ring-error/20";
                    labelCls = "border-error/30 bg-error text-white";
                    textCls = "text-error";
                  } else {
                    containerCls = "border-line bg-paper opacity-40";
                    labelCls = "border-line text-ink-soft";
                    textCls = "text-ink-soft";
                  }
                }

                return (
                  <motion.button
                    key={o.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.08 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                    disabled={answered}
                    onClick={() => setPicked(o.id)}
                    className={`group flex w-full items-center gap-3 rounded-card border-2 px-4 py-3.5 text-left text-[15px] font-semibold transition-all duration-200 ${containerCls} ${
                      !answered
                        ? "hover:border-indigo hover:bg-indigo-tint-soft cursor-pointer active:scale-[0.98]"
                        : "cursor-default"
                    }`}
                  >
                    {/* Letter badge */}
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 text-sm font-bold transition-all duration-200 ${labelCls} ${
                        !answered
                          ? "group-hover:border-indigo group-hover:bg-indigo group-hover:text-white"
                          : ""
                      }`}
                    >
                      {answered && isCorrect ? (
                        <Check size={16} />
                      ) : answered && isPicked ? (
                        <X size={16} />
                      ) : (
                        optionLabel
                      )}
                    </span>
                    <span className={`transition-colors duration-200 ${textCls}`}>{o.text}</span>

                    {/* Right indicator */}
                    {!answered && (
                      <ChevronRight size={16} className="ml-auto shrink-0 text-ink-soft/30 transition-all group-hover:text-indigo group-hover:translate-x-0.5" />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* ════════════════════════════════════════ */}
            {/* TIMEOUT MESSAGE */}
            {/* ════════════════════════════════════════ */}
            <AnimatePresence>
              {timeoutTriggered && !picked && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-3 rounded-btn bg-error/5 border border-error/20 px-4 py-3 text-center"
                >
                  <p className="text-sm font-bold text-error">Waktu habis!</p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    Jawaban benar:{" "}
                    <span className="font-semibold text-success">
                      {currentSoal.correct}.{" "}
                      {currentSoal.options.find((o) => o.id === currentSoal.correct)?.text}
                    </span>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>

        {/* ════════════════════════════════════════ */}
        {/* NEXT / FINISH BUTTON */}
        {/* ════════════════════════════════════════ */}
        <motion.div
          className="mt-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: answered ? 1 : 0.4 }}
          transition={{ duration: 0.3 }}
        >
          <Button
            fullWidth
            size="lg"
            disabled={!answered}
            onClick={handleNext}
            className={answered ? "transition-all active:scale-[0.98] group" : ""}
          >
            {!answered ? (
              <span className="flex items-center gap-2">
                <Clock size={16} /> Jawab dulu soal di atas
              </span>
            ) : isLast ? (
              <span className="flex items-center justify-center gap-2">
                <Sparkles size={18} /> Lihat Hasil
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1">
                Soal Selanjutnya{" "}
                <ChevronRight size={18} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            )}
          </Button>
        </motion.div>

        {/* ════════════════════════════════════════ */}
        {/* KEYBOARD HINT */}
        {/* ════════════════════════════════════════ */}
        <motion.div
          className="mt-4 flex items-center justify-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <span className="text-[11px] text-ink-soft">Tekan</span>
          {["1", "2", "3", "4"].map((k) => (
            <kbd
              key={k}
              className="flex h-6 w-6 items-center justify-center rounded-md border border-line bg-paper text-[11px] font-bold text-indigo shadow-soft transition-all hover:border-indigo/30"
            >
              {k}
            </kbd>
          ))}
          <span className="text-[11px] text-ink-soft">untuk jawab cepat</span>
        </motion.div>
      </AnimatedPage>
    </StudentShell>
  );
}
