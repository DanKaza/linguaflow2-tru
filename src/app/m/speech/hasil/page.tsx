"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { RotateCcw, Mic, Volume2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { StudentShell } from "@/components/layout/StudentShell";
import { Button } from "@/components/ui/Button";
import { KanjiText } from "@/components/ui/KanjiText";
import { AnimatedPage } from "@/components/ui/AnimatedPage";
import { useJapaneseSpeech } from "@/lib/speech";
import { normalizeSpeechWithMap, scoreLabel, type NormalizedSpeech } from "@/lib/scoring";

interface ScorePayload {
  score: number;
  target: string;
  transcript: string;
  exact: boolean;
}

interface SpeechResult {
  sentence: {
    kanji: string;
    furigana: string;
    romaji: string;
    arti: string;
  };
  transcript: string;
  score: ScorePayload;
}

/** Posisi segmen yang berbeda antara dua string ternormalisasi. */
function diffRange(target: string, transcript: string) {
  let p = 0;
  const min = Math.min(target.length, transcript.length);
  while (p < min && target[p] === transcript[p]) p++;
  let s = 0;
  while (
    s < min - p &&
    target[target.length - 1 - s] === transcript[transcript.length - 1 - s]
  ) {
    s++;
  }
  return {
    targetStart: p,
    targetEnd: target.length - s,
    transcriptStart: p,
    transcriptEnd: transcript.length - s,
  };
}

function ringColor(score: number): string {
  if (score >= 85) return "var(--color-success)";
  if (score >= 70) return "var(--color-gold)";
  return "var(--color-vermillion)";
}

function Highlighted({
  text,
  start,
  end,
  tone,
}: {
  text: string;
  start: number;
  end: number;
  tone: "error" | "gold";
}) {
  return (
    <>
      <span className="text-success">{text.slice(0, start)}</span>
      <span
        className={
          tone === "error"
            ? "rounded bg-error/15 font-semibold text-error"
            : "rounded bg-gold/20 font-semibold text-gold"
        }
      >
        {text.slice(start, end)}
      </span>
      <span className="text-success">{text.slice(end)}</span>
    </>
  );
}

