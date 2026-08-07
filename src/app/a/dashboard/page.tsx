import { TrendingUp, Users, UserCircle, ClipboardList, Activity } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/server";
import { getDashboardStats } from "@/lib/queries/dashboard";
import { getActivityData } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return <p className="text-sm text-ink-soft">Silakan login terlebih dahulu.</p>;
  }

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("school_id, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!adminProfile?.school_id) {
    return (
      <div className="mt-12 text-center">
        <p className="text-lg font-bold text-ink">Selamat datang di LinguaFlow! 👋</p>
        <p className="mt-2 text-sm text-ink-soft">
          Sepertinya sekolah belum dikonfigurasi.{' '}
          <a
            href="/a/pengaturan"
            className="font-semibold text-indigo underline-offset-2 hover:underline"
          >
            Buka Pengaturan Sekolah
          </a>{' '}
          untuk memulai.
        </p>
      </div>
    );
  }

  const schoolId = adminProfile.school_id;

  // Query nama sekolah + data dashboard paralel
  const schoolNamePromise = supabase
    .from("schools")
    .select("name")
    .eq("id", schoolId)
    .maybeSingle();

  let stats, activity, schoolName;
  try {
    const results = await Promise.all([
      getDashboardStats(schoolId),
      getActivityData(schoolId),
      schoolNamePromise,
    ]);
    stats = results[0];
    activity = results[1];
    schoolName = results[2]?.data?.name ?? "Sekolah";
  } catch (err) {
    console.error("Dashboard gagal memuat:", err);
    return <p className="text-sm text-ink-soft">Gagal memuat data dashboard.</p>;
  }

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Cari nilai maksimum growth chart
  const maxGrowth = Math.max(...activity.growthDays.map((d) => d.users), 1);

  return (
    <>
      <h1 className="text-2xl font-bold text-ink jp-rule">
        Dashboard — {schoolName}
      </h1>
      <p className="text-sm text-ink-soft">{today}</p>

      {/* ── 4 KARTU STATS ── */}
      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total Murid"
          value={stats.total_murid.toLocaleString()}
        />
        <StatCard
          icon={UserCircle}
          label="Total Guru"
          value={stats.total_guru.toLocaleString()}
        />
        <StatCard
          icon={ClipboardList}
          label="Total Kelas"
          value={stats.total_kelas.toLocaleString()}
        />
        <StatCard
          icon={Activity}
          label="Aktif Hari Ini"
          value={`${activity.activeToday}`}
          trend={
            activity.totalUsers > 0
              ? `${activity.activeTodayPercent}% dari ${activity.totalUsers} total user`
              : "Belum ada data login"
          }
        />
      </div>

      {/* ── GRAFIK PERTUMBUHAN 30 HARI ── */}
      <Card className="mt-6" padded>
        <h2 className="text-sm font-bold text-ink">
          Pertumbuhan Pengguna 30 Hari Terakhir
        </h2>
        <div className="mt-4 overflow-x-auto thin-scroll">
          <div
            className="flex min-w-[640px] items-end gap-[3px]"
            style={{ height: 64 }}
          >
            {activity.growthDays.length > 0 ? (
              activity.growthDays.map((d, i) => (
                <div key={i} className="flex-1" title={`${d.day}: ${d.users} pengguna baru`}>
                  <div
                    className="w-full rounded-t-sm bg-indigo/70 transition-all hover:bg-indigo"
                    style={{
                      height: `${(d.users / maxGrowth) * 64}px`,
                      minHeight: d.users > 0 ? 2 : 0,
                    }}
                  />
                </div>
              ))
            ) : (
              <p className="w-full text-center text-xs text-ink-soft">
        Data pertumbuhan akan tersedia setelah sistem berjalan.
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* ── KELAS & GURU TERATAS ── */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card padded>
          <h2 className="text-sm font-bold text-ink">
            Kelas dengan Murid Terbanyak
          </h2>
          <div className="mt-3 space-y-3">
            {stats.topClasses.length > 0 ? (
              stats.topClasses.map((c) => (
                <div key={c.name}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-semibold text-ink">{c.name}</span>
                    <span className="text-indigo">{c.student_count} murid</span>
                  </div>
                  <ProgressBar
                    value={Math.min(
                      100,
                      (c.student_count /
                        Math.max(
                          ...stats.topClasses.map((x) => x.student_count),
                          1,
                        )) *
                        100,
                    )}
                  />
                </div>
              ))
            ) : (
              <p className="text-sm text-ink-soft">Belum ada kelas.</p>
            )}
          </div>
        </Card>

        <Card padded>
          <h2 className="text-sm font-bold text-ink">
            Guru dengan Kelas Terbanyak
          </h2>
          <div className="mt-3 space-y-3">
            {stats.topTeachers.length > 0 ? (
              stats.topTeachers.map((t, i) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3"
                >
                  <span className="text-sm font-bold text-indigo">#{i + 1}</span>
                  <Avatar name={t.full_name} size={32} />
                  <span className="flex-1 text-sm font-semibold text-ink">
                    {t.full_name}
                  </span>
                  <span className="text-xs text-ink-soft">
                    {t.class_count} kelas
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-ink-soft">Belum ada guru.</p>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

/* ─── Stat card component ─── */
function StatCard({
  icon: Icon,
  label,
  value,
  trend,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  trend?: string;
}) {
  return (
    <Card padded>
      <span className="flex h-10 w-10 items-center justify-center rounded-btn bg-indigo-tint-soft">
        <Icon size={20} className="text-indigo" />
      </span>
      <p className="mt-3 text-2xl font-bold text-ink">{value}</p>
      <p className="text-sm text-ink-soft">{label}</p>
      {trend && (
        <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-success">
          <TrendingUp size={13} /> {trend}
        </p>
      )}
    </Card>
  );
}
