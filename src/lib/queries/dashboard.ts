import { createClient } from "@/lib/supabase/server";

export interface DashboardStats {
  total_murid: number;
  total_guru: number;
  total_kelas: number;
  topClasses: { name: string; student_count: number }[];
  topTeachers: { id: string; full_name: string; class_count: number }[];
}

/**
 * Ambil data dashboard untuk admin: total murid/guru/kelas,
 * kelas dengan murid terbanyak, dan guru dengan kelas terbanyak.
 */
export async function getDashboardStats(
  schoolId: string,
): Promise<DashboardStats> {
  const supabase = await createClient();

  // Semua query jalan paralel
  const [muridR, guruR, kelasR, classGroupsR, teacherClassesR] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "murid")
        .eq("school_id", schoolId),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "guru")
        .eq("school_id", schoolId),
      supabase
        .from("classes")
        .select("*", { count: "exact", head: true })
        .eq("school_id", schoolId),
      supabase
        .from("profiles")
        .select("class_code")
        .eq("role", "murid")
        .eq("school_id", schoolId)
        .not("class_code", "is", null),
      supabase
        .from("classes")
        .select("teacher_id")
        .eq("school_id", schoolId)
        .not("teacher_id", "is", null),
    ]);

  /* ─── Kelas dengan murid terbanyak ─── */
  const classCount = new Map<string, number>();
  classGroupsR.data?.forEach((p) => {
    if (p.class_code)
      classCount.set(p.class_code, (classCount.get(p.class_code) || 0) + 1);
  });
  const topClasses = [...classCount.entries()]
    .map(([name, c]) => ({ name, student_count: c }))
    .sort((a, b) => b.student_count - a.student_count)
    .slice(0, 5);

  /* ─── Guru dengan kelas terbanyak ─── */
  const teacherCount = new Map<string, number>();
  teacherClassesR.data?.forEach((c) => {
    if (c.teacher_id)
      teacherCount.set(
        c.teacher_id,
        (teacherCount.get(c.teacher_id) || 0) + 1,
      );
  });

  const tIds = [...teacherCount.keys()];
  let teacherNames = new Map<string, string>();
  if (tIds.length > 0) {
    const { data: teachers } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", tIds);
    teachers?.forEach((t) => teacherNames.set(t.id, t.full_name));
  }

  const topTeachers = [...teacherCount.entries()]
    .map(([id, count]) => ({
      id,
      full_name: teacherNames.get(id) || "Guru",
      class_count: count,
    }))
    .sort((a, b) => b.class_count - a.class_count)
    .slice(0, 5);

  return {
    total_murid: muridR.count ?? 0,
    total_guru: guruR.count ?? 0,
    total_kelas: kelasR.count ?? 0,
    topClasses,
    topTeachers,
  };
}
