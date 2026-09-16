"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Mic,
  MicOff,
  Send,
  Volume2,
  Loader2,
  AlertTriangle,
  Languages,
  MessageSquare,
  Radio,
  PhoneOff,
  AudioLines,
  Trash2,
  X,
} from "lucide-react";
import { StudentShell } from "@/components/layout/StudentShell";
import { useDemoSession } from "@/lib/demo-session";
import { Button } from "@/components/ui/Button";
import { AnimatedPage } from "@/components/ui/AnimatedPage";
import { useLocalStorage } from "@/lib/use-local-storage";
import {
  synthesizeTts,
  senseiChat,
  translateText,
  getLiveConfig,
  type SenseiHistoryItem,
  type LiveVoice,
} from "@/lib/linguaflow-api";
import { romanizeJapanese } from "@/lib/romaji";
import { SenseiLiveSession, type LiveStatus } from "@/lib/sensei-live";
import { stopJapaneseSpeech, speakJapanese } from "@/lib/speech";

/* ─────────────────────────────────────────────
 * Tipe & konstanta
 * ───────────────────────────────────────────── */

interface ChatMessage {
  id: string;
  role: "user" | "sensei";
  text: string;
  /** URL audio balasan (Blob dari server TTS) — hanya pesan sensei. */
  audioUrl?: string;
  translation?: string;
  romaji?: string;
  translating?: boolean;
}

type Mode = "chat" | "live";
const WAVE_BARS = [0, 1, 2, 3, 4, 5, 6];
const SUBTITLE_KEY = "lf-sensei-subtitle";
const WELCOME_ID = "welcome";
/** Batas pesan yang dipersistenkan per murid. */
const HISTORY_MAX = 100;

const WELCOME_MESSAGE: ChatMessage = {
  id: WELCOME_ID,
  role: "sensei",
  text: "こんにちは！私はAI Senseiです。一緒に日本語を練習しましょう！",
  translation: "Halo! Aku adalah AI Sensei. Mari berlatih bahasa Jepang bersama!",
  romaji: "Konnichiwa! Watashi wa AI Sensei desu. Issho ni nihongo o renshū shimashou!",
};

/* ── Persistensi riwayat per murid (localStorage) ──
 * Blob URL audio & flag `translating` tidak disimpan — audio mati saat
 * halaman ditutup, dan flag transien tidak boleh hidup lagi setelah reload. */

interface SenseiStoredMsg {
  id: string;
  role: ChatMessage["role"];
  text: string;
  translation?: string;
  romaji?: string;
}

function isStoredMsg(v: unknown): v is SenseiStoredMsg {
  if (typeof v !== "object" || v === null) return false;
  const m = v as Record<string, unknown>;
  return (
    typeof m.id === "string" &&
    typeof m.text === "string" &&
    m.text.trim() !== "" &&
    (m.role === "user" || m.role === "sensei")
  );
}

function toStored(m: ChatMessage): SenseiStoredMsg {
  const base: SenseiStoredMsg = { id: m.id, role: m.role, text: m.text };
  if (m.translation) base.translation = m.translation;
  if (m.romaji) base.romaji = m.romaji;
  return base;
}

/* ── Store percakapan per murid (localStorage-backed) ──
 * Pola sama dengan useLocalStorage (useSyncExternalStore): hydration-safe
 * (server & hydrasi memakai snapshot awal), snapshot stabil antar render,
 * dan persistensi terjadi di setter — tanpa setState di effect. */

const convCache = new Map<string, ChatMessage[]>();
const convListeners = new Set<() => void>();
/** Snapshot server: hanya pesan sambutan (referensi stabil module-level). */
const SERVER_MESSAGES: ChatMessage[] = [WELCOME_MESSAGE];

function emitConv() {
  for (const l of convListeners) l();
}

