"use server";

import { createClient } from "@supabase/supabase-js";

export interface ActivityData {
  activeToday: number;
  activeTodayPercent: number;
  growthDays: { day: number; users: number }[];
  totalUsers: number;
}

/**
 * Ambil data aktivitas dari auth.users (via service_role).
 * Data: user aktif hari ini, pertumbuhan 30 hari, total user.
 */
export async function getActivityData(
  schoolId: string,
): Promise<ActivityData> {
  const fallback: ActivityData = {
    activeToday: 0,
    activeTodayPercent: 0,
    growthDays: [],
    totalUsers: 0,
  };

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(
      "[Dashboard] SUPABASE_SERVICE_ROLE_KEY belum di-set — aktivitas tidak bisa dihitung.",
    );
    return fallback;
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  /* ── 1) Ambil profile user dalam sekolah ini ── */
  const { data: schoolProfiles } = await supabase
    .from("profiles")
    .select("id, created_at")
    .eq("school_id", schoolId);

  if (!schoolProfiles?.length) return fallback;

  const schoolUserIds = new Set(schoolProfiles.map((p) => p.id));

  /* ── 2) Ambil semua auth.users (dengan pagination) ── */
  let allUsers: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data } = await supabase.auth.admin.listUsers({
      page,
      perPage: pageSize,
    });
    if (data?.users?.length) {
      allUsers = allUsers.concat(data.users);
      hasMore = data.users.length === pageSize;
      page++;
    } else {
      hasMore = false;
    }
  }

  /* ── 3) Filter hanya user dalam sekolah ── */
  const schoolUsers = allUsers.filter((u) => schoolUserIds.has(u.id));
  const totalUsers = schoolUsers.length;
  if (totalUsers === 0) return fallback;

  /* ── 4) Aktif hari ini ── */
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const activeToday = schoolUsers.filter(
    (u) =>
      u.last_sign_in_at && new Date(u.last_sign_in_at) >= todayStart,
  ).length;

  /* ── 5) Pertumbuhan 30 hari (berdasar created_at di profiles) ── */
  const now = new Date();
  const growthDays: { day: number; users: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 86_400_000);
    const dayStart = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );
    const dayEnd = new Date(dayStart.getTime() + 86_400_000);

    const count = schoolProfiles.filter((p) => {
      const created = new Date(p.created_at);
      return created >= dayStart && created < dayEnd;
    }).length;

    growthDays.push({ day: date.getDate(), users: count });
  }

  const activeTodayPercent =
    totalUsers > 0 ? Math.round((activeToday / totalUsers) * 100) : 0;

  return { activeToday, activeTodayPercent, growthDays, totalUsers };
}
