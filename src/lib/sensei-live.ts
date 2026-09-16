"use client";

/**
 * Klien Suara Live AI Sensei — via API LinguaFlow (`WS /sensei/live`).
 *
 * Browser TIDAK memegang kredensial admin: ia meminta accessToken berumur
 * pendek dari broker server `/api/sensei/live-token`, lalu membuka WebSocket
 * langsung ke `WS /sensei/live?token=<JWT>&voice=<id>` (lihat api.md).
 *
 * Protokol (semua frame JSON):
 *  → kirim : { type:"audio", data:<base64 pcm16 @16kHz> } | { type:"turn", text } | { type:"close" }
 *  ← terima:
 *    - ready             → sesi siap (model + voice + sessionId)
 *    - audio             → chunk PCM16 @24 kHz (base64) untuk diputar
 *    - inputTranscript   → apa yang murid ucapkan (parsial)
 *    - outputTranscript  → teks yang sedang diucapkan Sensei (parsial)
 *    - interrupted       → murid menyela → hentikan playback
 *    - turnComplete      → satu giliran selesai (userText/aiText/language)
 *    - goingAway / error / closed
 *
 * Catatan handshake: `ready` adalah pesan pertama dari server dan satu-satunya
 * yang me-resolve open(). Referensi resolver diambil & dinolkan SEBELUM
 * pembersihan timer agar tidak pernah terbuang (pelajaran dari bug lama).
 */

import { API_BASE, getLiveConfig } from "@/lib/linguaflow-api";
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

interface ServerEvent {
  type: string;
  data?: string;
  text?: string;
  finished?: boolean;
  voice?: string;
  model?: string;
  userText?: string;
  aiText?: string;
  language?: string;
  message?: string;
  reason?: string;
}

export class SenseiLiveSession {
  private ws: WebSocket | null = null;
  private mic: MicCapture | null = null;
  private player = new LiveAudioPlayer();
  private events: LiveEvents;
  private voice: string;
  private status: LiveStatus = "closed";
  /** Teks balasan yang sedang menumpuk antara chunk outputTranscript. */
  private outputBuffer = "";
  private turnUserId = "";
  /** Pengaman dobel-tutup (close bisa dipanggil dari beberapa jalur). */
  private closed = false;
  /** Resolve promise open() saat event `ready` tiba dari server. */
  private setupResolve: (() => void) | null = null;
  /** Reject promise open() bila sesi ditutup/gagal di tengah handshake. */
  private setupReject: ((err: Error) => void) | null = null;
  /** Timer handshake — dibersihkan saat ready / gagal / close. */
  private setupTimer: number | null = null;

  constructor(events: LiveEvents, voice?: string) {
    this.events = events;
    this.voice = voice ?? "";
  }

  private setStatus(s: LiveStatus) {
    this.status = s;
    this.events.onStatusChange?.(s);
  }