/** Snapshot untuk satu key: cache dulu, muat dari localStorage saat pertama. */
function readConv(key: string): ChatMessage[] {
  const cached = convCache.get(key);
  if (cached) return cached;
  let restored: ChatMessage[] = [];
  try {
    const raw = window.localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      restored = parsed.filter(isStoredMsg).map((m) => ({
        id: m.id,
        role: m.role,
        text: m.text,
        translation: m.translation,
        romaji: m.romaji,
      }));
    }
  } catch {
    /* data korup → mulai percakapan baru */
  }
  const value = restored.length > 0 ? [WELCOME_MESSAGE, ...restored] : SERVER_MESSAGES;
  convCache.set(key, value);
  return value;
}

let msgSeq = 0;
function newId(): string {
  msgSeq += 1;
  return `${Date.now().toString(36)}-${msgSeq}`;
}

/** Putar blob audio (server TTS) — helper kecil. */
function playBlobUrl(url: string): HTMLAudioElement {
  const audio = new Audio(url);
  audio.play().catch(() => {
    /* autoplay diblokir — user bisa tap tombol putar di bubble */
  });
  return audio;
}

/* ═════════════════════════════════════════════
 * Komponen utama
 * ═════════════════════════════════════════════ */

export default function SenseiChat() {
  // Mode chat langsung aktif; live diaktifkan lewat toggle bawah.
  const { profile } = useDemoSession();
  const [mode, setMode] = useState<Mode>("chat");
  const [apiError, setApiError] = useState<string | null>(null);
  const [showSubtitle, setShowSubtitle] = useLocalStorage<boolean>(SUBTITLE_KEY, true);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<SenseiLiveSession | null>(null);
  /** Guard enrich subtitle ganda untuk teks yang sama. */
  const enrichedRef = useRef<Set<string>>(new Set());
  /** Konteks chat Sensei — diangkat ke sini agar tidak reset saat pindah tab. */
  const chatHistoryRef = useRef<SenseiHistoryItem[]>([]);

  /* ── Riwayat percakapan per murid (localStorage) ── */
  const historyKey = profile?.id ? `lf-sensei-history:${profile.id}` : "lf-sensei-history:guest";

  const subscribeConv = useCallback((listener: () => void) => {
    convListeners.add(listener);
    return () => {
      convListeners.delete(listener);
    };
  }, []);
  const getMessages = useCallback(() => readConv(historyKey), [historyKey]);
  const messages = useSyncExternalStore(subscribeConv, getMessages, () => SERVER_MESSAGES);

  /** Ganti pesan + proyeksikan ke localStorage (batas HISTORY_MAX). */
  const setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>> = useCallback(
    (next) => {
      const current = readConv(historyKey);
      const resolved =
        typeof next === "function" ? (next as (p: ChatMessage[]) => ChatMessage[])(current) : next;
      convCache.set(historyKey, resolved);
      const projection = resolved
        .filter((m) => m.id !== WELCOME_ID && m.text.trim() !== "")
        .slice(-HISTORY_MAX)
        .map(toStored);
      try {
        window.localStorage.setItem(historyKey, JSON.stringify(projection));
      } catch {
        /* kuota penuh — abaikan */
      }
      emitConv();
    },
    [historyKey],
  );

  // Bangun ulang konteks chat Sensei dari riwayat tersimpan (per key).
  useEffect(() => {
    chatHistoryRef.current = readConv(historyKey)
      .filter((m) => m.id !== WELCOME_ID)
      .slice(-20)
      .map<SenseiHistoryItem>((m) => ({ role: m.role === "user" ? "user" : "model", parts: m.text }));
  }, [historyKey]);

  /** Bersihkan seluruh riwayat (localStorage + konteks + UI). */
  function clearHistory() {
    if (!window.confirm("Hapus semua riwayat percakapan dengan Sensei?")) return;
    stopJapaneseSpeech();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    chatHistoryRef.current = [];
    enrichedRef.current = new Set();
    setApiError(null);
    setMessages([WELCOME_MESSAGE]);
  }

  const enrichMessage = useCallback(async (id: string, jpText: string) => {
    const key = `${id}:${jpText}`;
    if (enrichedRef.current.has(key)) return;
    enrichedRef.current.add(key);
    const [translation, romaji] = await Promise.all([
      translateText(jpText, { from: "ja", to: "id" })
        .then((r) => r.translation)
        .catch(() => ""),
      romanizeJapanese(jpText).catch(() => ""),
    ]);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, translation, romaji, translating: false } : m,
      ),
    );
  }, [setMessages]);

  /* ── Putar audio balasan (server TTS blob, fallback Web Speech) ── */
  const playReply = useCallback((url: string | undefined) => {
    stopJapaneseSpeech();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    if (url) {
      audioRef.current = playBlobUrl(url);
    }
  }, []);

  /* ── Auto-scroll chat ── */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Bersihkan sesi live & audio saat pindah halaman.
  useEffect(
    () => () => {
      liveRef.current?.close();
      liveRef.current = null;
      stopJapaneseSpeech();
      audioRef.current?.pause();
    },
    [],
  );

  /** Tambah bubble sensei + muat TTS blob + subtitle async. */
  const addSenseiMessage = useCallback(
    async (text: string) => {
      const id = newId();
      setMessages((prev) => [...prev, { id, role: "sensei", text, translating: true }]);
      void enrichMessage(id, text);
      try {
        const blob = await synthesizeTts(text, { timeoutMs: 20_000 });
        const url = URL.createObjectURL(blob);
        setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, audioUrl: url } : m)));
        if (mode === "chat") audioRef.current = playBlobUrl(url);
      } catch {
        // TTS server gagal (mis. gateway 502) → fallback gratis Web Speech API
        // agar balasan tetap terdengar; bubble tanpa tombol putar.
        if (mode === "chat") void speakJapanese(text);
      }
    },
    [enrichMessage, mode, setMessages],
  );

  return (
    <StudentShell noHeader>
      <AnimatedPage>
        <div className="flex h-[calc(100dvh-5rem)] flex-col overflow-hidden md:mx-auto md:max-w-2xl" style={{ paddingBottom: 0 }}>
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
              <p className="text-[11px] text-ink-soft">
                {mode === "chat" ? "Chat interaktif — Sensei membalas dengan suara" : "Suara langsung — bicara seperti telepon"}
              </p>
            </div>
            <button
              onClick={clearHistory}
              title="Hapus riwayat percakapan"
              aria-label="Hapus riwayat percakapan"
              className="flex items-center gap-1 rounded-full border border-line bg-paper px-2.5 py-1 text-[10px] font-bold text-ink-soft transition-all hover:text-error active:scale-95"
            >
              <Trash2 size={12} /> Bersihkan
            </button>
            <button
              onClick={() => setShowSubtitle((s) => !s)}
              aria-pressed={showSubtitle}
              title={showSubtitle ? "Sembunyikan subtitle" : "Tampilkan subtitle"}
              className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold transition-all active:scale-95 ${
                showSubtitle ? "border-indigo/20 bg-indigo-tint-soft text-indigo" : "border-line bg-paper text-ink-soft"
              }`}
            >
              <Languages size={12} /> Subtitle
            </button>
          </div>

          {/* MODE TABS */}
          <div className="shrink-0 px-4 pt-3">
            <div className="mx-auto grid w-full max-w-sm grid-cols-2 gap-1 rounded-full border border-line bg-paper p-1">
              <button
                onClick={() => setMode("chat")}
                className={`flex items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-xs font-bold transition-all ${
                  mode === "chat" ? "bg-indigo text-white shadow-soft" : "text-ink-soft hover:text-ink"
                }`}
              >
                <MessageSquare size={13} /> Chat
              </button>
              <button
                onClick={() => setMode("live")}
                className={`flex items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-xs font-bold transition-all ${
                  mode === "live" ? "bg-vermillion text-white shadow-soft" : "text-ink-soft hover:text-ink"
                }`}
              >
                <Radio size={13} /> Suara Live
              </button>
            </div>
          </div>

          {/* KONTEN */}
          {mode === "chat" ? (
            <ChatMode
              messages={messages}
              setMessages={setMessages}
              setApiError={setApiError}
              scrollRef={scrollRef}
              showSubtitle={showSubtitle}
              onPlay={playReply}
              onSenseiReply={addSenseiMessage}
              historyRef={chatHistoryRef}
            />
          ) : (
            <LiveMode
              messages={messages}
              setMessages={setMessages}
              enrichMessage={enrichMessage}
              showSubtitle={showSubtitle}
              setApiError={setApiError}
              scrollRef={scrollRef}
              liveRef={liveRef}
            />
          )}

          {/* ERROR GLOBAL */}
          {apiError && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-4 mb-2 flex shrink-0 items-start gap-2 rounded-btn border border-error/30 bg-error/5 px-4 py-3 text-left"
              role="alert"
            >
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-error" />
              <p className="flex-1 text-xs font-semibold text-error">{apiError}</p>
              <button
                onClick={() => setApiError(null)}
                className="shrink-0 text-xs font-semibold text-indigo hover:underline"
                aria-label="Tutup pesan error"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </div>
      </AnimatedPage>
    </StudentShell>
  );
}

/* ═════════════════════════════════════════════
 * MODE CHAT — teks + /sensei/chat + TTS server
 * ═════════════════════════════════════════════ */

function ChatMode({
  messages,
  setMessages,
  setApiError,
  scrollRef,
  showSubtitle,
  onPlay,
  onSenseiReply,
  historyRef,
}: {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setApiError: (msg: string | null) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  showSubtitle: boolean;
  onPlay: (url: string | undefined) => void;
  onSenseiReply: (text: string) => Promise<void>;
  /** Konteks Sensei bersama — diisi dari riwayat tersimpan + pesan baru. */
  historyRef: React.MutableRefObject<SenseiHistoryItem[]>;
}) {
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;

    setInput("");
    setMessages((prev) => [...prev, { id: newId(), role: "user", text: trimmed }]);
    setThinking(true);
    setApiError(null);

    try {
      const { response } = await senseiChat(trimmed, historyRef.current);
      historyRef.current.push({ role: "user", parts: trimmed });
      historyRef.current.push({ role: "model", parts: response });
      if (historyRef.current.length > 20) historyRef.current = historyRef.current.slice(-20);
      await onSenseiReply(response);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Sensei gagal merespons. Coba lagi nanti.");
    } finally {
      setThinking(false);
    }
  }

  return (
    <>
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-warm-white px-4 py-4 thin-scroll" aria-live="polite">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            showSubtitle={showSubtitle}
            onPlay={() => onPlay(msg.audioUrl)}
          />
        ))}
        {thinking && <TypingIndicator label="Sensei sedang memikirkan jawaban…" />}
      </div>

      {/* COMPOSER */}
      <div className="shrink-0 border-t border-line/60 bg-warm-white px-4 pb-4 pt-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="mx-auto flex w-full max-w-sm items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tulis dalam bahasa Jepang atau Indonesia…"
            className="h-11 flex-1 rounded-btn border border-line bg-paper px-4 text-sm text-ink placeholder:text-ink-soft/60 focus:border-indigo focus:outline-none"
            disabled={thinking}
          />
          <Button type="submit" size="md" disabled={thinking || !input.trim()} aria-label="Kirim">
            {thinking ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </Button>
        </form>
        <p className="mt-2 text-center text-[10px] text-ink-soft">
          Pesan dikirim ke AI Sensei — hindari mengucapkan data pribadi.
        </p>
      </div>
    </>
  );
}

/* ═════════════════════════════════════════════
 * MODE LIVE — bicara langsung via WebSocket
 * ═════════════════════════════════════════════ */

const LIVE_STATUS_LABEL: Record<LiveStatus, string> = {
  connecting: "Menghubungkan…",
  ready: "Siap — mulai bicara",
  listening: "Mendengarkan…",
  speaking: "Sensei sedang berbicara",
  closed: "Sesi berakhir",
  error: "Terjadi kesalahan",
};

function LiveMode({
  messages,
  setMessages,
  enrichMessage,
  showSubtitle,
  setApiError,
  scrollRef,
  liveRef,
}: {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  enrichMessage: (id: string, jpText: string) => Promise<void>;
  showSubtitle: boolean;
  setApiError: (msg: string | null) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  liveRef: React.MutableRefObject<SenseiLiveSession | null>;
}) {
  const [status, setStatus] = useState<LiveStatus>("closed");
  const [partialUser, setPartialUser] = useState("");
  const [partialSensei, setPartialSensei] = useState("");
  // Daftar voice prebuilt dari GET /sensei/live/config (dimuat sekali).
  // Voice bawaan session bila user belum memilih / config gagal: Aoede.
  const [voices, setVoices] = useState<LiveVoice[]>([]);
  const [voiceId, setVoiceId] = useState("");

  useEffect(() => {
    let mounted = true;
    getLiveConfig()
      .then((cfg) => {
        if (!mounted) return;
        setVoices(cfg.voices);
        const fallback = cfg.defaultVoice ?? cfg.voices[0]?.id ?? "Aoede";
        setVoiceId((cur) => cur || fallback);
      })
      .catch(() => {
        /* config gagal — session fallback ke "Aoede" */
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function startLive() {
    setApiError(null);
    setPartialUser("");
    setPartialSensei("");

    const session = new SenseiLiveSession(
      {
        onStatusChange: setStatus,
        onUserTranscript: (text) => setPartialUser(text),
        onOutputText: (text) => {
          setPartialSensei((prev) => (text ? prev + text : prev));
        },
        onTurnComplete: ({ userText, aiText }) => {
          setPartialUser("");
          setPartialSensei("");
          if (userText) {
            const uid = newId();
            setMessages((prev) => [...prev, { id: uid, role: "user", text: userText, translating: true }]);
            void enrichMessage(uid, userText);
          }
          if (aiText) {
            const sid = newId();
            setMessages((prev) => [...prev, { id: sid, role: "sensei", text: aiText, translating: true }]);
            void enrichMessage(sid, aiText);
          }
        },
        onError: (msg) => setApiError(msg),
      },
      voiceId || undefined,
    );

    liveRef.current = session;
    try {
      await session.open();
    } catch {
      /* error sudah dilaporkan via onError */
    }
  }

  function endLive() {
    liveRef.current?.close();
    liveRef.current = null;
    setStatus("closed");
    setPartialUser("");
    setPartialSensei("");
  }

  const active = status === "connecting" || status === "ready" || status === "listening" || status === "speaking";

  return (
    <>
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-warm-white px-4 py-4 thin-scroll" aria-live="polite">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} showSubtitle={showSubtitle} onPlay={() => {}} />
        ))}

        {/* Partial transcript — muncul realtime saat bicara */}
        {active && (partialUser || partialSensei) && (
          <>
            {partialUser && (
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-indigo/70 px-4 py-2.5 text-sm text-white italic">
                  {partialUser}
                </div>
              </div>
            )}
            {partialSensei && (
              <div className="flex justify-start">
                <span className="mr-2 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo to-indigo-tint text-white">
                  <Sparkles size={14} />
                </span>
                <div className="max-w-[80%] rounded-2xl rounded-bl-sm border border-indigo/30 bg-paper px-4 py-2.5 text-sm text-ink italic shadow-soft">
                  {partialSensei}
                </div>
              </div>
            )}
          </>
        )}

        {status === "connecting" && <TypingIndicator label="Menyiapkan sesi suara…" />}
      </div>

      {/* LIVE CONTROL */}
      <div className="shrink-0 border-t border-line/60 bg-warm-white px-4 pb-4 pt-4">
        <div className="mx-auto flex w-full max-w-sm flex-col items-center">
          {active ? (
            <>
              {/* Visualizer */}
              <div className="flex h-12 items-end justify-center gap-1.5" aria-hidden="true">
                {WAVE_BARS.map((i) => (
                  <div
                    key={i}
                    className={`lf-waveform-bar h-8 w-1.5 rounded-full ${
                      status === "speaking" ? "bg-indigo" : "bg-vermillion"
                    }`}
                  />
                ))}
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-ink">
                {status === "speaking" ? (
                  <>
                    <Volume2 size={16} className="text-indigo" /> {LIVE_STATUS_LABEL[status]}
                  </>
                ) : (
                  <>
                    <Mic size={16} className="text-vermillion" /> {LIVE_STATUS_LABEL[status]}
                  </>
                )}
              </p>
              <p className="mt-0.5 text-[11px] text-ink-soft">
                Bicara natural — Sensei otomatis menjawab. Kamu bisa menyela kapan saja.
              </p>
              <Button variant="primary" size="lg" className="mt-4 bg-vermillion" onClick={endLive}>
                <PhoneOff size={16} /> Akhiri Sesi
              </Button>
            </>
          ) : (
            <>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => void startLive()}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-vermillion text-white shadow-soft transition-colors hover:bg-vermillion/90"
                aria-label="Mulai sesi suara live"
              >
                <Mic size={26} />
              </motion.button>
              <p className="mt-2 text-xs font-semibold text-ink">
                {status === "error" ? "Coba mulai sesi lagi" : "Ketuk untuk bicara langsung dengan Sensei"}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-soft">
                <MicOff size={12} /> Perlu izin mikrofon & koneksi stabil
              </p>

              {/* Pemilih suara (dari GET /sensei/live/config) */}
              {voices.length > 0 && (
                <label className="mt-4 flex w-full items-center gap-2 rounded-xl border border-line bg-paper px-3 py-2 shadow-soft">
                  <AudioLines size={14} className="shrink-0 text-indigo" />
                  <select
                    value={voiceId}
                    onChange={(e) => setVoiceId(e.target.value)}
                    className="w-full bg-transparent text-xs font-semibold text-ink outline-none"
                    aria-label="Pilih suara Sensei"
                  >
                    {voices.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name ?? v.id}
                        {v.description ? ` — ${v.description}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

/* ═════════════════════════════════════════════
 * Elemen bersama
 * ═════════════════════════════════════════════ */

function TypingIndicator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-ink-soft">
      <Loader2 size={16} className="animate-spin text-indigo" /> {label}
    </div>
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
          isUser ? "rounded-br-sm bg-indigo text-white" : "rounded-bl-sm border border-line bg-paper text-ink shadow-soft"
        }`}
      >
        <p>{msg.text}</p>

        {showSubtitle && (
          <div className="mt-1.5 space-y-0.5">
            {msg.romaji ? (
              <p className={`text-[11px] italic leading-snug ${isUser ? "text-white/75" : "text-ink-soft"}`}>{msg.romaji}</p>
            ) : null}
            {msg.translation ? (
              <p className={`text-[11px] leading-snug ${isUser ? "text-white/65" : "text-ink-soft/80"}`}>{msg.translation}</p>
            ) : null}
            {msg.translating && !msg.romaji && !msg.translation && (
              <p className={`animate-pulse text-[10px] ${isUser ? "text-white/60" : "text-ink-soft/70"}`}>Menyiapkan terjemahan…</p>
            )}
          </div>
        )}

        {!isUser && msg.audioUrl && (
          <button
            onClick={() => onPlay(msg)}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-indigo-tint-soft px-3 py-1.5 text-[11px] font-bold text-indigo transition-all hover:bg-indigo/10 active:scale-95"
            aria-label="Dengar balasan suara"
          >
            <Volume2 size={13} /> Putar balasan
          </button>
        )}
      </div>
    </motion.div>
  );
}
