"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

/** Ban duration: 100 tahun (maksimum yang didukung Supabase) — efektif permanen. */
const BAN_FOREVER = "876000h";

/**
 * Membuat guru baru via Supabase Admin API (service_role).
 * Tidak mengganggu session admin yang sedang login.
 */
export async function createTeacher(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("full_name") as string;
  const schoolId = formData.get("school_id") as string;

  if (!email || !password || !fullName) {
    return { error: "Email, password, dan nama harus diisi." };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // 1) Buat user di auth.users
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: "guru", school_id: schoolId },
    });

  if (authError) return { error: authError.message };
  if (!authData?.user) return { error: "Gagal membuat user." };

  // 2) Trigger handle_new_user sudah membuat profile.
  //    Update profile dengan data yang benar (role = guru, school_id)
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      role: "guru",
      full_name: fullName,
      school_id: schoolId || null,
    })
    .eq("id", authData.user.id);

  if (profileError) {
    console.error("Gagal update profile guru:", profileError);
  }

  revalidatePath("/a/guru");
  return { error: null };
}

/**
 * Otorisasi bersama: pastikan caller adalah admin yang valid dan
 * target adalah guru di sekolah yang sama.
 * Kembalikan pesan error (string) atau null jika lolos.
 */
async function authorizeAdminForTeacher(targetId: string): Promise<string | null> {
  if (!targetId) return "ID guru tidak valid.";

  const { createClient: createServerClient } = await import(
    "@/lib/supabase/server"
  );
  const sessionClient = await createServerClient();
  const {
    data: { user: caller },
  } = await sessionClient.auth.getUser();
  if (!caller) return "Sesi tidak valid. Silakan login ulang.";

  const { data: adminProfile } = await sessionClient
    .from("profiles")
    .select("role, school_id")
    .eq("id", caller.id)
    .maybeSingle();
  if (adminProfile?.role !== "admin") {
    return "Aksi ini hanya untuk admin.";
  }

  // Target harus guru di sekolah yang sama (cek via RLS session admin)
  const { data: target } = await sessionClient
    .from("profiles")
    .select("role, school_id")
    .eq("id", targetId)
    .maybeSingle();
  if (!target || target.role !== "guru") {
    return "Guru tidak ditemukan.";
  }
  if (target.school_id !== adminProfile.school_id) {
    return "Guru bukan bagian dari sekolah ini.";
  }

  return null;
}

/**
 * Nonaktifkan / aktifkan kembali guru via Supabase Admin API (ban/unban).
 * Guru yang di-ban tidak bisa login sampai diaktifkan kembali.
 */
export async function setTeacherStatus(formData: FormData) {
  const id = formData.get("id") as string;
  const activate = formData.get("activate") === "1";

  const authError = await authorizeAdminForTeacher(id);
  if (authError) return { error: authError };

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { error } = await supabase.auth.admin.updateUserById(id, {
    ban_duration: activate ? "none" : BAN_FOREVER,
  });

  if (error) return { error: error.message };

  revalidatePath("/a/guru");
  return { error: null };
}

/**
 * Hapus guru secara permanen (profile + akun auth).
 * Hanya untuk guru berstatus nonaktif — mencegah penghapusan akun
 * yang masih aktif secara tidak sengaja.
 */
export async function deleteTeacher(formData: FormData) {
  const id = formData.get("id") as string;

  const authError = await authorizeAdminForTeacher(id);
  if (authError) return { error: authError };

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // 1) Pastikan guru berstatus nonaktif (sedang di-ban, dan belum kedaluwarsa)
  const { data: userData, error: userError } =
    await supabase.auth.admin.getUserById(id);
  if (userError) return { error: userError.message };
  if (!userData?.user) return { error: "Guru tidak ditemukan." };
  const banActive =
    !!userData.user.banned_until &&
    new Date(userData.user.banned_until).getTime() > Date.now();
  if (!banActive) {
    return { error: "Guru masih aktif. Nonaktifkan dulu sebelum menghapus." };
  }

  // 2) Tolak jika guru masih memegang kelas (hindari data kelas yatim)
  const { count, error: countError } = await supabase
    .from("classes")
    .select("id", { count: "exact", head: true })
    .eq("teacher_id", id);
  if (countError) return { error: countError.message };
  if (count && count > 0) {
    return {
      error: `Guru masih mengajar ${count} kelas. Pindahkan atau hapus kelasnya dulu sebelum menghapus guru.`,
    };
  }

  // 3) Hapus akun auth DULU (otoritatif — setelah ini guru tidak mungkin
  //    login lagi). Baru bersihkan row profile (best-effort; dengan FK
  //    CASCADE biasa row profile ikut terhapus otomatis).
  const { error: deleteError } = await supabase.auth.admin.deleteUser(id);
  if (deleteError) return { error: deleteError.message };

  const { error: profileError } = await supabase
    .from("profiles")
    .delete()
    .eq("id", id);
  if (profileError && (profileError as { code?: string })?.code !== "PGRST116") {
    console.error("Profile guru tersisa (bukan blocker):", profileError.message);
  }

  revalidatePath("/a/guru");
  return { error: null };
}

/**
 * Ambil status ban (aktif/nonaktif) untuk daftar user id.
 * Dipakai halaman admin karena status ban di auth.users tidak
 * bisa dibaca lewat RLS client biasa.
 */
export async function getBannedTeacherStatuses(
  ids: string[],
): Promise<Record<string, boolean>> {
  const result: Record<string, boolean> = {};
  if (ids.length === 0) return result;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const idSet = new Set(ids);
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data } = await supabase.auth.admin.listUsers({
      page,
      perPage: pageSize,
    });
    const users = data?.users ?? [];
    for (const u of users) {
      if (idSet.has(u.id)) {
        result[u.id] = Boolean(u.banned_until);
      }
    }
    hasMore = users.length === pageSize;
    page++;
  }

  return result;
}

/**
 * Update data guru — via RLS (pakai session admin, bukan service_role).
 * Aman karena admin sudah punya policy admin_update_profiles.
 */
export async function updateTeacher(formData: FormData) {
  const id = formData.get("id") as string;
  const fullName = formData.get("full_name") as string;
  const email = formData.get("email") as string;

  if (!id || !fullName) {
    return { error: "ID dan nama harus diisi." };
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, email: email || null })
    .eq("id", id);

  if (error) return { error: error.message };

  return { error: null };
}
