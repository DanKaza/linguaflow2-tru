"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Generate kode kelas unik dari nama kelas.
 * Contoh: "XII RPL 1" → "XII-RPL-1-a3f"
 */
function generateClassCode(name: string): string {
  const base = name
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9-]/g, "");
  const suffix = Math.random().toString(36).substring(2, 5);
  return `${base}-${suffix}`;
}

export interface ClassFormData {
  name: string;
  teacher_id: string;
}

/**
 * Buat kelas baru.
 */
export async function createClass(formData: FormData) {
  const name = formData.get("name") as string;
  const teacherId = formData.get("teacher_id") as string;

  if (!name) return { error: "Nama kelas harus diisi." };

  const supabase = await createClient();

  // Dapatkan school_id admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.school_id) return { error: "Sekolah belum dikonfigurasi." };

  // Generate kode unik
  let code = generateClassCode(name);
  let attempts = 0;
  while (attempts < 5) {
    const { data: existing } = await supabase
      .from("classes")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (!existing) break;
    code = generateClassCode(name); // regenerasi
    attempts++;
  }

  const { error } = await supabase.from("classes").insert({
    school_id: profile.school_id,
    name,
    code,
    teacher_id: teacherId || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/a/kelas");
  return { error: null, code };
}

/**
 * Update kelas (nama, wali kelas).
 */
export async function updateClass(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const teacherId = formData.get("teacher_id") as string;

  if (!id || !name) return { error: "ID dan nama kelas harus diisi." };

  const supabase = await createClient();

  const { error } = await supabase
    .from("classes")
    .update({ name, teacher_id: teacherId || null })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/a/kelas");
  return { error: null };
}

/**
 * Hapus kelas + bersihkan class_code murid yang merujuk ke kelas ini.
 */
export async function deleteClass(formData: FormData) {
  const id = formData.get("id") as string;
  const code = formData.get("code") as string;
  if (!id) return { error: "ID kelas tidak ditemukan." };

  const supabase = await createClient();

  // Hapus kelas dulu
  const { error } = await supabase.from("classes").delete().eq("id", id);
  if (error) return { error: error.message };

  // Setelah berhasil hapus, bersihkan class_code murid
  if (code) {
    await supabase
      .from("profiles")
      .update({ class_code: null })
      .eq("class_code", code);
  }

  revalidatePath("/a/kelas");
  return { error: null };
}
