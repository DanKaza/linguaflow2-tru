"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface QuizWordInput {
  kanji: string;
  furigana?: string;
  arti: string;
  level?: string;
}

export async function publishQuiz(formData: FormData) {
  const title = formData.get("title") as string;
  const level = formData.get("level") as string;
  const passingGrade = formData.get("passing_grade") as string;
  const classCode = formData.get("class_code") as string;
  const wordsJson = formData.get("words") as string;

  if (!title || !classCode) {
    return { error: "Judul dan kelas harus diisi." };
  }

  let words: QuizWordInput[];
  try {
    words = JSON.parse(wordsJson);
  } catch {
    return { error: "Data soal tidak valid." };
  }

  if (!Array.isArray(words) || words.length === 0) {
    return { error: "Minimal 1 soal harus dipilih." };
  }

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.school_id) return { error: "Sekolah belum dikonfigurasi." };

  // Insert quiz
  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .insert({
      school_id: profile.school_id,
      teacher_id: user.id,
      title,
      level: level || "N5",
      passing_grade: Number(passingGrade) || 75,
      class_code: classCode,
      published_at: new Date().toISOString().slice(0, 10),
    })
    .select("id")
    .single();

  if (quizError) return { error: quizError.message };
  if (!quiz) return { error: "Gagal membuat kuis." };

  // Insert quiz words
  const wordRows = words.map((w, i) => ({
    quiz_id: quiz.id,
    kanji: w.kanji,
    furigana: w.furigana || null,
    arti: w.arti,
    level: w.level || level || "N5",
    sort_order: i,
  }));

  const { error: wordsError } = await supabase
    .from("quiz_words")
    .insert(wordRows);

  if (wordsError) {
    // Hapus quiz jika insert kata gagal
    await supabase.from("quizzes").delete().eq("id", quiz.id);
    return { error: wordsError.message };
  }

  revalidatePath("/g/kuis");
  revalidatePath("/g/dashboard");
  return { error: null };
}
