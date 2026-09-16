// Data dashboard admin — MODE PROTOTIPE.
// Dulu: agregasi dari Supabase. Sekarang: agregasi dari data demo
// (src/lib/demo-data.ts) supaya bentuk interface tetap sama.

import {
  DEMO_ATTEMPTS,
  DEMO_CLASSES,
  DEMO_SCHOOL,
  DEMO_STUDENTS,
  DEMO_TEACHERS,
  type DemoAttempt,
} from "@/lib/demo-data";

export interface DashboardStats {
  total_murid: number;
  total_guru: number;
  total_kelas: number;
  topClasses: { name: string; student_count: number }[];
  topTeachers: { id: string; full_name: string; class_count: number }[];
}

export interface ActivityData {
  activeToday: number;
  activeTodayPercent: number;
  growthDays: { day: number; users: number }[];
  totalUsers: number;
}

export async function getDashboardStats(
  _schoolId: string,
): Promise<DashboardStats> {
  /* ─── Kelas dengan murid terbanyak ─── */
  const classCount = new Map<string, number>();
  DEMO_STUDENTS.forEach((s) => {
    classCount.set(s.class_code, (classCount.get(s.class_code) || 0) + 1);
  });
  const topClasses = [...classCount.entries()]
    .map(([code, c]) => ({ name: code, student_count: c }))
    .map((x) => ({ ...x, name: DEMO_CLASSES.find((c) => c.code === x.name)?.name ?? x.name }))
    .sort((a, b) => b.student_count - a.student_count)
    .slice(0, 5);

  /* ─── Guru dengan kelas terbanyak ─── */
  const teacherCount = new Map<string, number>();
  DEMO_CLASSES.forEach((c) => {
    if (c.teacher_id)
      teacherCount.set(c.teacher_id, (teacherCount.get(c.teacher_id) || 0) + 1);
  });

  const topTeachers = [...teacherCount.entries()]
    .map(([id, count]) => ({
      id,
      full_name: DEMO_TEACHERS.find((t) => t.id === id)?.full_name ?? "Guru",
      class_count: count,
    }))
    .sort((a, b) => b.class_count - a.class_count)
    .slice(0, 5);

  return {
    total_murid: DEMO_STUDENTS.length,
    total_guru: DEMO_TEACHERS.length,
    total_kelas: DEMO_CLASSES.length,
    topClasses,
    topTeachers,
  };
}

/**
 * Data aktivitas demo: user aktif "hari ini" + pertumbuhan 30 hari.
 * Pola deterministik supaya tampilan konsisten antar render.
 */
export async function getActivityData(
  _schoolId: string,
): Promise<ActivityData> {
  const totalUsers = DEMO_STUDENTS.length + DEMO_TEACHERS.length;

  /* ── Aktif hari ini (dari submitted_at attempts) ── */
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const activeIds = new Set(
    DEMO_ATTEMPTS.filter(
      (a) => new Date(a.submitted_at) >= todayStart,
    ).map((a) => a.student_id),
  );
  const activeToday = activeIds.size;

  /* ── Pertumbuhan 30 hari (dari tanggal bergabung murid) ── */
  const now = new Date();
  const growthDays: { day: number; users: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 86_400_000);
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(dayStart.getTime() + 86_400_000);

    const count = DEMO_STUDENTS.filter((s) => {
      const joined = new Date(s.joinedAt + "T00:00:00");
      return joined >= dayStart && joined < dayEnd;
    }).length;

    growthDays.push({ day: date.getDate(), users: count });
  }

  return {
    activeToday,
    activeTodayPercent:
      totalUsers > 0 ? Math.round((activeToday / totalUsers) * 100) : 0,
    growthDays,
    totalUsers,
  };
}

/** Dipakai halaman laporan — agregasi attempt per murid (demo). */
export function summarizeAttempts(attempts: DemoAttempt[]) {
  const totalAttempts = attempts.length;
  let weightedSum = 0;
  let totalQuestions = 0;
  for (const a of attempts) {
    const q = Math.max(1, a.total_questions);
    weightedSum += a.score * q;
    totalQuestions += q;
  }
  return {
    totalAttempts,
    avgScore:
      totalQuestions > 0 ? Math.round(weightedSum / totalQuestions) : null,
  };
}

export { DEMO_SCHOOL };
