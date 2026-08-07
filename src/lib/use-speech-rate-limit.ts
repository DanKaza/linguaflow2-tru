"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Anti-spam untuk API speech eksternal (server milik teman, tanpa rate limit).
 *
 * Dua lapis proteksi di sisi klien:
 *  1. Cooldown: setelah satu request selesai (sukses/gagal), user harus
 *     menunggu sebelum bisa mengirim request berikutnya.
 *  2. Kuota sesi: jumlah request per sesi browser dibatasi (sessionStorage).
 *
 * Catatan jujur: proteksi sisi klien bisa di-bypass dengan memanggil API
 * langsung. Untuk perlindungan sejati, server API-nya sendiri perlu rate
 * limit (atau lewat proxy route handler Next.js).
 */

/**
 * Development stage: batasan dilonggarkan agar ujicoba AI Sensei lancar.
 *
 * Sebelum rilis, kembalikan ke nilai produksi:
 *   REQUEST_COOLDOWN_MS      = 6000   (jeda antar request sukses)
 *   MAX_REQUESTS_PER_SESSION = 20     (kuota per sesi browser)
 *   FAIL_COOLDOWN_SECONDS    = 45     (penalti setelah request gagal)
 */

/** Jeda antar request sukses (ms) — kecil agar tidak terasa saat ujicoba. */
export const REQUEST_COOLDOWN_MS = 1500;

/** Batas request per sesi browser — sangat besar agar praktis tanpa batas. */
export const MAX_REQUESTS_PER_SESSION = 100_000;

/**
 * Jeda setelah request GAGAL (detik). Tetap diberlakukan sebagai backoff
 * ringan: TTS Google memblokir IP bila dipukul beruntun (error "Partial TTS
 * Request Fail"), jadi ini melindungi ujicoba, bukan membatasinya.
 */
export const FAIL_COOLDOWN_SECONDS = 10;

const SESSION_KEY = "lf-speech-request-count";

function readSessionCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    return Number(sessionStorage.getItem(SESSION_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

export interface SpeechRateLimit {
  /** Detik tersisa sebelum boleh mengirim request lagi (0 = boleh). */
  cooldownLeft: number;
  /** true selama masa tunggu cooldown aktif. */
  isCoolingDown: boolean;
  /** Sisa kuota request sesi ini. */
  requestsLeft: number;
  /** true jika kuota sesi sudah habis. */
  quotaExhausted: boolean;
  /**
   * Mulai hitung mundur cooldown (panggil setelah request selesai).
   * Bisa di-override durasinya — mis. penalti lebih lama setelah gagal.
   */
  startCooldown: (seconds?: number) => void;
  /** Catat satu request terkirim ke kuota sesi. */
  registerRequest: () => void;
}

/**
 * Batasi frekuensi & total request API speech per sesi browser.
 */
export function useSpeechRateLimit(
  cooldownMs = REQUEST_COOLDOWN_MS,
): SpeechRateLimit {
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [requestsLeft, setRequestsLeft] = useState(MAX_REQUESTS_PER_SESSION);
  const requestsLeftRef = useRef(requestsLeft);

  // Baca kuota sesi setelah mount — sessionStorage tidak tersedia saat render
  // server, jadi membaca di lazy initializer menyebabkan hydration mismatch.
  useEffect(() => {
    const stored = Math.max(0, MAX_REQUESTS_PER_SESSION - readSessionCount());
    requestsLeftRef.current = stored;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Pola hydration-safe: baca sessionStorage setelah mount.
    setRequestsLeft(stored);
  }, []);

  const isCoolingDown = cooldownLeft > 0;

  /* Interval berjalan hanya selama cooldown aktif. */
  useEffect(() => {
    if (!isCoolingDown) return;
    const id = window.setInterval(() => {
      setCooldownLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [isCoolingDown]);

  const startCooldown = useCallback(
    (seconds?: number) => {
      setCooldownLeft(seconds ?? Math.round(cooldownMs / 1000));
    },
    [cooldownMs],
  );

  const registerRequest = useCallback(() => {
    requestsLeftRef.current = Math.max(0, requestsLeftRef.current - 1);
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        String(MAX_REQUESTS_PER_SESSION - requestsLeftRef.current),
      );
    } catch {
      /* sessionStorage tidak tersedia (mode privat) — abaikan */
    }
    setRequestsLeft(requestsLeftRef.current);
  }, []);

  return {
    cooldownLeft,
    isCoolingDown,
    requestsLeft,
    quotaExhausted: requestsLeft <= 0,
    startCooldown,
    registerRequest,
  };
}
