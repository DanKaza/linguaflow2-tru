"use server";

import { createClient } from "@/lib/supabase/server";

export interface QuizAttemptInput {
  score: number;
  correctCount: number;
  total: number;
  totalXP: number;
}

/**
 * Rekam hasil kuis murid ke tabel `quiz_attempts` — sumber data
 * Laporan Sekolah (admin) dan laporan guru.
 *
 * Dipanggil non-blocking (fire-and-forget) dari halaman kuis; kegagalan
 * tidak memblokir navigasi murid ke halaman review.
 *
 * Keamanan: RLS memastikan murid hanya bisa menambah attempt dengan
 * student_id = auth.uid(); nilai divalidasi & dibatasi di sini.
 */
export async function recordQuizAttempt(input: QuizAttemptInput) {
  const total = Math.max(1, Math.round(Number(input.total) || 0));
  const score = Math.max(0, Math.min(100, Math.round(Number(input.score) || 0)));
  const correctCount = Math.min(
    total,
    Math.max(0, Math.round(Number(input.correctCount) || 0)),
  );
  const totalXP = Math.max(0, Math.round(Number(input.totalXP) || 0));

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "murid") {
    return { error: "Hanya akun murid yang bisa merekam pengerjaan kuis." };
  }

  const { error } = await supabase.from("quiz_attempts").insert({
    student_id: user.id,
    school_id: profile.school_id ?? null,
    quiz_id: null, // kuis harian (soal acak dari vocab bank)
    score,
    correct_count: correctCount,
    total_questions: total,
    total_xp: totalXP,
  });

  if (error) {
    // Kegagalan umum: tabel belum dibuat (migrasi 001 belum dijalankan).
    console.error("Gagal merekam attempt kuis:", error.message);
    return { error: error.message };
  }

  return { error: null };
}
