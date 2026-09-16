"use client";

/**
 * Klien Suara Live AI Sensei — langsung ke Google Gemini Live API.
 *
 * Protokol: WebSocket `BidiGenerateContent` (v1beta).
 *  - Klien kirim `{ setup }`  → server balas `{ setupComplete }`
 *  - Mic PCM16 @16 kHz base64 → `{ realtimeInput.mediaChunks }`
 *  - Server kirim `{ serverContent }`: `modelTurn.parts[].inlineData`
 *    (audio PCM16 @24 kHz), `inputTranscription`, `outputTranscription`,
 *    `interrupted`, `turnComplete`.
 *
 * API key TIDAK pernah masuk bundle: browser memintanya dari broker
 * server `/api/sensei/live-token` yang membaca `GEMINI_API_KEY` dari env.
 *
 * Event ke UI (sama seperti desain awal, halaman tidak perlu berubah):
 *  - ready / listening / speaking (via onStatusChange)
 *  - onUserTranscript  → apa yang murid ucapkan (parsial)
 *  - onOutputText      → teks yang sedang diucapkan Sensei (parsial)
 *  - onTurnComplete    → satu giliran selesai (bubble chat permanen)
 *  - onInterrupted     → murid menyela → playback dibuang
 *  - onError / onClosed
 */

import { startMicCapture, LiveAudioPlayer, type MicCapture } from "@/lib/live-audio";

export interface LiveEvents {
  onReady?: (info: { voice: string; model?: string }) => void;
  onUserTranscript?: (text: string) => void;
  onOutputText?: (text: string, finished: boolean) => void;
  /** Satu giliran selesai — dipakai untuk menambah bubble chat. */
  onTurnComplete?: (turn: { userText: string; aiText: string; language: string }) => void;
  onInterrupted?: () => void;
  onError?: (message: string) => void;
  onClosed?: (reason: string) => void;
  onStatusChange?: (status: LiveStatus) => void;
}

export type LiveStatus = "connecting" | "ready" | "listening" | "speaking" | "closed" | "error";

/** Model live audio native — diverifikasi tersedia untuk key Gemini API. */
export const GEMINI_LIVE_MODEL = "gemini-2.5-flash-native-audio-latest";

/* ─────────────────────────────────────────────
 * Tipe pesan protokol Google (subset yang dipakai)
 * ───────────────────────────────────────────── */

interface SetupMessage {
  setup: {
    model: string;
    generationConfig: {
      responseModalities: ["AUDIO"];
      speechConfig?: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: string } };
      };
    };
    systemInstruction: { parts: { text: string }[] };
    inputAudioTranscription: Record<string, never>;
    outputAudioTranscription: Record<string, never>;
  };
}

interface ServerContent {
  modelTurn?: { parts?: { inlineData?: { mimeType?: string; data?: string }; text?: string }[] };
  inputTranscription?: { text?: string };
  outputTranscription?: { text?: string };
  interrupted?: boolean;
  turnComplete?: boolean;
}

interface GoogleEvent {
  setupComplete?: Record<string, never>;
  serverContent?: ServerContent;
  goAway?: { timeLeft?: string };
  error?: { code?: number; message?: string };
}

/** Persona Sensei — diucapkan bahasa Indonesia, sesekali latihan bahasa Jepang. */
const SENSEI_SYSTEM_PROMPT =
  "Kamu adalah Sensei, guru bahasa Jepang yang ramah untuk murid SMK Indonesia di aplikasi LinguaFlow. " +
  "Bicara santai dan memotivasi, jawab ringkas (1–3 kalimat). Bahasa utama: Indonesia. " +
  "Kalau murid ingin berlatih, gunakan bahasa Jepang sederhana (N5–N3) dan jelaskan artinya dalam bahasa Indonesia. " +
  "Kamu juga bisa menjawab pertanyaan umum seputar budaya dan kosakata Jepang.";

export class SenseiLiveSession {
  private ws: WebSocket | null = null;
  private mic: MicCapture | null = null;
  private player = new LiveAudioPlayer();
  private events: LiveEvents;
  private voice: string;
  private model = GEMINI_LIVE_MODEL;
  private status: LiveStatus = "closed";
  /** Teks balasan yang sedang menumpuk antara chunk outputTranscription. */
  private outputBuffer = "";
  private turnUserId = "";
  /** Pengaman dobel-tutup (close bisa dipanggil dari beberapa jalur). */
  private closed = false;
  /** Resolve promise open() saat setupComplete tiba dari server. */
  private setupResolve: (() => void) | null = null;
  /** Timer handshake — dibersihkan saat setupComplete / close. */
  private setupTimer: number | null = null;

