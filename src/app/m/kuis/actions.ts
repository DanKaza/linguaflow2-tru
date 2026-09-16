"use client";

// Mode prototipe: hasil kuis tidak dikirim ke server.
// Dulu: Server Action yang INSERT ke tabel `quiz_attempts` (Supabase).
// Sekarang: disimpan sementara di localStorage agar data demo tetap hidup.

import { getDemoAttemptsByStudent } from "@/lib/demo-data";

export interface QuizAttemptInput {
  score: number;
  correctCount: number;
  total: number;
  totalXP: number;
}

const STORAGE_KEY = "lf-demo-attempts";

/**
 * Rekam hasil kuis murid (demo, non-blocking).
 * Kelemahan yang disengaja dibanding versi Supabase: data hanya hidup
 * di perangkat ini. Dipanggil fire-and-forget dari halaman kuis.
 */
export async function recordQuizAttempt(input: QuizAttemptInput) {
  const total = Math.max(1, Math.round(Number(input.total) || 0));
  const score = Math.max(0, Math.min(100, Math.round(Number(input.score) || 0)));
  const correctCount = Math.min(
    total,
    Math.max(0, Math.round(Number(input.correctCount) || 0)),
  );
  const totalXP = Math.max(0, Math.round(Number(input.totalXP) || 0));

  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as {
      score: number;
      correct_count: number;
      total_questions: number;
      total_xp: number;
      submitted_at: string;
    }[];

    existing.push({
      score,
      correct_count: correctCount,
      total_questions: total,
      total_xp: totalXP,
      submitted_at: new Date().toISOString(),
    });

    // Simpan maksimal 50 attempt terakhir supaya storage tidak membengkak.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(-50)));
  } catch {
    /* localStorage tidak tersedia — abaikan (fire-and-forget) */
  }

  return { error: null };
}

/** Riwayat attempt demo milik murid (data statis + yang baru direkam lokal). */
export function getMyAttempts() {
  let local: { score: number; submitted_at: string }[] = [];
  try {
    local = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    /* ignore */
  }
  return [...getDemoAttemptsByStudent("demo-murid-001"), ...local];
}
