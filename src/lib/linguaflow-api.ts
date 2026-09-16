"use client";

/**
 * Klien API LinguaFlow (https://lg.tixrouter.my.id/api/v1) — MODE PROTOTIPE.
 *
 * Menggantikan server speech lama (api.rynaqrtz.my.id). Semua endpoint publik
 * (TTS / STT / Translate / Sensei chat) dipanggil langsung dari browser;
 * Suara Live membuka WebSocket ke `WS /sensei/live` dengan accessToken admin
 * yang di-broker lewat route Next.js `/api/sensei/live-token` (kredensial
 * tidak pernah menyentuh client).
 *
 * Semua request punya timeout & pesan error bahasa Indonesia yang siap
 * ditampilkan — mengikuti format error baku API: { error, code }.
 */

/**
 * Base API untuk fetch dari BROWSER.
 *
 * Default: langsung ke API produksi. Sejak update terakhir, server mengirim
 * `Access-Control-Allow-Origin` yang me-refleksikan Origin pemanggil
 * (CORS terbuka, terverifikasi) — jadi fetch langsung dari browser aman.
 *
 * Kalau CORS di server sempat ditutup lagi (CORS_ORIGIN diset), cukup kembalikan
 * proxy same-origin tanpa ubah kode — set di .env.local:
 *   NEXT_PUBLIC_LINGUAFLOW_API_URL=/api/linguaflow
 * (route proxy: src/app/api/linguaflow/[...path]/route.ts)
 */
export const API_BASE =
  process.env.NEXT_PUBLIC_LINGUAFLOW_API_URL ?? "https://lg.tixrouter.my.id/api/v1";

/* ─────────────────────────────────────────────
 * Error handling
 * ───────────────────────────────────────────── */

interface ApiErrorBody {
  error?: string;
  code?: string;
}

/** Terjemahkan kode error baku API ke pesan ramah pengguna (Indonesia). */
export function translateApiError(code: string | undefined, raw: string): string {
  switch (code) {
    case "AI_ERROR":
      if (/quota|429|resource_exhausted/i.test(raw)) {
        return "Kuota AI harian server sudah habis (paket gratis). Coba lagi besok, atau minta pemilik API menambah GEMINI_API_KEY.";
      }
      return "Server AI sedang bermasalah. Coba lagi sebentar.";
    case "TTS_ERROR":
      return "Pembuatan suara gagal di server. Coba lagi sebentar.";
    case "STT_ERROR":
      return "Pengenalan suara gagal di server. Coba rekam ulang.";
    case "NOT_FOUND":
      return "Fitur tidak ditemukan di server API.";
    case "UNAUTHORIZED":
      return "Sesi API tidak valid — muat ulang halaman, lalu coba lagi.";
    default:
      return raw;
  }
}

/** Pesan untuk error gateway (Cloudflare/origin down — respons bukan JSON). */
function gatewayErrorMessage(status: number): string {
  if (status === 502) return "Server API sedang tidak tersedia (gateway). Coba lagi beberapa menit lagi.";
  if (status === 503) return "Server API sedang kelebihan beban. Coba lagi sebentar.";
  if (status === 504) return "Server API terlalu lama merespons. Coba lagi sebentar.";
  return `Server merespons dengan HTTP ${status}.`;
}

