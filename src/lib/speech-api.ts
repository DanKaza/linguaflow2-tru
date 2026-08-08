"use client";

/**
 * Wrapper ringan untuk API speech-to-text (endpoint /api/tools/transcribe).
 *
 * Base URL bisa di-override lewat env `NEXT_PUBLIC_SPEECH_API_URL`.
 * Catatan: server ini di-host oleh teman (bukan layanan SLA) — semua
 * pemanggilan wajib punya timeout dan pesan error yang ramah pengguna.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_SPEECH_API_URL ?? "https://api.rynaqrtz.my.id";

export interface TranscribeOptions {
  /** Kode bahasa ISO 639-1. Default: "ja". */
  language?: string;
  /** "fast" (default) atau "accurate" (Whisper besar, lebih lambat). */
  quality?: "fast" | "accurate";
  /** Batas waktu request dalam ms. Default: 30 detik. */
  timeoutMs?: number;
}

export interface TranscribeResult {
  text: string;
  language: string;
  model: string;
}

/**
 * Kirim blob audio (mis. dari MediaRecorder) ke server transcribe.
 * Mengembalikan teks transkrip; melempar Error dengan pesan Indonesia
 * yang siap ditampilkan ke pengguna.
 */
export async function transcribeAudio(
  blob: Blob,
  opts: TranscribeOptions = {},
): Promise<TranscribeResult> {
  const { language = "ja", quality = "fast", timeoutMs = 30_000 } = opts;

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const form = new FormData();
    form.append("audio", blob, "rekaman.webm");
    form.append("language", language);
    form.append("quality", quality);

    const res = await fetch(`${API_BASE}/api/tools/transcribe`, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });

    const data = await res.json().catch(() => null);

    if (!data || data.status !== true) {
      throw new Error(
        data?.message || `Server speech merespons dengan HTTP ${res.status}.`,
      );
    }

    const text = String(data.result?.text ?? "").trim();
    if (!text) throw new Error("Server tidak mengembalikan teks transkrip.");

    return {
      text,
      language: String(data.result?.language ?? language),
      model: String(data.result?.model ?? ""),
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(
        "Waktu habis — server speech lambat merespons. Coba sekali lagi.",
      );
    }
    if (err instanceof TypeError && /fetch|network/i.test(err.message)) {
      throw new Error(
        "Tidak bisa terhubung ke server speech. Periksa koneksi internetmu.",
      );
    }
    throw err;
  } finally {
    window.clearTimeout(timer);
  }
}

/** Tingkat kesulitan percakapan untuk AI Sensei. */
export type SenseiLevel = "pemula" | "menengah" | "mahir";

export interface SenseiResult {
  /** Transkrip ucapan murid (bahasa Jepang). */
  userText: string;
  /** Balasan AI dalam bahasa Jepang. */
  senseiText: string;
  /**
   * Data URL audio balasan (mis. data:audio/mp3;base64,…).
   * Opsional: bila server tidak menghasilkan audio (TTS dibatasi),
   * halaman memakai Web Speech API sebagai pengganti.
   */
  audioDataUrl?: string;
}

/**
 * Satu request gabungan: audio ucapan → transkrip → balasan AI → audio balasan.
 * Mengembalikan teks + audio balasan; melempar Error berbahasa Indonesia
 * yang siap ditampilkan ke pengguna.
 */
export async function askSensei(
  blob: Blob,
  level: SenseiLevel = "pemula",
  timeoutMs = 90_000,
): Promise<SenseiResult> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const form = new FormData();
    form.append("audio", blob, "rekaman.webm");
    form.append("level", level);

    const res = await fetch(`${API_BASE}/api/ai/sensei`, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });

    const data = await res.json().catch(() => null);

    if (!data || data.status !== true) {
      const msg = data?.message || `Server speech merespons dengan HTTP ${res.status}.`;
      // gTTS (Google TTS unofficial) di server teman sering ditolak Google
      // setelah beberapa request — beri pesan yang menjelaskan cara menangani.
      if (/partial tts|tts request|rejected by the server/i.test(msg)) {
        throw new Error(
          "Server suara sedang dibatasi (TTS Google). Tunggu sekitar 1–2 menit, lalu coba lagi.",
        );
      }
      throw new Error(msg);
    }

    const userText = String(data.result?.user_text ?? "").trim();
    const senseiText = String(data.result?.sensei_text ?? "").trim();
    const audioBase64 = String(data.result?.sensei_audio_base64 ?? "");

    if (!senseiText) {
      throw new Error("Server tidak mengembalikan balasan dari Sensei.");
    }
    if (!userText) {
      throw new Error("Server tidak mengenali ucapanmu. Coba lagi lebih jelas.");
    }

    // Audio opsional — teks tetap bisa tampil & dibacakan Web Speech API.
    return {
      userText,
      senseiText,
      audioDataUrl: audioBase64
        ? `data:audio/${String(data.result?.audio_format ?? "mp3")};base64,${audioBase64}`
        : undefined,
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(
        "Waktu habis — Sensei sedang sibuk. Coba sekali lagi.",
      );
    }
    if (err instanceof TypeError && /fetch|network/i.test(err.message)) {
      throw new Error(
        "Tidak bisa terhubung ke server Sensei. Periksa koneksi internetmu.",
      );
    }
    throw err;
  } finally {
    window.clearTimeout(timer);
  }
}

export interface TranslateResult {
  /** Terjemahan dalam bahasa Indonesia. */
  text: string;
}

/**
 * Terjemahkan teks Jepang → Indonesia via endpoint TTS milik teman
 * (mode text-to-text + translate). Dipakai untuk subtitle di chat Sensei.
 */
export async function translateJaToId(
  text: string,
  timeoutMs = 15_000,
): Promise<TranslateResult> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Teks kosong — tidak ada yang diterjemahkan.");

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const params = new URLSearchParams({
      text: trimmed,
      from: "ja",
      to: "id",
      mode: "text-to-text",
      translate: "1",
    });

    const res = await fetch(`${API_BASE}/api/tools/tts?${params.toString()}`, {
      signal: controller.signal,
    });

    const data = await res.json().catch(() => null);
    if (!data || data.status !== true) {
      throw new Error(
        data?.message || `Server terjemahan merespons dengan HTTP ${res.status}.`,
      );
    }

    const translated = String(data.result?.result ?? "").trim();
    if (!translated) {
      throw new Error("Server tidak mengembalikan terjemahan.");
    }
    return { text: translated };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Waktu habis — terjemahan gagal dimuat.");
    }
    if (err instanceof TypeError && /fetch|network/i.test(err.message)) {
      throw new Error(
        "Tidak bisa terhubung ke server terjemahan. Periksa koneksi internetmu.",
      );
    }
    throw err;
  } finally {
    window.clearTimeout(timer);
  }
}
