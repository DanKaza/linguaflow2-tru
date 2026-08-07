"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Volume2,
  Mic,
  Square,
  RefreshCw,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { StudentShell } from "@/components/layout/StudentShell";
import { Card } from "@/components/ui/Card";
import { KanjiText } from "@/components/ui/KanjiText";
import { Button } from "@/components/ui/Button";
import { AnimatedPage } from "@/components/ui/AnimatedPage";
import { useJapaneseSpeech } from "@/lib/speech";
import { useMediaRecorder } from "@/lib/use-media-recorder";
import { useSpeechRateLimit, FAIL_COOLDOWN_SECONDS } from "@/lib/use-speech-rate-limit";
import { transcribeAudio } from "@/lib/speech-api";
import { scorePronunciation } from "@/lib/scoring";

interface PracticeSentence {
  kanji: string;
  furigana: string;
  romaji: string;
  arti: string;
}

/** Kalimat latihan pendek (level N5). */
const SENTENCES: PracticeSentence[] = [
  { kanji: "私は学生です", furigana: "わたしはがくせいです", romaji: "Watashi wa gakusei desu", arti: "Saya adalah murid" },
  { kanji: "おはようございます", furigana: "おはようございます", romaji: "Ohayou gozaimasu", arti: "Selamat pagi" },
  { kanji: "ありがとうございます", furigana: "ありがとうございます", romaji: "Arigatou gozaimasu", arti: "Terima kasih" },
  { kanji: "日本語が好きです", furigana: "にほんごがすきです", romaji: "Nihongo ga suki desu", arti: "Saya suka bahasa Jepang" },
  { kanji: "また明日会いましょう", furigana: "またあしたあいましょう", romaji: "Mata ashita aimashou", arti: "Sampai jumpa besok" },
];

const WAVE_BARS = [0, 1, 2, 3, 4, 5, 6];

/** Blob di bawah ukuran ini hampir pasti rekaman kosong/hanya noise. */
const MIN_BLOB_SIZE = 1500;

