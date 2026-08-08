import { TrendingUp, ClipboardList, Users, UserX, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CsvExportButton } from "@/components/ui/CsvExportButton";
import { createClient } from "@/lib/supabase/server";
import { getSchoolReport } from "@/lib/queries/laporan";

export const dynamic = "force-dynamic";

/* ─── Kartu statistik ringkas ─── */
function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card padded>
      <span className="flex h-10 w-10 items-center justify-center rounded-btn bg-indigo-tint-soft">
        <Icon size={20} className="text-indigo" />
      </span>
      <p className="mt-3 text-2xl font-bold text-ink">{value}</p>
      <p className="text-sm text-ink-soft">{label}</p>
      {hint && <p className="mt-1 text-xs text-ink-soft/70">{hint}</p>}
    </Card>
  );
}

/* ─── Nilai tampil aman: null → "—" ─── */
function fmtScore(v: number | null): string {
  return v === null ? "—" : String(v);
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return "—";
  }
}

export default async function LaporanSekolah() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return <p className="text-sm text-ink-soft">Silakan login terlebih dahulu.</p>;
  }

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!adminProfile?.school_id) {
    return (
      <div className="mt-12 text-center">
        <p className="text-lg font-bold text-ink">Laporan belum tersedia</p>
        <p className="mt-2 text-sm text-ink-soft">
          Sekolah belum dikonfigurasi.{' '}
          <a href="/a/pengaturan" className="font-semibold text-indigo underline-offset-2 hover:underline">
            Buka Pengaturan Sekolah
          </a>{' '}
          untuk memulai.
        </p>
      </div>
    );
  }

  const schoolId = adminProfile.school_id;

  const [{ data: school }, report] = await Promise.all([
    supabase.from("schools").select("name").eq("id", schoolId).maybeSingle(),
    getSchoolReport(schoolId),
  ]);

  const schoolName = school?.name ?? "Sekolah";
  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const { students, classes } = report;
  const belumMengerjakan = report.totalStudents - report.activeStudents;

  const csvRows = students.map((s) => [
    s.full_name,
    s.class_name ?? "",
    s.attempts,
    s.avgScore ?? "",
    fmtDate(s.lastSubmittedAt),
  ]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink jp-rule">Laporan Sekolah</h1>
          <p className="text-sm text-ink-soft">
            {schoolName} · {today}
          </p>
        </div>
        {students.length > 0 && (
          <CsvExportButton
            filename={`laporan-${schoolName.toLowerCase().replace(/\s+/g, "-")}.csv`}
            headers={["Murid", "Kelas", "Pengerjaan", "Rata-rata Skor", "Terakhir"]}
            rows={csvRows}
          />
        )}
      </div>

      {/* ⚠️ Migrasi tabel belum dijalankan */}
      {!report.attemptsTableReady && (
        <Card padded className="mt-5 border-gold/40 bg-gold/[0.04]">
          <p className="flex items-center gap-2 text-sm font-bold text-gold">
            <AlertTriangle size={16} /> Data pengerjaan belum tersedia
          </p>
          <p className="mt-1.5 text-sm text-ink-soft">
            Tabel <code className="rounded bg-indigo-tint-soft px-1 font-mono text-xs">quiz_attempts</code> belum dibuat.
            Jalankan migrasi <code className="rounded bg-indigo-tint-soft px-1 font-mono text-xs">supabase/migrations/001_quiz_attempts.sql</code>{' '}
            di Supabase → SQL Editor agar hasil kuis murid mulai tercatat.
          </p>
        </Card>
      )}

      {/* ── 4 KARTU STATS ── */}
      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={TrendingUp}
          label="Rata-rata Skor"
          value={fmtScore(report.avgScore)}
          hint={`dari ${report.totalAttempts} pengerjaan`}
        />
        <StatCard
          icon={ClipboardList}
          label="Total Pengerjaan"
          value={report.totalAttempts.toLocaleString()}
          hint="kuis harian & tugas guru"
        />
        <StatCard
          icon={Users}
          label="Murid Aktif"
          value={`${report.activeStudents} (${report.completionPct}%)`}
          hint={`dari ${report.totalStudents} murid`}
        />
        <StatCard
          icon={UserX}
          label="Belum Mengerjakan"
          value={belumMengerjakan.toLocaleString()}
          hint="belum pernah kuis"
        />
      </div>

      {/* ── PENYELESAIAN PER KELAS ── */}
      <Card className="mt-6" padded>
        <h2 className="text-sm font-bold text-ink">Penyelesaian per Kelas</h2>
        <div className="mt-4 space-y-3">
          {classes.length > 0 ? (
            classes.map((c) => (
              <div key={c.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-semibold text-ink">{c.name}</span>
                  <span className="text-xs text-ink-soft">
                    {c.attempts} pengerjaan · {c.studentCount} murid ·{" "}
                    <span className="font-semibold text-indigo">{fmtScore(c.avgScore)}</span>
                  </span>
                </div>
                <ProgressBar value={c.completionPct} />
              </div>
            ))
          ) : (
            <p className="text-sm text-ink-soft">Belum ada kelas di sekolah ini.</p>
          )}
        </div>
      </Card>

      {/* ── DAFTAR MURID ── */}
      {students.length === 0 ? (
        <Card padded className="mt-4">
          <p className="text-center text-sm text-ink-soft">
            Belum ada murid terdaftar di sekolah ini.
          </p>
        </Card>
      ) : (
        <>
          {report.totalAttempts === 0 && report.attemptsTableReady && (
            <p className="mt-4 rounded-btn bg-indigo-tint-soft/50 px-4 py-3 text-center text-xs text-ink-soft">
              Data pengerjaan akan muncul di sini setelah murid menyelesaikan kuis
              (Kuis Harian atau Tugas Guru).
            </p>
          )}

          {/* Mobile: card list */}
          <div className="mt-4 space-y-3 md:hidden">
            {students.map((s) => (
              <Card key={s.id} padded>
                <div className="flex items-center gap-3">
                  <Avatar name={s.full_name} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{s.full_name}</p>
                    <p className="truncate text-xs text-ink-soft">{s.class_name ?? "Tanpa kelas"}</p>
                  </div>
                  {s.attempts > 0 ? (
                    <Badge tone={s.avgScore! >= 80 ? "success" : "gold"}>{s.avgScore}</Badge>
                  ) : (
                    <Badge tone="neutral">Belum</Badge>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-sm">
                  <span className="text-ink-soft">{s.attempts} pengerjaan</span>
                  <span className="text-xs text-ink-soft">Terakhir {fmtDate(s.lastSubmittedAt)}</span>
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop: table */}
          <Card className="mt-4 hidden overflow-hidden p-0 md:block" padded={false}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-line bg-indigo-tint-soft/40 text-left text-xs font-bold text-ink-soft">
                    <th className="px-4 py-3">Murid</th>
                    <th className="px-4 py-3">Kelas</th>
                    <th className="px-4 py-3">Pengerjaan</th>
                    <th className="px-4 py-3">Rata² Skor</th>
                    <th className="px-4 py-3">Terakhir</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={s.full_name} size={32} />
                          <span className="font-semibold text-ink">{s.full_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{s.class_name ?? "—"}</td>
                      <td className="px-4 py-3 font-semibold text-ink">{s.attempts}</td>
                      <td className="px-4 py-3">
                        {s.attempts > 0 ? (
                          <Badge tone={s.avgScore! >= 80 ? "success" : "gold"}>{s.avgScore}</Badge>
                        ) : (
                          <span className="text-ink-soft/60">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-soft">{fmtDate(s.lastSubmittedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </>
  );
}
