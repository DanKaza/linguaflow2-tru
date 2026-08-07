"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createTask(formData: FormData) {
  const classCode = formData.get("class_code") as string;
  const title = formData.get("title") as string;
  const type = formData.get("type") as string;
  const level = formData.get("level") as string;
  const category = formData.get("category") as string;
  const target = formData.get("target") as string;
  const duration = formData.get("duration") as string;
  const deadline = formData.get("deadline") as string;

  if (!classCode || !title || !type || !deadline) {
    return { error: "Kelas, judul, jenis, dan deadline harus diisi." };
  }

  if (!["flashcard", "kuis"].includes(type)) {
    return { error: "Jenis tugas tidak valid." };
  }

  const supabase = await createClient();

  // Dapatkan user & school_id
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.school_id) return { error: "Sekolah belum dikonfigurasi." };

  const { error } = await supabase.from("tasks").insert({
    school_id: profile.school_id,
    teacher_id: user.id,
    class_code: classCode,
    title,
    type,
    level: level || "N5",
    category: category || "",
    target: Number(target) || 10,
    duration: Number(duration) || 15,
    deadline,
  });

  if (error) return { error: error.message };

  revalidatePath("/g/tugas");
  revalidatePath("/g/dashboard");
  return { error: null };
}
