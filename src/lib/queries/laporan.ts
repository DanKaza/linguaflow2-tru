// Laporan sekolah — MODE PROTOTIPE.
// Dulu: agregasi dari Supabase (profiles/classes/quiz_attempts).
// Sekarang: agregasi dari data demo (src/lib/demo-data.ts) supaya
// bentuk interface SchoolReport tetap sama dan halaman tidak berubah.

import {
  DEMO_ATTEMPTS,
  DEMO_CLASSES,
  DEMO_STUDENTS,
} from "@/lib/demo-data";

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
  /** Selalu true di mode demo — konsep "tabel belum dibuat" tidak berlaku lagi. */
  attemptsTableReady: boolean;
  classes: ClassReport[];
  students: StudentReport[];
}

export async function getSchoolReport(
  _schoolId: string,
): Promise<SchoolReport> {
  const classMap = new Map(DEMO_CLASSES.map((c) => [c.code, c.name]));

  /* ── Agregasi attempt per murid ──
   * Rata-rata ditimbang jumlah soal, sama seperti implementasi lama. */
  const aggByStudent = new Map<
    string,
    { attempts: number; weightedSum: number; totalQuestions: number; last: string | null }
  >();
  for (const a of DEMO_ATTEMPTS) {
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

  const studentRows: StudentReport[] = DEMO_STUDENTS.map((s) => {
    const agg = aggByStudent.get(s.id);
    return {
      id: s.id,
      full_name: s.full_name,
      class_name: classMap.get(s.class_code) ?? null,
      attempts: agg?.attempts ?? 0,
      avgScore:
        agg && agg.totalQuestions > 0
          ? Math.round(agg.weightedSum / agg.totalQuestions)
          : null,
      lastSubmittedAt: agg?.last ?? null,
    };
  });

  /* ── Agregasi per kelas ── */
  const classRows: ClassReport[] = DEMO_CLASSES.map((c) => {
    const members = studentRows.filter((s) => s.class_name === c.name);
    const attemptsCount = members.reduce((sum, m) => sum + m.attempts, 0);
    const active = members.filter((m) => m.attempts > 0).length;
    const memberIds = new Set(members.map((m) => m.id));
    let weightedSum = 0;
    let totalQuestions = 0;
    for (const a of DEMO_ATTEMPTS) {
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

  /* ── Ringkasan sekolah ── */
  const totalStudents = studentRows.length;
  const totalAttempts = DEMO_ATTEMPTS.length;
  const activeStudents = studentRows.filter((s) => s.attempts > 0).length;
  let schoolWeightedSum = 0;
  let schoolTotalQuestions = 0;
  for (const a of DEMO_ATTEMPTS) {
    const questions = Math.max(1, a.total_questions);
    schoolWeightedSum += a.score * questions;
    schoolTotalQuestions += questions;
  }
  const avgScore =
    schoolTotalQuestions > 0
      ? Math.round(schoolWeightedSum / schoolTotalQuestions)
      : null;

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
    completionPct:
      totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0,
    attemptsTableReady: true,
    classes: classRows,
    students: studentRows,
  };
}
