// Client-side school data store (no backend).
// Single source of truth that links the teacher app and the student app.
// Persists to localStorage. Starts empty — data asli datang dari database.

import { useLocalStorage } from "@/lib/use-local-storage";
import { dayKey } from "@/lib/progress";

export type TaskType = "flashcard" | "kuis";

export interface SchoolTask {
  id: string;
  title: string;
  type: TaskType;
  classId: string; // matches g/kelas/[id] slug
  className: string;
  level: string; // N5 / N4 / N3
  category: string;
  target: number; // jumlah soal
  duration: number; // menit
  deadline: string; // YYYY-MM-DD
  createdAt: string; // YYYY-MM-DD
  teacher: string;
}

export interface SchoolQuiz {
  id: string;
  title: string;
  level: string;
  passingGrade: number;
  words: { kanji: string; furigana: string; arti: string; level: string }[];
  classId: string;
  className: string;
  teacher: string;
  publishedAt: string;
}

export interface Submission {
  id: string;
  taskId: string;
  taskTitle: string;
  studentName: string;
  studentNis: string;
  classId: string;
  type: TaskType;
  score: number | null; // null = belum dinilai
  turnedInAt: string;
  note?: string; // feedback dari guru
}

export interface SchoolState {
  tasks: SchoolTask[];
  quizzes: SchoolQuiz[];
  submissions: Submission[];
}

// Seed kosong — tidak ada data dummy. Tugas/kuis/submission asli akan diisi
// dari database (Supabase) ketika integrasi backend selesai.
const SEED: SchoolState = {
  tasks: [],
  quizzes: [],
  submissions: [],
};

export function useSchool() {
  return useLocalStorage<SchoolState>("lf-school", SEED);
}

/** Tasks still open (deadline >= today) assigned to a class. */
export function openTasksForClass(state: SchoolState, classId: string): SchoolTask[] {
  const today = dayKey();
  return state.tasks
    .filter((t) => t.classId === classId && t.deadline >= today)
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
}

/** Submissions not yet graded for a class. */
export function pendingSubmissions(state: SchoolState, classId: string): Submission[] {
  return state.submissions.filter((s) => s.classId === classId && s.score === null);
}

/** All submissions for a class. */
export function submissionsForClass(state: SchoolState, classId: string): Submission[] {
  return state.submissions.filter((s) => s.classId === classId);
}
