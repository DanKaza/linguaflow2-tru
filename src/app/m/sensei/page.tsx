"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Mic,
  Square,
  Volume2,
  Loader2,
  AlertTriangle,
  Languages,
} from "lucide-react";
import { StudentShell } from "@/components/layout/StudentShell";
import { Button } from "@/components/ui/Button";
import { AnimatedPage } from "@/components/ui/AnimatedPage";
import { useMediaRecorder } from "@/lib/use-media-recorder";
import { useSpeechRateLimit, FAIL_COOLDOWN_SECONDS } from "@/lib/use-speech-rate-limit";
import { useLocalStorage } from "@/lib/use-local-storage";
import { askSensei, translateJaToId, type SenseiLevel } from "@/lib/speech-api";
import { romanizeJapanese } from "@/lib/romaji";
import { useJapaneseSpeech, stopJapaneseSpeech } from "@/lib/speech";

interface ChatMessage {
  id: string;
  role: "user" | "sensei";
  text: string;
  audioUrl?: string;
  /** Terjemahan bahasa Indonesia (dimuat async). */
  translation?: string;
  /** Romaji / pelafalan Latin (dimuat async). */
  romaji?: string;
  /** true selama subtitle masih dimuat. */
  translating?: boolean;
}

const LEVELS: { value: SenseiLevel; label: string; hint: string }[] = [
  { value: "pemula", label: "Pemula", hint: "Kata & kalimat sederhana" },
  { value: "menengah", label: "Menengah", hint: "Percakapan sehari-hari" },
  { value: "mahir", label: "Mahir", hint: "Bahasa Jepang alami" },
];

const WAVE_BARS = [0, 1, 2, 3, 4, 5, 6];

/** Blob di bawah ukuran ini hampir pasti rekaman kosong/hanya noise. */
const MIN_BLOB_SIZE = 1500;

const SUBTITLE_KEY = "lf-sensei-subtitle";

let msgSeq = 0;
function newId(): string {
  msgSeq += 1;
  return `${Date.now().toString(36)}-${msgSeq}`;
}

