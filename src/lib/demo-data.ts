// ═══════════════════════════════════════════════════════════════
// DATA DEMO — PROTOTIPE (sementara)
// ═══════════════════════════════════════════════════════════════
// Aplikasi ini saat ini adalah PROTOTIPE tanpa backend/auth.
// Semua data di file ini adalah dummy yang deterministik (tanpa Math.random
// saat render) dan hanya ada untuk keperluan demo/presentasi.
//
// Saat integrasi backend (Supabase) dimulai lagi: hapus file ini,
// demo-session.tsx, dan halaman /masuk — lalu hubungkan ulang halaman ke DB.

export type Role = "murid" | "guru" | "admin";

export interface DemoProfile {
  id: string;
  role: Role;
  full_name: string;
  email: string;
  avatar_url: string | null;
  school_id: string | null;
  class_code: string | null;
  nis: string | null;
}

export interface DemoSchool {
  id: string;
  name: string;
  npsn: string;
}

export interface DemoClass {
  id: string;
  name: string;
  code: string;
  school_id: string;
  teacher_id: string | null;
}

export interface DemoTeacher {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  status: "aktif" | "nonaktif";
}

export interface DemoStudent {
  id: string;
  full_name: string;
  email: string;
  nis: string;
  class_code: string;
  joinedAt: string; // ISO date
}

export interface DemoTask {
  id: string;
  school_id: string;
  teacher_id: string;
  class_code: string;
  title: string;
  type: "flashcard" | "kuis";
  level: string;
  category: string;
  target: number;
  duration: number;
  deadline: string; // YYYY-MM-DD
  created_at: string;
}

export interface DemoQuiz {
  id: string;
  school_id: string;
  teacher_id: string;
  title: string;
  level: string;
  passing_grade: number;
  class_code: string;
  words: { kanji: string; furigana: string; arti: string; level: string }[];
  published_at: string;
}

export interface DemoAttempt {
  id: string;
  student_id: string;
  school_id: string;
  quiz_id: string | null;
  score: number; // 0–100
  correct_count: number;
  total_questions: number;
  total_xp: number;
  submitted_at: string; // ISO
}

/* ─────────────────────────────────────────────
 * Sekolah & akun demo
 * ───────────────────────────────────────────── */

export const DEMO_SCHOOL: DemoSchool = {
  id: "demo-school-001",
  name: "SMK Texar",
  npsn: "20219876",
};

export const DEMO_PROFILES: Record<Role, DemoProfile> = {
  murid: {
    id: "demo-murid-001",
    role: "murid",
    full_name: "Ahmad Fauzi",
    email: "murid@demo.id",
    avatar_url: null,
    school_id: DEMO_SCHOOL.id,
    class_code: "XII-RPL-1-a3f",
    nis: "2024001",
  },
  guru: {
    id: "demo-guru-001",
    role: "guru",
    full_name: "Bu Siti Rahma",
    email: "guru@demo.id",
    avatar_url: null,
    school_id: DEMO_SCHOOL.id,
    class_code: null,
    nis: null,
  },
  admin: {
    id: "demo-admin-001",
    role: "admin",
    full_name: "Budi Santoso",
    email: "admin@demo.id",
    avatar_url: null,
    school_id: DEMO_SCHOOL.id,
    class_code: null,
    nis: null,
  },
};

export const DEMO_ACCOUNT_LIST: {
  role: Role;
  label: string;
  sub: string;
  accent: string;
}[] = [
  { role: "murid", label: "Ahmad Fauzi", sub: "Murid · XII RPL 1", accent: "bg-indigo" },
  { role: "guru", label: "Bu Siti Rahma", sub: "Guru Bahasa Jepang", accent: "bg-vermillion" },
  { role: "admin", label: "Budi Santoso", sub: "Admin SMK Texar", accent: "bg-gold" },
];

/* ─────────────────────────────────────────────
 * Guru & kelas
 * ───────────────────────────────────────────── */

export const DEMO_TEACHERS: DemoTeacher[] = [
  { id: "demo-guru-001", full_name: "Bu Siti Rahma", email: "siti.rahma@texar.sch.id", avatar_url: null, status: "aktif" },
  { id: "demo-guru-002", full_name: "Pak Dedi Kurniawan", email: "dedi.k@texar.sch.id", avatar_url: null, status: "aktif" },
  { id: "demo-guru-003", full_name: "Bu Maya Anggraini", email: "maya.a@texar.sch.id", avatar_url: null, status: "nonaktif" },
];

export const DEMO_CLASSES: DemoClass[] = [
  { id: "cls-1", name: "XII RPL 1", code: "XII-RPL-1-a3f", school_id: DEMO_SCHOOL.id, teacher_id: "demo-guru-001" },
  { id: "cls-2", name: "XII RPL 2", code: "XII-RPL-2-b7k", school_id: DEMO_SCHOOL.id, teacher_id: "demo-guru-001" },
  { id: "cls-3", name: "XI TKJ 1", code: "XI-TKJ-1-c9m", school_id: DEMO_SCHOOL.id, teacher_id: "demo-guru-002" },
];

/* ─────────────────────────────────────────────
 * Murid
 * ───────────────────────────────────────────── */

