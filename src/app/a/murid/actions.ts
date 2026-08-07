"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

/**
 * Membuat murid baru via Supabase Admin API (service_role).
 * Tidak mengganggu session admin yang sedang login.
 */
export async function createStudent(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("full_name") as string;
  const nis = formData.get("nis") as string;
  const classCode = formData.get("class_code") as string;
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
      user_metadata: {
        full_name: fullName,
        role: "murid",
        school_id: schoolId,
      },
    });

  if (authError) return { error: authError.message };
  if (!authData?.user) return { error: "Gagal membuat user." };

  // 2) Trigger sudah membuat profile. Update dengan data murid.
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      role: "murid",
      full_name: fullName,
      school_id: schoolId || null,
      nis: nis || null,
      class_code: classCode || null,
    })
    .eq("id", authData.user.id);

  if (profileError) {
    console.error("Gagal update profile murid:", profileError);
  }

  revalidatePath("/a/murid");
  return { error: null };
}

/**
 * Update data murid — via RLS.
 */
export async function updateStudent(formData: FormData) {
  const id = formData.get("id") as string;
  const fullName = formData.get("full_name") as string;
  const email = formData.get("email") as string;
  const nis = formData.get("nis") as string;
  const classCode = formData.get("class_code") as string;

  if (!id || !fullName) {
    return { error: "ID dan nama harus diisi." };
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      email: email || null,
      nis: nis || null,
      class_code: classCode || null,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/a/murid");
  return { error: null };
}
