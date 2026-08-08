import { createClient } from "@/lib/supabase/server";

export interface ClassReport {
  name: string;
  studentCount: number;
  attempts: number;
  avgScore: number | null;
  completionPct: number;
}

export interface StudentReport {
  id: string;
  full_name: string;
  class_name: string | null;
  attempts: number;
  avgScore: number | null;
  lastSubmittedAt: string | null;
}

export interface SchoolReport {
  totalStudents: number;
  totalAttempts: number;
  avgScore: number | null;
  activeStudents: number;
  completionPct: number;
  /** false = tabel quiz_attempts belum dibuat (migrasi 001 belum dijalankan). */
  attemptsTableReady: boolean;
  classes: ClassReport[];
  students: StudentReport[];
}

/**
 * Ambil laporan sekolah untuk admin: statistik pengerjaan kuis murid
 * yang nyata dari tabel `quiz_attempts`, diagregasi per murid & per kelas.
 *
 * Semua agregasi dihitung di sini (bukan group-by SQL) supaya tahan
 * terhadap struktur tabel yang berubah & mudah dibaca.
 */
export async function getSchoolReport(
  schoolId: string,
): Promise<SchoolReport> {
  const supabase = await createClient();

  /* ── Murid & kelas (sumber: tabel yang sudah ada) ── */
  const [{ data: students }, { data: classes }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, class_code")
      .eq("role", "murid")
      .eq("school_id", schoolId)
      .order("full_name"),
    supabase
      .from("classes")
      .select("name, code")
      .eq("school_id", schoolId)
      .order("name"),
  ]);

  /* ── Attempts (tabel baru — mungkin belum dibuat) ── */
  let attempts: {
    student_id: string;
    score: number;
    total_questions: number;
    submitted_at: string;
  }[] = [];
  let attemptsTableReady = true;
  try {
    const { data, error } = await supabase
      .from("quiz_attempts")
      .select("student_id, score, total_questions, submitted_at")
      .eq("school_id", schoolId);
    if (error) {
      if (/does not exist|could not find.*table/i.test(error.message)) {
        attemptsTableReady = false;
      } else {
        console.error("Gagal ambil attempt kuis:", error.message);
      }
    } else {
      attempts = (data ?? []) as typeof attempts;
    }
  } catch (err) {
    attemptsTableReady = false;
    console.error("Gagal ambil attempt kuis:", err);
  }

  /* ── Agregasi per murid ──
   * Rata-rata ditimbang jumlah soal (weighted), karena attempt bisa berupa
   * kuis 10 soal (0–100) atau latihan kalimat 1 soal (0/100) — rata-rata
   * biasa akan membuat 1 kalimat salah setara dengan gagal 1 kuis penuh. */
  const classMap = new Map((classes ?? []).map((c) => [c.code, c.name]));
  const aggByStudent = new Map<
    string,
    {
      attempts: number;
      weightedSum: number;
      totalQuestions: number;
      last: string | null;
    }
  >();
  for (const a of attempts) {
    const cur = aggByStudent.get(a.student_id) ?? {
      attempts: 0,
      weightedSum: 0,
      totalQuestions: 0,
      last: null,
    };
    const questions = Math.max(1, a.total_questions);
    cur.attempts += 1;
    cur.weightedSum += a.score * questions;
    cur.totalQuestions += questions;
    if (!cur.last || a.submitted_at > cur.last) cur.last = a.submitted_at;
    aggByStudent.set(a.student_id, cur);
  }

  const studentRows: StudentReport[] = (students ?? []).map((s) => {
    const agg = aggByStudent.get(s.id);
    return {
      id: s.id,
      full_name: s.full_name,
      class_name: classMap.get(s.class_code ?? "") ?? null,
      attempts: agg?.attempts ?? 0,
      avgScore:
        agg && agg.totalQuestions > 0
          ? Math.round(agg.weightedSum / agg.totalQuestions)
          : null,
      lastSubmittedAt: agg?.last ?? null,
    };
  });

  /* ── Agregasi per kelas (tetap berbobot soal) ── */
  const classRows: ClassReport[] = (classes ?? []).map((c) => {
    const members = studentRows.filter((s) => s.class_name === c.name);
    const attemptsCount = members.reduce((sum, m) => sum + m.attempts, 0);
    const active = members.filter((m) => m.attempts > 0).length;
    // Hitung ulang bobot dari attempt mentah untuk akurasi per kelas.
    const memberIds = new Set(members.map((m) => m.id));
    let weightedSum = 0;
    let totalQuestions = 0;
    for (const a of attempts) {
      if (!memberIds.has(a.student_id)) continue;
      const questions = Math.max(1, a.total_questions);
      weightedSum += a.score * questions;
      totalQuestions += questions;
    }
    return {
      name: c.name,
      studentCount: members.length,
      attempts: attemptsCount,
      avgScore: totalQuestions > 0 ? Math.round(weightedSum / totalQuestions) : null,
      completionPct:
        members.length > 0 ? Math.round((active / members.length) * 100) : 0,
    };
  });
  classRows.sort((a, b) => b.attempts - a.attempts);

  /* ── Angka ringkasan sekolah (berbobot soal) ── */
  const totalStudents = studentRows.length;
  const totalAttempts = attempts.length;
  const activeStudents = studentRows.filter((s) => s.attempts > 0).length;
  let schoolWeightedSum = 0;
  let schoolTotalQuestions = 0;
  for (const a of attempts) {
    const questions = Math.max(1, a.total_questions);
    schoolWeightedSum += a.score * questions;
    schoolTotalQuestions += questions;
  }
  const avgScore =
    schoolTotalQuestions > 0
      ? Math.round(schoolWeightedSum / schoolTotalQuestions)
      : null;
  const completionPct =
    totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0;

  /* Paling aktif & berprestasi di atas. */
  studentRows.sort(
    (a, b) =>
      b.attempts - a.attempts || (b.avgScore ?? -1) - (a.avgScore ?? -1),
  );

  return {
    totalStudents,
    totalAttempts,
    avgScore,
    activeStudents,
    completionPct,
    attemptsTableReady,
    classes: classRows,
    students: studentRows,
  };
}