const STUDENT_NAMES = [
  "Ahmad Fauzi", "Siti Nurhaliza", "Budi Pratama", "Dewi Lestari",
  "Rizky Ramadhan", "Putri Ayu", "Fajar Nugroho", "Rina Wulandari",
  "Agus Setiawan", "Sari Puspita", "Dimas Prasetyo", "Nadia Safitri",
];

export const DEMO_STUDENTS: DemoStudent[] = STUDENT_NAMES.map((name, i) => ({
  id: `stu-${String(i + 1).padStart(3, "0")}`,
  full_name: name,
  email: `${name.toLowerCase().replace(/\s+/g, ".")}@texar.sch.id`,
  nis: `2024${String(i + 1).padStart(3, "0")}`,
  class_code:
    i < 5 ? "XII-RPL-1-a3f" : i < 8 ? "XII-RPL-2-b7k" : "XI-TKJ-1-c9m",
  joinedAt: `2026-07-${String(((i * 2) % 27) + 1).padStart(2, "0")}`,
}));

/* ─────────────────────────────────────────────
 * Tugas & kuis guru
 * ───────────────────────────────────────────── */

function futureDay(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export const DEMO_TASKS: DemoTask[] = [
  {
    id: "task-1",
    school_id: DEMO_SCHOOL.id,
    teacher_id: "demo-guru-001",
    class_code: "XII-RPL-1-a3f",
    title: "Hafalan 20 Kata Kerja N5",
    type: "flashcard",
    level: "N5",
    category: "Kata Kerja",
    target: 20,
    duration: 15,
    deadline: futureDay(5),
    created_at: futureDay(-3),
  },
  {
    id: "task-2",
    school_id: DEMO_SCHOOL.id,
    teacher_id: "demo-guru-001",
    class_code: "XII-RPL-2-b7k",
    title: "Kuis Partikel Dasar",
    type: "kuis",
    level: "N5",
    category: "Partikel",
    target: 10,
    duration: 10,
    deadline: futureDay(9),
    created_at: futureDay(-1),
  },
];

export const DEMO_QUIZZES: DemoQuiz[] = [
  {
    id: "quiz-1",
    school_id: DEMO_SCHOOL.id,
    teacher_id: "demo-guru-001",
    title: "Kuis Kata Kerja Bab 3",
    level: "N5",
    passing_grade: 75,
    class_code: "XII-RPL-1-a3f",
    words: [
      { kanji: "食べる", furigana: "たべる", arti: "Makan", level: "N5" },
      { kanji: "飲む", furigana: "のむ", arti: "Minum", level: "N5" },
      { kanji: "行く", furigana: "いく", arti: "Pergi", level: "N5" },
      { kanji: "買う", furigana: "かう", arti: "Membeli", level: "N5" },
    ],
    published_at: futureDay(-4),
  },
];

/* ─────────────────────────────────────────────
 * Riwayat kuis (quiz_attempts)
 * ─────────────────────────────────────────────
 * Deterministik: pola skor berulang per indeks murid.
 * Murid #1 (Ahmad Fauzi) memakai id akun demo "demo-murid-001" agar
 * halaman murid bisa menampilkan riwayat kuis milik akun demo. */

const SCORE_PATTERN = [88, 72, 65, 91, 55, 80, 95, 60, 78, 84, 70, 92];
const ATTEMPT_COUNT_PATTERN = [5, 3, 2, 6, 1, 4, 7, 2, 3, 5, 2, 6];

export const DEMO_ATTEMPTS: DemoAttempt[] = DEMO_STUDENTS.flatMap((s, i) => {
  const count = ATTEMPT_COUNT_PATTERN[i % ATTEMPT_COUNT_PATTERN.length];
  return Array.from({ length: count }, (_, j) => {
    const score = (SCORE_PATTERN[(i + j) % SCORE_PATTERN.length] + j * 3) % 100;
    const total = 10;
    const correct = Math.round((score / 100) * total);
    return {
      id: `att-${s.id}-${j + 1}`,
      student_id: s.id === "stu-001" ? DEMO_PROFILES.murid.id : s.id,
      school_id: DEMO_SCHOOL.id,
      quiz_id: null,
      score,
      correct_count: correct,
      total_questions: total,
      total_xp: correct * 10,
      submitted_at: new Date(
        Date.now() - (j * 3 + i) * 86_400_000,
      ).toISOString(),
    };
  });
});

/* ─────────────────────────────────────────────
 * Helper akses data
 * ───────────────────────────────────────────── */

export function getDemoProfile(role: Role): DemoProfile {
  return DEMO_PROFILES[role];
}

export function getDemoStudentsByClass(code: string): DemoStudent[] {
  return DEMO_STUDENTS.filter((s) => s.class_code === code);
}

export function getDemoClassesByTeacher(teacherId: string): DemoClass[] {
  return DEMO_CLASSES.filter((c) => c.teacher_id === teacherId);
}

export function getDemoClassName(code: string): string {
  return DEMO_CLASSES.find((c) => c.code === code)?.name ?? code;
}

export function getDemoAttemptsByStudent(studentId: string): DemoAttempt[] {
  return DEMO_ATTEMPTS.filter((a) => a.student_id === studentId);
}