export default function SpeechResult() {
  const router = useRouter();
  const { speak } = useJapaneseSpeech();

  const [result, setResult] = useState<SpeechResult | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let parsed: SpeechResult | null = null;
    try {
      const raw = sessionStorage.getItem("lf-speech-result");
      parsed = raw ? (JSON.parse(raw) as SpeechResult) : null;
    } catch {
      parsed = null;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Pola hydration-safe: sessionStorage hanya ada di client.
    setResult(parsed);
    setLoaded(true);
  }, []);

  // Belum ada hasil — tampilkan state kosong seperti sebelumnya.
  if (loaded && !result) {
    return (
      <StudentShell noHeader>
        <AnimatedPage>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative mt-10 flex flex-col items-center overflow-hidden rounded-card border border-line bg-paper py-14 text-center"
          >
            <span className="lf-kanji-watermark pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 text-[140px]">評</span>
            <div className="seigaiha absolute inset-0 opacity-[0.05]" />
            <div className="relative">
              <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-tint-soft">
                <Mic size={30} className="text-indigo/40" />
              </span>
              <p className="text-base font-bold text-ink">Belum ada hasil evaluasi</p>
              <p className="mx-auto mt-1 max-w-[16rem] text-xs text-ink-soft">
                Rekam ucapanmu di Latihan Ucapan untuk melihat skor pelafalan.
              </p>
              <div className="mt-6 flex justify-center">
                <Button variant="outline" onClick={() => router.push("/m/speech")}>
                  <RotateCcw size={18} /> Mulai Latihan Ucapan
                </Button>
              </div>
            </div>
          </motion.div>
        </AnimatedPage>
      </StudentShell>
    );
  }

  // Belum selesai baca sessionStorage — hindari flash halaman kosong.
  if (!loaded || !result) {
    return (
      <StudentShell noHeader>
        <div className="flex items-center justify-center py-20 text-sm text-ink-soft">
          Memuat hasil…
        </div>
      </StudentShell>
    );
  }

  const { sentence, transcript, score } = result;
  // Highlight dihitung pada teks ternormalisasi, tapi DITAMPILKAN pada teks
  // asli — supaya murid tidak melihat は berubah jadi わ di tampilan.
  const rawTarget = sentence.furigana;
  const rawTranscript = transcript;
  const tNorm = normalizeSpeechWithMap(rawTarget);
  const trNorm = normalizeSpeechWithMap(rawTranscript);
  const exact = tNorm.normalized === trNorm.normalized;
  const diff = diffRange(tNorm.normalized, trNorm.normalized);
  const color = ringColor(score.score);

  /** Terjemahkan rentang indeks ternormalisasi → rentang di teks asli. */
  function toRawRange(
    norm: NormalizedSpeech,
    rawLen: number,
    start: number,
    end: number,
  ) {
    return {
      start: start < norm.map.length ? norm.map[start] : rawLen,
      end:
        end === norm.normalized.length
          ? rawLen
          : end > 0
            ? norm.map[end - 1] + 1
            : 0,
    };
  }
  const targetRange = toRawRange(
    tNorm,
    rawTarget.length,
    diff.targetStart,
    diff.targetEnd,
  );
  const transcriptRange = toRawRange(
    trNorm,
    rawTranscript.length,
    diff.transcriptStart,
    diff.transcriptEnd,
  );

  return (
    <StudentShell noHeader>
      <AnimatedPage>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-2xl font-bold text-ink">Hasil Evaluasi</h1>
          <p className="text-sm text-ink-soft">Skor pelafalan ucapanmu</p>
        </motion.div>

        {/* Ring skor */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.1, type: "spring", bounce: 0.35 }}
          className="mt-6 flex flex-col items-center"
        >
          <div
            className="relative h-40 w-40 rounded-full"
            style={{
              background: `conic-gradient(${color} ${score.score * 3.6}deg, var(--color-line) 0deg)`,
            }}
          >
            <div className="absolute inset-[6px] flex flex-col items-center justify-center rounded-full bg-paper shadow-soft">
              <span className="text-5xl font-bold text-ink tabular-nums">{score.score}</span>
              <span className="text-xs text-ink-soft">/ 100</span>
            </div>
          </div>
          <p className="mt-4 text-base font-bold text-ink">{scoreLabel(score.score)}</p>
          {exact && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-success">
              <CheckCircle2 size={14} /> Pelafalan sempurna!
            </p>
          )}
        </motion.div>

        {/* Kalimat target */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="mt-6 flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">Kalimat target</h2>
            <button
              onClick={() => speak(sentence.kanji, { key: "result", kana: sentence.furigana })}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo transition-colors hover:text-indigo-tint"
            >
              <Volume2 size={14} /> Dengar
            </button>
          </div>
          <div className="mt-2 rounded-card border border-line bg-paper p-5 text-center">
            <KanjiText
              kanji={sentence.kanji}
              furigana={sentence.furigana}
              romaji={sentence.romaji}
              size="md"
            />
            <p className="mt-2 text-xs text-ink-soft">{sentence.arti}</p>
          </div>
        </motion.div>

        {/* Ucapanmu */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <h2 className="mt-5 text-sm font-bold text-ink">Yang terdeteksi</h2>
          <div className="mt-2 rounded-card border border-line bg-paper p-5">
            <p lang="ja" className="jp text-center text-xl text-ink">
              {transcript}
            </p>

            {!exact && (
              <div className="mt-4 space-y-2 border-t border-line pt-4 text-center text-sm leading-relaxed">
                <div>
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                    Target (kana)
                  </span>
                  <span lang="ja" className="jp">
                    <Highlighted
                      text={rawTarget}
                      start={targetRange.start}
                      end={targetRange.end}
                      tone="error"
                    />
                  </span>
                </div>
                <div>
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                    Ucapanmu
                  </span>
                  <span lang="ja" className="jp">
                    <Highlighted
                      text={rawTranscript}
                      start={transcriptRange.start}
                      end={transcriptRange.end}
                      tone="gold"
                    />
                  </span>
                </div>
                <p className="pt-1 text-[11px] text-ink-soft">
                  <span className="font-semibold text-error">Merah</span> = bagian yang berbeda dari target ·{" "}
                  <span className="font-semibold text-gold">kuning</span> = yang terdeteksi di sana
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Aksi */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <Button variant="outline" size="lg" onClick={() => router.push("/m/speech")}>
            <RotateCcw size={18} /> Rekam Ulang
          </Button>
          <Button size="lg" onClick={() => router.push("/m/dashboard")}>
            <ArrowLeft size={18} /> Selesai
          </Button>
        </motion.div>
      </AnimatedPage>
    </StudentShell>
  );
}
