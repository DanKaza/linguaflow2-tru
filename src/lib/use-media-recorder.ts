"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderStatus = "idle" | "recording" | "stopped" | "error";

export interface RecorderController {
  status: RecorderStatus;
  blob: Blob | null;
  /** Durasi rekaman dalam detik (perkiraan). */
  seconds: number;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

/** Batas rekaman otomatis — cukup untuk kalimat pendek & mencegah file besar. */
const MAX_SECONDS = 15;

/** Pilih MIME yang didukung browser, prioritas webm/opus (diterima server). */
function pickMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

function friendlyMicError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError")
    return "Akses mikrofon ditolak. Izinkan mikrofon di browser, lalu coba lagi.";
  if (name === "NotFoundError")
    return "Mikrofon tidak ditemukan. Pastikan perangkat audio tersambung.";
  if (name === "NotReadableError")
    return "Mikrofon sedang dipakai aplikasi lain. Tutup dulu, lalu coba lagi.";
  return "Gagal mengakses mikrofon. Coba lagi.";
}

/** Hook perekaman suara via MediaRecorder + getUserMedia. */
export function useMediaRecorder(): RecorderController {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  /** true setelah onstop/onerror — mencegah double-stop menimpa status. */
  const finishedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cleanupTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const stop = useCallback(() => {
    clearTimer();
    const rec = mediaRef.current;
    if (rec && rec.state !== "inactive") {
      rec.stop(); // onstop akan men-set blob + status "stopped"
    } else if (!finishedRef.current) {
      // Recorder belum pernah berjalan / sudah inactive sebelum onstop.
      cleanupTracks();
      setStatus("idle");
    }
    // Jika sudah selesai (finishedRef), jangan timpa status "stopped"/"error".
  }, [clearTimer, cleanupTracks]);

  const start = useCallback(async () => {
    setError(null);
    setBlob(null);
    setSeconds(0);
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        throw new Error("Browser ini tidak mendukung perekaman suara.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = pickMimeType();
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRef.current = rec;

      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      rec.onstop = () => {
        finishedRef.current = true;
        const b = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        setBlob(b);
        setStatus("stopped");
        cleanupTracks();
        clearTimer();
      };

      rec.onerror = () => {
        finishedRef.current = true;
        setError("Perekaman gagal. Coba lagi.");
        setStatus("error");
        cleanupTracks();
        clearTimer();
      };

      finishedRef.current = false;
      rec.start();
      startedAtRef.current = Date.now();
      setStatus("recording");
      timerRef.current = window.setInterval(() => {
        const el = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setSeconds(el);
        if (el >= MAX_SECONDS) stop();
      }, 250);
    } catch (err) {
      cleanupTracks();
      setError(friendlyMicError(err));
      setStatus("error");
    }
  }, [cleanupTracks, stop, clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    cleanupTracks();
    mediaRef.current = null;
    chunksRef.current = [];
    finishedRef.current = false;
    setBlob(null);
    setSeconds(0);
    setError(null);
    setStatus("idle");
  }, [clearTimer, cleanupTracks]);

  // Bersihkan saat komponen unmount.
  useEffect(
    () => () => {
      clearTimer();
      cleanupTracks();
    },
    [clearTimer, cleanupTracks],
  );

  return { status, blob, seconds, error, start, stop, reset };
}
