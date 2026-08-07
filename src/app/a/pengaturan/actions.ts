"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Simpan atau buat data sekolah.
 * - Kalau sekolah sudah ada → update
 * - Kalau belum ada → create + set admin's school_id
 */
export async function saveSchoolSettings(formData: FormData) {
  const name = formData.get("name") as string;
  const npsn = formData.get("npsn") as string;
  const adminEmail = formData.get("admin_email") as string;

  if (!name) return { error: "Nama sekolah harus diisi." };

  const supabase = await createClient();

  // 1) Dapatkan user & profile admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, school_id")
    .eq("id", user.id)
    .maybeSingle();

  // 2) Cari sekolah yang sudah ada (berdasarkan school_id profile)
  let schoolId = profile?.school_id;

  if (schoolId) {
    // Update sekolah yang sudah ada
    const { error: upErr } = await supabase
      .from("schools")
      .update({ name, npsn: npsn || null, admin_id: user.id })
      .eq("id", schoolId);

    if (upErr) return { error: upErr.message };
  } else {
    // Buat sekolah baru
    const { data: newSchool, error: insertErr } = await supabase
      .from("schools")
      .insert({ name, npsn: npsn || null, admin_id: user.id })
      .select("id")
      .single();

    if (insertErr || !newSchool) {
      return { error: insertErr?.message || "Gagal membuat sekolah." };
    }

    schoolId = newSchool.id;

    // Update profile admin dengan school_id
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({ school_id: schoolId })
      .eq("id", user.id);

    if (profileErr) {
      console.error("Gagal update school_id admin:", profileErr);
    }
  }

  // 3) Update email admin di profile (jika berbeda)
  if (adminEmail && adminEmail !== user.email) {
    await supabase
      .from("profiles")
      .update({ email: adminEmail })
      .eq("id", user.id);
  }

  revalidatePath("/a/dashboard");
  revalidatePath("/a/pengaturan");
  return { error: null };
}