export default function SenseiChat() {
  const { status: recStatus, blob, seconds, error: recError, start, stop, reset } =
    useMediaRecorder();

  const [level, setLevel] = useState<SenseiLevel>("pemula");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "sensei",
      text: "こんにちは！私はAI Senseiです。一緒に日本語を練習しましょう！",
      translation:
        "Halo! Aku adalah AI Sensei. Mari berlatih bahasa Jepang bersama!",
      romaji: "Konnichiwa! Watashi wa AI Sensei desu. Issho ni nihongo o renshū shimashou!",
    },
  ]);
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const { speak } = useJapaneseSpeech();
  // Hydration-safe: render default dulu, baca preferensi tersimpan di effect
  // (membaca storage di lazy initializer menyebabkan hydration mismatch).
  const [showSubtitle, setShowSubtitle] = useLocalStorage<boolean>(SUBTITLE_KEY, true);
  const busyRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { cooldownLeft, isCoolingDown, requestsLeft, quotaExhausted, startCooldown, registerRequest } =
    useSpeechRateLimit();

  /**
   * Muat terjemahan + romaji untuk satu pesan secara async, lalu tempel
   * ke bubble. Gagal → biarkan kosong (degradasi halus, tanpa error).
   */
  const enrichMessage = useCallback(async (id: string, jpText: string) => {
    const [translation, romaji] = await Promise.all([
      translateJaToId(jpText)
        .then((r) => r.text)
        .catch(() => ""),
      romanizeJapanese(jpText).catch(() => ""),
    ]);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, translation, romaji, translating: false } : m,
      ),
    );
  }, []);

  /* ── Putar balasan: audio server, atau fallback suara browser ── */
  const playReply = useCallback((url?: string, fallbackText?: string) => {
    stopJapaneseSpeech();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    if (url) {
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.play().catch(() => {
        /* Autoplay diblokir browser — user bisa tap tombol putar di balasan */
      });
    } else if (fallbackText) {
      // Audio server tidak tersedia → suara browser (Web Speech API, gratis).
      void speak(fallbackText, { key: "reply" });
    }
  }, [speak]);

  /* ── Rekaman selesai → satu request ke endpoint gabungan sensei ── */
  useEffect(() => {
    if (recStatus !== "stopped" || !blob) return;
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setApiError(null);

    (async () => {
      let sentRequest = false;
      let ok = false;
      try {
        if (blob.size < MIN_BLOB_SIZE) {
          throw new Error(
            "Rekaman terlalu pendek — ucapkan sesuatu dengan lantang, lalu coba lagi.",
          );
        }
        sentRequest = true;
        const result = await askSensei(blob, level, 90_000);

        const userMsg: ChatMessage = {
          id: newId(),
          role: "user",
          text: result.userText,
          translating: true,
        };
        const senseiMsg: ChatMessage = {
          id: newId(),
          role: "sensei",
          text: result.senseiText,
          audioUrl: result.audioDataUrl,
          translating: true,
        };
        setMessages((prev) => [...prev, userMsg, senseiMsg]);

        playReply(result.audioDataUrl, result.senseiText);
        ok = true;
        // Subtitle: terjemahan & romaji dimuat async tanpa menahan chat.
        void enrichMessage(userMsg.id, result.userText);
        void enrichMessage(senseiMsg.id, result.senseiText);
      } catch (err) {
        setApiError(
          err instanceof Error
            ? err.message
            : "Sensei gagal merespons. Coba lagi nanti.",
        );
      } finally {
        busyRef.current = false;
        setBusy(false);
        reset();
        // Anti-spam: request baru hanya boleh dikirim setelah jeda cooldown.
        // Gagal → penalti lebih lama (TTS Google sering dibatasi setelah 4-6x).
        if (sentRequest) {
          registerRequest();
          startCooldown(ok ? undefined : FAIL_COOLDOWN_SECONDS);
        }
      }
    })();
  }, [recStatus, blob, level, reset, registerRequest, startCooldown, enrichMessage, playReply]);

  /* ── Auto-scroll chat ke pesan terbaru ── */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  // Hentikan audio balasan (server & Web Speech) saat pindah halaman.
  useEffect(
    () => () => {
      stopJapaneseSpeech();
      audioRef.current?.pause();
    },
    [],
  );

  function toggleSubtitle() {
    setShowSubtitle((s) => !s);
  }

  const recording = recStatus === "recording";
  const hasError = recError || apiError;

  return (
    <StudentShell noHeader>
      <AnimatedPage>
        <div
          className="flex h-[calc(100dvh-5rem)] flex-col overflow-hidden md:mx-auto md:max-w-2xl"
          style={{ paddingBottom: 0 }}
        >
          {/* HEADER */}
          <div className="flex shrink-0 items-center gap-3 border-b border-line/60 bg-warm-white px-4 pb-3 pt-4">
            <motion.span
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo to-indigo-tint text-white shadow-soft"
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles size={18} />
            </motion.span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink">AI Sensei</p>
              <p className="flex items-center gap-1 text-[11px] text-ink-soft">
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${busy ? "bg-gold" : "bg-success"}`}
                />
                {busy ? "Sedang mendengarkan…" : "Online — balas dengan suara"}
              </p>
            </div>
            <button
              onClick={toggleSubtitle}
              aria-pressed={showSubtitle}
              title={showSubtitle ? "Sembunyikan subtitle" : "Tampilkan subtitle"}
              className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold transition-all active:scale-95 ${
                showSubtitle
                  ? "border-indigo/20 bg-indigo-tint-soft text-indigo"
                  : "border-line bg-paper text-ink-soft"
              }`}
            >
              <Languages size={12} />
              Subtitle
            </button>
            <span className="rounded-full border border-line bg-paper px-2.5 py-1 text-[10px] font-bold text-ink-soft">
              {LEVELS.find((l) => l.value === level)?.label}
            </span>
          </div>

          {/* CHAT */}
          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto bg-warm-white px-4 py-4 thin-scroll"
            aria-live="polite"
          >
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                onPlay={(m) => playReply(m.audioUrl, m.text)}
                showSubtitle={showSubtitle}
              />
            ))}

            {/* Typing indicator */}
            {busy && (
              <div className="flex justify-start">
                <span className="mr-2 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo to-indigo-tint text-white">
                  <Sparkles size={14} />
                </span>
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-line bg-paper px-4 py-3 shadow-soft">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-ink-soft"
                      animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* COMPOSER */}
          <div className="shrink-0 border-t border-line/60 bg-warm-white px-4 pb-4 pt-3">
            {/* Level selector */}
            <div className="mx-auto mb-3 grid w-full max-w-sm grid-cols-3 gap-1 rounded-full border border-line bg-paper p-1">
              {LEVELS.map((l) => (
                <button
                  key={l.value}
                  onClick={() => setLevel(l.value)}
                  disabled={busy || recording}
                  title={l.hint}
                  className={`rounded-full px-2 py-1.5 text-xs font-bold transition-all disabled:opacity-50 ${
                    level === l.value
                      ? "bg-indigo text-white shadow-soft"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            {/* Record control */}
            <div className="mx-auto flex w-full max-w-sm flex-col items-center">
              {busy ? (
                <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <Loader2 size={18} className="animate-spin text-indigo" />
                  Sensei sedang memikirkan jawaban…
                </div>
              ) : recording ? (
                <>
                  <div className="flex h-12 items-end justify-center gap-1.5" aria-hidden="true">
                    {WAVE_BARS.map((i) => (
                      <div
                        key={i}
                        className="lf-waveform-bar h-8 w-1.5 rounded-full bg-vermillion"
                      />
                    ))}
                  </div>
                  <p className="mt-2 text-xl font-bold tabular-nums text-ink">
                    {seconds}
                    <span className="ml-1 text-xs font-semibold text-ink-soft">detik</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-soft">
                    Ucapkan sesuatu dalam bahasa Jepang, lalu selesaikan.
                  </p>
                  <Button variant="primary" size="lg" className="mt-3" onClick={stop}>
                    <Square size={16} fill="currentColor" /> Selesaikan Rekaman
                  </Button>
                </>
              ) : isCoolingDown ? (
                <>
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-paper text-ink-soft">
                    <Mic size={26} />
                  </span>
                  <p className="mt-2 text-xs font-semibold text-ink">
                    Tunggu {cooldownLeft} detik sebelum mengirim lagi…
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-soft">
                    Tenang — Sensei tidak akan kabur 😄
                  </p>
                </>
              ) : quotaExhausted ? (
                <>
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-paper text-ink-soft">
                    <Mic size={26} />
                  </span>
                  <p className="mt-2 text-xs font-semibold text-ink">
                    Batas percakapan sesi ini tercapai
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-soft">
                    Buka tab baru untuk melanjutkan latihan.
                  </p>
                </>
              ) : (
                <>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => start()}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo text-white shadow-soft transition-colors hover:bg-indigo-tint"
                    aria-label="Mulai rekam suara"
                  >
                    <Mic size={26} />
                  </motion.button>
                  <p className="mt-2 text-xs font-semibold text-ink">
                    Ketuk untuk berbicara dengan Sensei
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-soft">
                    {LEVELS.find((l) => l.value === level)?.hint}
                    {requestsLeft <= 5 && ` · sisa ${requestsLeft} percakapan sesi ini`}
                  </p>
                </>
              )}

              {/* Error */}
              {hasError && !busy && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 flex w-full items-start gap-2 rounded-btn border border-error/30 bg-error/5 px-4 py-3 text-left"
                  role="alert"
                >
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-error" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-error">
                      {apiError ?? "Perekaman gagal"}
                    </p>
                    {recError && <p className="mt-0.5 text-xs text-ink-soft">{recError}</p>}
                  </div>
                  <button
                    onClick={() => {
                      reset();
                      setApiError(null);
                    }}
                    className="shrink-0 text-xs font-semibold text-indigo hover:underline"
                  >
                    Tutup
                  </button>
                </motion.div>
              )}
            </div>

            <p className="mt-3 text-center text-[10px] leading-relaxed text-ink-soft">
              Audio dikirim ke server speech eksternal — hindari mengucapkan data pribadi.
            </p>
          </div>
        </div>
      </AnimatedPage>
    </StudentShell>
  );
}

/* ─── Gelembung pesan + subtitle ─── */
function MessageBubble({
  msg,
  onPlay,
  showSubtitle,
}: {
  msg: ChatMessage;
  onPlay: (msg: ChatMessage) => void;
  showSubtitle: boolean;
}) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <span className="mr-2 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo to-indigo-tint text-white">
          <Sparkles size={14} />
        </span>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
          isUser
            ? "rounded-br-sm bg-indigo text-white"
            : "rounded-bl-sm border border-line bg-paper text-ink shadow-soft"
        }`}
      >
        <p>{msg.text}</p>

        {/* Subtitle: romaji + terjemahan Indonesia */}
        {showSubtitle && (
          <div className="mt-1.5 space-y-0.5">
            {msg.romaji ? (
              <p
                className={`text-[11px] italic leading-snug ${
                  isUser ? "text-white/75" : "text-ink-soft"
                }`}
              >
                {msg.romaji}
              </p>
            ) : null}
            {msg.translation ? (
              <p
                className={`text-[11px] leading-snug ${
                  isUser ? "text-white/65" : "text-ink-soft/80"
                }`}
              >
                {msg.translation}
              </p>
            ) : null}
            {msg.translating && !msg.romaji && !msg.translation && (
              <p
                className={`animate-pulse text-[10px] ${
                  isUser ? "text-white/60" : "text-ink-soft/70"
                }`}
              >
                Menyiapkan terjemahan…
              </p>
            )}
          </div>
        )}

        {!isUser && (
          <button
            onClick={() => onPlay(msg)}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-indigo-tint-soft px-3 py-1.5 text-[11px] font-bold text-indigo transition-all hover:bg-indigo/10 active:scale-95"
            aria-label="Dengar balasan suara"
          >
            <Volume2 size={13} /> {msg.audioUrl ? "Putar balasan" : "Dengar balasan"}
          </button>
        )}
      </div>
    </motion.div>
  );
}