  constructor(events: LiveEvents, voice?: string) {
    this.events = events;
    this.voice = voice ?? "Aoede";
  }

  private setStatus(s: LiveStatus) {
    this.status = s;
    this.events.onStatusChange?.(s);
  }

  /** Buka sesi: ambil API key dari broker, lalu handshake ke Gemini. */
  async open(): Promise<void> {
    this.closed = false;
    this.setStatus("connecting");

    // 1) Ambil key dari broker server (key TIDAK pernah masuk bundle JS).
    let apiKey: string;
    try {
      const res = await fetch("/api/sensei/live-token", { cache: "no-store" });
      const body = (await res.json().catch(() => null)) as { apiKey?: string; error?: string };
      if (!res.ok || !body?.apiKey) {
        throw new Error(body?.error ?? "Kunci live tidak tersedia.");
      }
      apiKey = body.apiKey;
    } catch (err) {
      this.setStatus("error");
      this.events.onError?.(err instanceof Error ? err.message : "Gagal mengambil kunci sesi live.");
      throw new Error("Gagal mengambil kunci sesi live.");
    }

    // 2) Buka WebSocket ke Gemini Live API.
    const wsUrl =
      "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=" +
      encodeURIComponent(apiKey);

    const ws = new WebSocket(wsUrl);
    this.ws = ws;

    // PENTING: handler pesan dipasang SEKARANG, bukan setelah await —
    // setupComplete adalah pesan pertama dari server dan satu-satunya
    // yang bisa me-resolve promise di bawah.
    ws.onmessage = (e) => this.handleEvent(e.data as string);

    await new Promise<void>((resolve, reject) => {
      // Satu timer untuk seluruh handshake (buka socket + setupComplete).
      this.setupTimer = window.setTimeout(() => {
        this.setStatus("error");
        this.events.onError?.("Waktu habis — Gemini Live tidak merespons.");
        try {
          ws.close();
        } catch {
          /* ignore */
        }
        reject(new Error("Waktu habis — Gemini Live tidak merespons."));
      }, 20_000);
      this.setupResolve = resolve;

      // 3) Handshake setup begitu socket terbuka.
      ws.onopen = () => {
        const setup: SetupMessage = {
          setup: {
            model: `models/${this.model}`,
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: this.voice } },
              },
            },
            systemInstruction: { parts: [{ text: SENSEI_SYSTEM_PROMPT }] },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
        };
        ws.send(JSON.stringify(setup));
      };
      ws.onerror = () => {
        this.clearSetupTimer();
        reject(new Error("Tidak bisa terhubung ke Gemini Live. Periksa koneksi internetmu."));
      };
      ws.onclose = (e) => {
        this.clearSetupTimer();
        if (this.closed) return;
        this.closed = true;
        const reason =
          e.code === 1009
            ? "Sesi ditolak — kredensial live tidak valid."
            : e.code === 1011
              ? "Server Gemini mengalami gangguan. Coba lagi sebentar."
              : "Sesi live ditutup.";
        this.setStatus("error");
        this.events.onError?.(reason);
        reject(new Error(reason));
      };
    });

    // Handshake selesai — ganti handler transient dengan handler sesi penuh.
    ws.onclose = (e) => {
      if (this.closed) return;
      this.closed = true;
      this.setStatus("closed");
      this.events.onClosed?.(e.reason || "Sesi berakhir.");
    };
    ws.onerror = () => {
      if (!this.closed) {
        this.setStatus("error");
        this.events.onError?.("Koneksi ke Gemini Live terputus.");
      }
    };

    // 4) Mulai tangkap mic (AudioContext 16 kHz, ini memicu resume gesture-safely).
    try {
      this.mic = await startMicCapture((pcm) => this.sendAudio(pcm));
      await this.mic.start();
    } catch {
      this.events.onError?.("Izin mikrofon ditolak. Aktifkan izin mic di browser, lalu coba lagi.");
      this.close();
      return;
    }

    // setupComplete yang akan memindahkan status ke "listening".
  }

  private handleEvent(raw: string) {
    if (this.closed) return;
    let ev: GoogleEvent;
    try {
      ev = JSON.parse(raw) as GoogleEvent;
    } catch {
      return;
    }

    if (ev.setupComplete) {
      this.clearSetupTimer();
      this.setStatus("listening");
      this.events.onReady?.({ voice: this.voice, model: this.model });
      // Lepaskan open() dari penggantungan handshake.
      this.setupResolve?.();
      this.setupResolve = null;
      return;
    }

    if (ev.serverContent) {
      const sc = ev.serverContent;

      if (sc.inputTranscription?.text) {
        this.turnUserId += sc.inputTranscription.text;
        this.events.onUserTranscript?.(this.turnUserId);
      }
      if (sc.outputTranscription?.text) {
        this.outputBuffer += sc.outputTranscription.text;
        this.events.onOutputText?.(this.outputBuffer, false);
      }
      for (const p of sc.modelTurn?.parts ?? []) {
        if (p.inlineData?.data) {
          this.player.enqueue(p.inlineData.data);
          this.setStatus("speaking");
        }
      }
      if (sc.interrupted) {
        this.player.interrupt();
        this.outputBuffer = "";
        this.setStatus("listening");
        this.events.onInterrupted?.();
      }
      if (sc.turnComplete) {
        const userText = this.turnUserId.trim();
        const aiText = this.outputBuffer.trim();
        this.turnUserId = "";
        this.outputBuffer = "";
        this.setStatus("listening");
        if (userText || aiText) {
          this.events.onTurnComplete?.({ userText, aiText, language: "unknown" });
        }
      }
      return;
    }

    if (ev.goAway) {
      this.events.onError?.("Sesi live hampir berakhir di server — mulai sesi baru untuk melanjutkan.");
      return;
    }

    if (ev.error) {
      this.setStatus("error");
      this.events.onError?.(translateGeminiError(ev.error));
    }
  }

  /** Kirim chunk mic (PCM16 @16 kHz base64) — dipanggil otomatis oleh capture. */
  sendAudio(pcmBase64: string) {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        realtimeInput: {
          mediaChunks: [{ mimeType: "audio/pcm;rate=16000", data: pcmBase64 }],
        },
      }),
    );
  }

  /** Kirim teks yang HARUS dijawab model (dipakai input teks di mode live). */
  sendTurn(text: string) {
    if (this.ws?.readyState !== WebSocket.OPEN || !text.trim()) return;
    this.ws.send(
      JSON.stringify({
        clientContent: {
          turns: [{ role: "user", parts: [{ text: text.trim() }] }],
          turnComplete: true,
        },
      }),
    );
  }

  /** Bersihkan timer handshake (dipanggil saat selesai/gagal/dibatalkan). */
  private clearSetupTimer() {
    if (this.setupTimer !== null) {
      window.clearTimeout(this.setupTimer);
      this.setupTimer = null;
    }
    this.setupResolve = null;
  }

  /** Tutup sesi & bersihkan audio. */
  close() {
    this.clearSetupTimer();
    if (this.closed) {
      this.cleanup();
      return;
    }
    this.closed = true;
    try {
      this.ws?.close();
    } catch {
      /* ignore */
    }
    this.cleanup();
    this.setStatus("closed");
  }

  private cleanup() {
    this.ws = null;
    this.mic?.stop();
    this.mic = null;
    this.player.dispose();
    this.outputBuffer = "";
    this.turnUserId = "";
  }

  getStatus(): LiveStatus {
    return this.status;
  }

  getVoice(): string {
    return this.voice;
  }
}

/** Terjemahkan pesan error Google ke bahasa yang ramah murid. */
function translateGeminiError(err: { code?: number; message?: string }): string {
  const code = err.code ?? 0;
  const raw = err.message ?? "";
  if (code === 429 || /quota|RESOURCE_EXHAUSTED/i.test(raw)) {
    return "Kuota sesi live Gemini habis untuk saat ini — coba lagi nanti.";
  }
  if (code === 401 || code === 403 || /permission|api key|unauthenticated/i.test(raw)) {
    return "Kredensial live ditolak Google — periksa GEMINI_API_KEY di server.";
  }
  if (code === 500 || code === 503 || /overloaded|unavailable/i.test(raw)) {
    return "Server Gemini sedang sibuk. Coba lagi sebentar.";
  }
  return raw ? `Kesalahan sesi live: ${raw}` : "Terjadi kesalahan di sesi live.";
}