  /** Buka sesi: ambil token dari broker, lalu connect WS ke LinguaFlow. */
  async open(): Promise<void> {
    this.closed = false;
    this.setStatus("connecting");

    // 1) Pilih voice default dari config bila belum ditentukan.
    if (!this.voice) {
      try {
        const cfg = await getLiveConfig();
        this.voice = cfg.defaultVoice ?? cfg.voices[0]?.id ?? "Aoede";
      } catch {
        this.voice = "Aoede";
      }
    }

    // 2) Ambil token admin dari broker (login terjadi di server saja).
    let token: string;
    try {
      const res = await fetch("/api/sensei/live-token", { cache: "no-store" });
      const body = (await res.json().catch(() => null)) as { accessToken?: string; error?: string };
      if (!res.ok || !body?.accessToken) {
        throw new Error(body?.error ?? "Token live tidak tersedia.");
      }
      token = body.accessToken;
    } catch (err) {
      this.setStatus("error");
      this.events.onError?.(err instanceof Error ? err.message : "Gagal mengambil token live.");
      throw new Error("Gagal mengambil token live.");
    }

    // 3) Buka WebSocket.
    const wsUrl = `${API_BASE.replace(/^http/, "ws")}/sensei/live?token=${encodeURIComponent(token)}&voice=${encodeURIComponent(this.voice)}`;
    const ws = new WebSocket(wsUrl);
    this.ws = ws;

    // PENTING: handler pesan dipasang SEKARANG, bukan setelah await —
    // `ready` adalah pesan pertama dari server dan satu-satunya yang
    // me-resolve promise di bawah.
    ws.onmessage = (e) => this.handleEvent(e.data as string);

    await new Promise<void>((resolve, reject) => {
      // Satu timer untuk seluruh handshake (buka socket + sesi siap).
      this.setupTimer = window.setTimeout(() => {
        this.setupTimer = null;
        this.setupResolve = null;
        this.setupReject = null;
        this.setStatus("error");
        this.events.onError?.("Waktu habis — server live tidak merespons.");
        try {
          ws.close();
        } catch {
          /* ignore */
        }
        reject(new Error("Waktu habis — server live tidak merespons."));
      }, 20_000);
      this.setupResolve = resolve;
      this.setupReject = reject;

      // Tidak ada pesan setup yang perlu dikirim — server mengirim `ready`
      // begitu sesi Gemini-nya siap.
      ws.onerror = () => {
        this.clearSetup();
        reject(new Error("Tidak bisa terhubung ke sesi live. Periksa koneksi internetmu."));
      };
      ws.onclose = (e) => {
        this.clearSetup();
        if (this.closed) return;
        this.closed = true;
        const reason =
          e.code === 4401
            ? "Token live tidak valid atau kedaluwarsa."
            : e.code === 4403
              ? "Akun API bukan admin — live voice ditolak server."
              : e.code === 4500
                ? "Sesi Gemini gagal dibuka di server. Coba lagi sebentar."
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
        this.events.onError?.("Koneksi ke server live terputus.");
      }
    };

    // 4) Mulai tangkap mic (AudioContext 16 kHz + worklet).
    try {
      this.mic = await startMicCapture((pcm) => this.sendAudio(pcm));
      await this.mic.start();
    } catch {
      this.events.onError?.("Izin mikrofon ditolak. Aktifkan izin mic di browser, lalu coba lagi.");
      this.close();
      return;
    }

    // Status "listening" dipicu oleh event `ready` di handleEvent().
  }

  private handleEvent(raw: string) {
    if (this.closed) return;
    let ev: ServerEvent;
    try {
      ev = JSON.parse(raw) as ServerEvent;
    } catch {
      return;
    }

    switch (ev.type) {
      case "ready": {
        // URUTAN PENTING: ambil & nol-kan resolver SEBELUM clearSetup —
        // jangan sampai referensinya terbuang sebelum dipanggil.
        const resolve = this.setupResolve;
        this.setupResolve = null;
        this.setupReject = null;
        this.clearSetupTimer();
        if (ev.voice) this.voice = ev.voice;
        this.setStatus("listening");
        this.events.onReady?.({ voice: this.voice, model: ev.model });
        resolve?.();
        break;
      }
      case "audio":
        if (ev.data) {
          this.player.enqueue(ev.data);
          this.setStatus("speaking");
        }
        break;
      case "inputTranscript":
        if (ev.text) {
          this.turnUserId = ev.text;
          this.events.onUserTranscript?.(ev.text);
        }
        break;
      case "outputTranscript":
        if (ev.text) {
          this.outputBuffer += ev.text;
          this.events.onOutputText?.(ev.text, ev.finished === true);
        }
        break;
      case "interrupted":
        this.player.interrupt();
        this.outputBuffer = "";
        this.setStatus("listening");
        this.events.onInterrupted?.();
        break;
      case "turnComplete": {
        const userText = (ev.userText ?? this.turnUserId).trim();
        const aiText = (ev.aiText ?? this.outputBuffer).trim();
        this.outputBuffer = "";
        this.turnUserId = "";
        this.setStatus("listening");
        if (userText || aiText) {
          this.events.onTurnComplete?.({ userText, aiText, language: ev.language ?? "unknown" });
        }
        break;
      }
      case "text":
        // Teks model di luar transkrip — tampilkan bila belum ada output.
        if (ev.text && !this.outputBuffer) this.events.onOutputText?.(ev.text, true);
        break;
      case "goingAway":
        this.events.onError?.(
          "Sesi live hampir mencapai batas server — mulai sesi baru untuk melanjutkan.",
        );
        break;
      case "error":
        this.setStatus("error");
        this.events.onError?.(ev.message ?? "Terjadi kesalahan di sesi live.");
        break;
      case "closed":
        if (!this.closed) {
          this.closed = true;
          this.setStatus("closed");
          this.events.onClosed?.(ev.reason ?? "Sesi berakhir.");
        }
        break;
    }
  }

  /** Kirim chunk mic (PCM16 @16 kHz base64) — dipanggil otomatis oleh capture. */
  sendAudio(pcmBase64: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "audio", data: pcmBase64 }));
    }
  }

  /** Kirim teks yang HARUS dijawab model (dipakai input teks di mode live). */
  sendTurn(text: string) {
    if (this.ws?.readyState === WebSocket.OPEN && text.trim()) {
      this.ws.send(JSON.stringify({ type: "turn", text: text.trim() }));
    }
  }

  /** Bersihkan timer handshake tanpa menyentuh resolver. */
  private clearSetupTimer() {
    if (this.setupTimer !== null) {
      window.clearTimeout(this.setupTimer);
      this.setupTimer = null;
    }
  }

  /** Bersihkan timer + referensi promise (jalur gagal handshake). */
  private clearSetup() {
    this.clearSetupTimer();
    this.setupResolve = null;
    this.setupReject = null;
  }

  /** Tutup sesi & bersihkan audio. */
  close() {
    this.clearSetupTimer();
    // Setel ulang promise handshake yang masih menggantung (close di tengah
    // handshake tidak boleh membuat open() menggantung selamanya).
    const rejectPending = this.setupReject;
    this.setupResolve = null;
    this.setupReject = null;
    rejectPending?.(new Error("Sesi ditutup sebelum selesai disiapkan."));

    if (this.closed) {
      this.cleanup();
      return;
    }
    this.closed = true;
    try {
      this.ws?.send(JSON.stringify({ type: "close" }));
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