/** Fetch dasar dengan timeout + parsing error baku { error, code }. */
async function apiFetch(path: string, init: RequestInit = {}, timeoutMs = 30_000): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}${path}`, { ...init, signal: controller.signal });
    if (!res.ok) {
      // Gateway (mis. Cloudflare) membalas error dengan teks biasa, bukan JSON.
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        throw new Error(gatewayErrorMessage(res.status));
      }
      const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
      const code = body?.code ?? (res.status === 400 ? "BAD_REQUEST" : "INTERNAL_ERROR");
      const raw = body?.error ?? gatewayErrorMessage(res.status);
      throw new Error(translateApiError(code, raw));
    }
    return res;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Waktu habis — server API lambat merespons. Coba sekali lagi.");
    }
    if (err instanceof TypeError && /fetch|network/i.test(err.message)) {
      throw new Error("Tidak bisa terhubung ke server API. Periksa koneksi internetmu.");
    }
    throw err;
  } finally {
    window.clearTimeout(timer);
  }
}

/* ─────────────────────────────────────────────
 * TTS — POST /tts/synthesize → audio Blob
 * ───────────────────────────────────────────── */

export interface TtsOptions {
  /** Id suara dari GET /tts/voices. Default: auto (mengikuti bahasa). */
  voice?: string;
  /** mp3 (default) | wav | ogg */
  format?: "mp3" | "wav" | "ogg";
  /** Ucapkan terjemahan teks (mis. teks Indonesia → audio Jepang). */
  translate?: boolean;
  timeoutMs?: number;
}

/** Buat audio dari teks. Mengembalikan Blob yang bisa diputar langsung. */
export async function synthesizeTts(text: string, opts: TtsOptions = {}): Promise<Blob> {
  const { voice, format = "mp3", translate = false, timeoutMs = 20_000 } = opts;
  const res = await apiFetch(
    "/tts/synthesize",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice, format, translate }),
    },
    timeoutMs,
  );
  const blob = await res.blob();
  if (blob.size === 0) throw new Error("Server tidak mengembalikan audio.");
  return blob;
}

/* ─────────────────────────────────────────────
 * STT — POST /stt/transcribe (multipart)
 * ───────────────────────────────────────────── */

export interface SttOptions {
  /** Kode bahasa yang diucapkan. Default: "ja". */
  language?: string;
  /** Juga terjemahkan hasil transkrip (true, atau kode bahasa target). */
  translate?: boolean | string;
  timeoutMs?: number;
}

export interface SttResult {
  text: string;
  translation?: string | null;
  sourceLanguage?: string;
  targetLanguage?: string;
}

/** Kirim blob audio (MediaRecorder) ke endpoint transcribe. */
export async function transcribeStt(blob: Blob, opts: SttOptions = {}): Promise<SttResult> {
  const { language = "ja", translate = false, timeoutMs = 45_000 } = opts;

  const form = new FormData();
  form.append("file", blob, "rekaman.webm");
  form.append("language", language);
  if (translate) {
    form.append("translate", typeof translate === "string" ? translate : "true");
  }

  const res = await apiFetch(
    "/stt/transcribe",
    { method: "POST", body: form }, // Content-Type diset browser otomatis (boundary)
    timeoutMs,
  );
  const data = (await res.json()) as {
    text?: string;
    translation?: string | null;
    sourceLanguage?: string;
    targetLanguage?: string;
  };
  const text = String(data.text ?? "").trim();
  if (!text) throw new Error("Server tidak mengembalikan teks transkrip.");
  return { text, translation: data.translation, sourceLanguage: data.sourceLanguage, targetLanguage: data.targetLanguage };
}

/* ─────────────────────────────────────────────
 * Translate — POST /translate
 * ───────────────────────────────────────────── */

export interface TranslateOptions {
  from?: string; // "auto" (default) atau kode bahasa
  to?: string; // "auto" (default) — id→ja, ja→id, lainnya→id
  timeoutMs?: number;
}

/** Terjemahkan teks. `auto` mengikuti arah baku: ja↔id. */
export async function translateText(
  text: string,
  opts: TranslateOptions = {},
): Promise<{ translation: string }> {
  const { from = "auto", to = "auto", timeoutMs = 15_000 } = opts;
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Teks kosong — tidak ada yang diterjemahkan.");

  const res = await apiFetch(
    "/translate",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: trimmed, from, to }),
    },
    timeoutMs,
  );
  const data = (await res.json()) as { translation?: string };
  const translation = String(data.translation ?? "").trim();
  if (!translation) throw new Error("Server tidak mengembalikan terjemahan.");
  return { translation };
}

/* ─────────────────────────────────────────────
 * AI Sensei — POST /sensei/chat
 * ───────────────────────────────────────────── */

/** Format history sesuai API: roles `user`|`model`, `parts` berupa string. */
export interface SenseiHistoryItem {
  role: "user" | "model";
  parts: string;
}

/** Kirim pesan chat ke AI Sensei (balasan pendek gaya tutor, bahasa Jepang).
 *  Catatan: latensi Gemini di server bisa >30 detik — default 90 detik. */
export async function senseiChat(
  message: string,
  history: SenseiHistoryItem[] = [],
  timeoutMs = 90_000,
): Promise<{ response: string }> {
  const res = await apiFetch(
    "/sensei/chat",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history: history.slice(-20) }),
    },
    timeoutMs,
  );
  const data = (await res.json()) as { response?: string };
  const response = String(data.response ?? "").trim();
  if (!response) throw new Error("Sensei tidak mengembalikan balasan. Coba lagi.");
  return { response };
}

/* ─────────────────────────────────────────────
 * Live config — GET /sensei/live/config (tanpa auth)
 * Dipakai /m/sensei untuk daftar voice & suara bawaan.
 * ───────────────────────────────────────────── */

export interface LiveVoice {
  id: string;
  name?: string;
  /** Karakter suara, mis. "Breezy", "Firm", "Upbeat". */
  description?: string;
}

/** Ambil konfigurasi live (model, daftar suara prebuilt, suara bawaan). */
export async function getLiveConfig(timeoutMs = 10_000): Promise<{ model?: string; defaultVoice?: string; voices: LiveVoice[] }> {
  const res = await apiFetch("/sensei/live/config", {}, timeoutMs);
  const data = (await res.json()) as { model?: string; defaultVoice?: string; voices?: LiveVoice[] };
  return { model: data.model, defaultVoice: data.defaultVoice, voices: Array.isArray(data.voices) ? data.voices : [] };
}


