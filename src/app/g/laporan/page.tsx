"use client";

import { useState, useEffect } from "react";
import { Download, TrendingUp, CheckCircle2, Award, AlertTriangle, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";

/* ───────── Types ───────── */
interface ReportStudent {
  id: string;
  full_name: string;
  nis: string | null;
  class_name: string;
}

interface TeacherClass {
  id: string;
  name: string;
  code: string;
}

export default function TeacherReport() {
  const supabase = createClient();
  const { profile: teacherProfile } = useAuth();

  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [students, setStudents] = useState<ReportStudent[]>([]);
  const [selectedClass, setSelectedClass] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teacherProfile?.id) return;

    async function load() {
      if (!teacherProfile?.id) return;
      setLoading(true);

      // 1) Ambil semua kelas guru
      const { data: kelasRaw } = await supabase
        .from("classes")
        .select("id, name, code")
        .eq("teacher_id", teacherProfile.id)
        .order("name");

      const clsList = kelasRaw || [];
      setClasses(clsList);

      // 2) Ambil semua murid dari kelas-kelas ini
      const codes = clsList.map((c: any) => c.code).filter(Boolean);
      if (codes.length > 0) {
        const { data: muridRaw } = await supabase
          .from("profiles")
          .select("id, full_name, nis, class_code")
          .eq("role", "murid")
          .in("class_code", codes)
          .order("full_name");

        const classMap = new Map(clsList.map((c: any) => [c.code, c.name]));
        const mapped: ReportStudent[] = (muridRaw || []).map((m: any) => ({
          id: m.id,
          full_name: m.full_name,
          nis: m.nis,
          class_name: classMap.get(m.class_code) || "—",
        }));

        setStudents(mapped);
      }

      setLoading(false);
    }

    load();
  }, [teacherProfile?.id, supabase]);

  const filtered =
    selectedClass === "all"
      ? students
      : students.filter((s) => s.class_name === selectedClass);

  function exportCsv() {
    const header = "Murid,NIS,Kelas\n";
    const rows = filtered
      .map((s) => `${s.full_name},${s.nis || ""},${s.class_name}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-murid-${selectedClass === "all" ? "semua-kelas" : selectedClass.toLowerCase().replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalStudents = filtered.length;

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink jp-rule">Laporan</h1>
          <p className="text-sm text-ink-soft">
            {totalStudents} murid dari {classes.length} kelas
          </p>
        </div>
        <div className="flex gap-2">
          {students.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download size={15} /> Export CSV
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-ink-soft">
          <Loader2 size={18} className="animate-spin" /> Memuat laporan&hellip;
        </div>
      ) : (
        <>
          {/* Filter kelas */}
          <div className="mt-5">
            <Select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="sm:w-64"
            >
              <option value="all">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Stat cards */}
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card padded>
              <TrendingUp size={18} className="text-indigo/60" />
              <p className="mt-2 text-xs text-ink-soft">Total Murid</p>
              <p className="mt-0.5 text-lg font-bold text-indigo">{totalStudents}</p>
            </Card>
            <Card padded>
              <CheckCircle2 size={18} className="text-indigo/60" />
              <p className="mt-2 text-xs text-ink-soft">Total Kelas</p>
              <p className="mt-0.5 text-lg font-bold text-indigo">{classes.length}</p>
            </Card>
            <Card padded>
              <Award size={18} className="text-indigo/60" />
              <p className="mt-2 text-xs text-ink-soft">Rata-rata Skor</p>
              <p className="mt-0.5 text-lg font-bold text-indigo">&mdash;</p>
            </Card>
            <Card padded>
              <AlertTriangle size={18} className="text-indigo/60" />
              <p className="mt-2 text-xs text-ink-soft">Penyelesaian</p>
              <p className="mt-0.5 text-lg font-bold text-indigo">&mdash;</p>
            </Card>
          </div>

          {students.length === 0 ? (
            <Card padded className="mt-4">
              <p className="text-center text-sm text-ink-soft">
                Belum ada data murid. Data akan muncul setelah murid ditambahkan ke kelas.
              </p>
            </Card>
          ) : (
            <>
              {/* Student table (desktop) */}
              <Card className="mt-4 hidden overflow-hidden p-0 md:block" padded={false}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="border-b border-line bg-indigo-tint-soft/40 text-left text-xs font-bold text-ink-soft">
                        <th className="px-4 py-3">Murid</th>
                        <th className="px-4 py-3">NIS</th>
                        <th className="px-4 py-3">Kelas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((s) => (
                        <tr key={s.id} className="border-b border-line last:border-0">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar name={s.full_name} size={32} />
                              <span className="font-semibold text-ink">{s.full_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-ink-soft">{s.nis || "—"}</td>
                          <td className="px-4 py-3">
                            <Badge tone="soft">{s.class_name}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Student cards (mobile) */}
              <div className="mt-4 space-y-3 md:hidden">
                {filtered.map((s) => (
                  <Card key={s.id} padded>
                    <div className="flex items-center gap-3">
                      <Avatar name={s.full_name} size={40} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-ink">{s.full_name}</p>
                        <p className="text-xs text-ink-soft">
                          NIS {s.nis || "—"} · {s.class_name}
                        </p>
                      </div>
                      <Badge tone="soft">{s.class_name}</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