export default function SpeechPractice() {
  const router = useRouter();
  const { isSpeaking, speak } = useJapaneseSpeech();
  const { status: recStatus, blob, seconds, error: recError, start, stop, reset } =
    useMediaRecorder();

  // Kalimat acak dipilih setelah mount (hydration-safe, lihat pola belajar/sesi).
  const [sentence, setSentence] = useState<PracticeSentence | null>(null);
  const [busy, setBusy] = useState(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);
  const transcribingRef = useRef(false);
  const { cooldownLeft, isCoolingDown, requestsLeft, quotaExhausted, startCooldown, registerRequest } =
    useSpeechRateLimit();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe: pilih setelah mount.
    setSentence(SENTENCES[Math.floor(Math.random() * SENTENCES.length)]);
  }, []);

  const shuffleSentence = useCallback(() => {
    setSentence((cur) => {
      if (!cur) return cur;
      const others = SENTENCES.filter((s) => s.kanji !== cur.kanji);
      return others[Math.floor(Math.random() * others.length)];
    });
    reset();
    setTranscribeError(null);
  }, [reset]);

  /* ── Rekaman selesai → transkripsi otomatis → skor → halaman hasil ── */
  useEffect(() => {
    if (recStatus !== "stopped" || !blob || !sentence) return;
    if (transcribingRef.current) return;
    transcribingRef.current = true;
    setBusy(true);
    setTranscribeError(null);

    (async () => {
      let sentRequest = false;
      let ok = false;
      try {
        if (blob.size < MIN_BLOB_SIZE) {
          throw new Error(
            "Rekaman terlalu pendek — ucapkan kalimat dengan lantang, lalu coba lagi.",
          );
        }
        sentRequest = true;
        const result = await transcribeAudio(blob, {
          language: "ja",
          quality: "fast",
          timeoutMs: 45_000,
        });
        const score = scorePronunciation(result.text, sentence.furigana);
        try {
          sessionStorage.setItem(
            "lf-speech-result",
            JSON.stringify({ sentence, transcript: result.text, score }),
          );
        } catch {
          /* sessionStorage penuh/tidak tersedia — hasil tidak bisa disimpan */
        }
        ok = true;
        router.push("/m/speech/hasil");
      } catch (err) {
        setTranscribeError(
          err instanceof Error ? err.message : "Transkripsi gagal. Coba lagi.",
        );
        reset();
      } finally {
        transcribingRef.current = false;
        setBusy(false);
        // Anti-spam: request baru hanya boleh dikirim setelah jeda cooldown.
        // Gagal → penalti lebih lama supaya tidak menekan server beruntun.
        if (sentRequest) {
          registerRequest();
          startCooldown(ok ? undefined : FAIL_COOLDOWN_SECONDS);
        }
      }
    })();
  }, [recStatus, blob, sentence, router, reset, registerRequest, startCooldown]);

  const recording = recStatus === "recording";
  const hasError = recError || transcribeError;

  return (
    <StudentShell noHeader>
      <AnimatedPage>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-2xl font-bold text-ink">Latihan Ucapan</h1>
          <p className="text-sm text-ink-soft">
            Dengar contoh, lalu rekam pelafalanmu sendiri
          </p>
        </motion.div>

        {/* Kalimat target */}
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="mt-4 text-center transition-all hover:shadow-soft-lg" padded>
            <div className="flex items-center justify-between">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo transition-colors hover:text-indigo-tint disabled:opacity-40"
                aria-label="Dengar contoh"
                disabled={!sentence || busy}
                onClick={() =>
                  sentence &&
                  speak(sentence.kanji, { key: "demo", kana: sentence.furigana })
                }
              >
                <Volume2 size={14} className={isSpeaking("demo") ? "animate-pulse" : ""} />
                {isSpeaking("demo") ? "Sedang berbicara…" : "Dengar Contoh"}
              </motion.button>
              <button
                onClick={shuffleSentence}
                disabled={busy || recording}
                className="inline-flex items-center gap-1 text-xs font-semibold text-ink-soft transition-colors hover:text-indigo disabled:opacity-40"
                aria-label="Ganti kalimat"
              >
                <RefreshCw size={13} /> Ganti
              </button>
            </div>

            {sentence ? (
              <KanjiText
                kanji={sentence.kanji}
                furigana={sentence.furigana}
                romaji={sentence.romaji}
                size="lg"
              />
            ) : (
              <div className="flex h-28 items-center justify-center text-sm text-ink-soft">
                Menyiapkan kalimat…
              </div>
            )}
            <p className="mt-3 text-sm text-ink-soft">{sentence?.arti}</p>
          </Card>
        </motion.div>

        {/* Perekam suara */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="relative mt-6 flex flex-col items-center overflow-hidden rounded-card border border-line bg-paper px-6 py-10 text-center"
        >
          <span className="lf-kanji-watermark pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 text-[140px]">話</span>
          <div className="seigaiha absolute inset-0 opacity-[0.05]" />

          <div className="relative flex w-full max-w-md flex-col items-center">
            {busy ? (
              /* ── Sedang transkripsi ── */
              <div className="flex flex-col items-center py-8">
                <Loader2 size={40} className="animate-spin text-indigo" />
                <p className="mt-4 text-sm font-semibold text-ink">
                  Mendengarkan ucapanmu…
                </p>
                <p className="mt-1 text-xs text-ink-soft">
                  Mengirim audio ke server speech (bisa butuh beberapa detik)
                </p>
              </div>
            ) : recording ? (
              /* ── Sedang merekam ── */
              <>
                <div className="flex h-20 items-end justify-center gap-1.5" aria-hidden="true">
                  {WAVE_BARS.map((i) => (
                    <div key={i} className="lf-waveform-bar h-12 w-1.5 rounded-full bg-vermillion" />
                  ))}
                </div>
                <p className="mt-3 text-3xl font-bold tabular-nums text-ink">
                  {seconds}
                  <span className="ml-1 text-sm font-semibold text-ink-soft">detik</span>
                </p>
                <p className="mt-1 text-xs text-ink-soft">
                  Baca kalimat di atas dengan lantang, lalu selesaikan.
                </p>
                <Button variant="primary" size="lg" className="mt-5" onClick={stop}>
                  <Square size={18} fill="currentColor" /> Selesaikan Rekaman
                </Button>
              </>
            ) : isCoolingDown ? (
              /* ── Jeda cooldown antar request ── */
              <>
                <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-indigo-tint-soft">
                  <Mic size={34} className="text-indigo/40" />
                </span>
                <p className="mt-4 text-base font-bold text-ink">
                  Tunggu {cooldownLeft} detik…
                </p>
                <p className="mx-auto mt-1 max-w-[16rem] text-xs text-ink-soft">
                  Satu rekaman diproses dalam satu waktu. Sebentar lagi bisa merekam lagi.
                </p>
                <Button variant="primary" size="lg" className="mt-5" disabled>
                  <Mic size={18} /> Mulai Rekam
                </Button>
              </>
            ) : quotaExhausted ? (
              /* ── Kuota sesi habis ── */
              <>
                <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-indigo-tint-soft">
                  <Mic size={34} className="text-indigo/40" />
                </span>
                <p className="mt-4 text-base font-bold text-ink">Batas latihan sesi ini tercapai</p>
                <p className="mx-auto mt-1 max-w-[16rem] text-xs text-ink-soft">
                  Buka tab baru untuk melanjutkan latihan pelafalan.
                </p>
                <Button variant="primary" size="lg" className="mt-5" disabled>
                  <Mic size={18} /> Mulai Rekam
                </Button>
              </>
            ) : (
              /* ── Siap merekam ── */
              <>
                <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-indigo-tint-soft">
                  <Mic size={34} className="text-indigo" />
                </span>
                <p className="mt-4 text-base font-bold text-ink">Rekam pelafalanmu</p>
                <p className="mx-auto mt-1 max-w-[16rem] text-xs text-ink-soft">
                  Ketuk tombol, bacakan kalimat di atas, lalu lihat skor pelafalanmu.
                  {requestsLeft <= 5 && ` Sisa ${requestsLeft} latihan sesi ini.`}
                </p>
                <Button variant="primary" size="lg" className="mt-5" onClick={() => start()}>
                  <Mic size={18} /> Mulai Rekam
                </Button>
              </>
            )}

            {/* Pesan error */}
            {hasError && !busy && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5 flex w-full items-start gap-2 rounded-btn border border-error/30 bg-error/5 px-4 py-3 text-left"
                role="alert"
              >
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-error" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-error">{recError ?? "Transkripsi gagal"}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">{transcribeError ?? recError}</p>
                </div>
                <button
                  onClick={() => {
                    reset();
                    setTranscribeError(null);
                  }}
                  className="shrink-0 text-xs font-semibold text-indigo hover:underline"
                >
                  Tutup
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </AnimatedPage>
    </StudentShell>
  );
}
