"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  ClipboardList,
  AlertTriangle,
  FileCheck,
  Plus,
  FileQuestion,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useTimeGreeting } from "@/lib/time-greeting";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";

/* ───────── Types ───────── */
interface TeacherClass {
  id: string;
  name: string;
  code: string;
  student_count: number;
}

/* ───────── Sparkline component (7-day placeholder) ───────── */
const activity = [42, 55, 38, 61, 73, 58, 82];
const dayLabels = ["S", "S", "R", "K", "J", "S", "M"];

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const peak = data.indexOf(max);
  return (
    <div>
      <div className="flex h-14 items-end gap-1.5">
        {data.map((v, i) => (
          <div key={i} className="group relative flex-1">
            <div
              className={
                "w-full rounded-t-md bg-gradient-to-t transition-all " +
                (i === peak ? "from-indigo/50 to-indigo" : "from-indigo/25 to-indigo/70")
              }
              style={{ height: `${(v / max) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {dayLabels.map((d, i) => (
          <span
            key={i}
            className={
              "flex-1 text-center text-[10px] " +
              (i === peak ? "font-semibold text-indigo" : "text-ink-soft/70")
            }
          >
            {d}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ───────── Main Dashboard ───────── */
export default function TeacherDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const { profile: teacherProfile } = useAuth();
  const timeGreeting = useTimeGreeting();

  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [activeTasks, setActiveTasks] = useState(0);
  const [loading, setLoading] = useState(true);

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    if (!teacherProfile?.id) return;

    async function load() {
      if (!teacherProfile?.id) return;
      setLoading(true);

      // 1) Ambil kelas yang diajar
      const { data: kelasRaw } = await supabase
        .from("classes")
        .select("id, name, code")
        .eq("teacher_id", teacherProfile.id)
        .order("name");

      const codes = (kelasRaw || []).map((k: any) => k.code).filter(Boolean);

      // 2) Hitung murid per kelas
      let studentCounts = new Map<string, number>();

      if (codes.length > 0) {
        const { data: muridRaw } = await supabase
          .from("profiles")
          .select("class_code")
          .eq("role", "murid")
          .in("class_code", codes);

        muridRaw?.forEach((m: any) => {
          if (m.class_code)
            studentCounts.set(m.class_code, (studentCounts.get(m.class_code) || 0) + 1);
        });

        // 3) Hitung tugas aktif (deadline >= hari ini)
        const today = new Date().toISOString().slice(0, 10);
        const { count } = await supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("teacher_id", teacherProfile.id)
          .gte("deadline", today);

        setActiveTasks(count ?? 0);
      }

      const mapped: TeacherClass[] = (kelasRaw || []).map((k: any) => ({
        id: k.id,
        name: k.name,
        code: k.code,
        student_count: studentCounts.get(k.code) || 0,
      }));

      setClasses(mapped);
      setTotalStudents(
        Array.from(studentCounts.values()).reduce((a, b) => a + b, 0),
      );
      setLoading(false);
    }

    load();
  }, [teacherProfile?.id, supabase]);

  const teacherName = teacherProfile?.full_name ?? "Guru";
  const classNames = classes.map((c) => c.name).join(" · ");

  return (
    <>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink jp-rule">
            {timeGreeting.greeting}, {teacherName}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">{today}</p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Button size="sm" fullWidth onClick={() => router.push("/g/tugas")}>
            <Plus size={16} /> Assign Tugas
          </Button>
          <Button size="sm" variant="outline" fullWidth onClick={() => router.push("/g/kuis")}>
            <FileQuestion size={16} /> Buat Kuis
          </Button>
        </div>
      </div>

      {/* Ikhtisar */}
      <p className="mb-3 mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
        Ikhtisar
      </p>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-ink-soft">
          <Loader2 size={18} className="animate-spin" /> Memuat dashboard&hellip;
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="flex items-center gap-4 transition-shadow hover:shadow-soft-lg">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-btn bg-indigo-tint-soft">
                <Users size={22} className="text-indigo" />
              </span>
              <div className="min-w-0">
                <p className="text-2xl font-bold leading-none text-ink">{classes.length}</p>
                <p className="mt-1 text-sm font-semibold text-ink">Kelas Diajar</p>
                <p className="truncate text-xs text-ink-soft">{classNames || "—"}</p>
              </div>
            </Card>
            <Card className="flex items-center gap-4 transition-shadow hover:shadow-soft-lg">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-btn bg-indigo-tint-soft">
                <ClipboardList size={22} className="text-indigo" />
              </span>
              <div className="min-w-0">
                <p className="text-2xl font-bold leading-none text-ink">{totalStudents}</p>
                <p className="mt-1 text-sm font-semibold text-ink">Total Murid</p>
                <p className="truncate text-xs text-ink-soft">Tersebar di {classes.length} kelas</p>
              </div>
            </Card>
            <Card className="flex items-center gap-4 transition-shadow hover:shadow-soft-lg">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-btn bg-vermillion/10">
                <AlertTriangle size={22} className="text-vermillion" />
              </span>
              <div className="min-w-0">
                <p className="text-2xl font-bold leading-none text-ink">{activeTasks}</p>
                <p className="mt-1 text-sm font-semibold text-ink">Tugas Aktif</p>
                <p className="truncate text-xs text-ink-soft">{activeTasks > 0 ? "Belum deadline" : "Belum ada tugas"}</p>
              </div>
            </Card>
          </div>

          {/* Main grid */}
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Classes */}
            <div className="lg:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold tracking-tight text-ink">Kelas Saya</h2>
                <Link href="/g/kelas" className="text-sm font-semibold text-indigo hover:underline">
                  Lihat semua
                </Link>
              </div>
              {classes.length === 0 ? (
                <p className="text-sm text-ink-soft">Belum ada kelas yang diajar.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {classes.map((c) => (
                    <Card
                      key={c.id}
                      interactive
                      padded
                      onClick={() => router.push(`/g/kelas/${c.id}`)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-base font-bold text-ink">{c.name}</h3>
                      </div>
                      <p className="mt-1 text-sm text-ink-soft">{c.student_count} murid</p>
                      <div className="mt-3">
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="text-ink-soft">Rata-rata penyelesaian</span>
                          <span className="font-semibold text-indigo">—</span>
                        </div>
                        <ProgressBar value={0} />
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Right column */}
            <div className="flex flex-col gap-6">
              {/* Review queue — placeholder */}
              <div>
                <h2 className="mb-3 text-lg font-bold tracking-tight text-ink">Tugas Perlu Direview</h2>
                <Card padded>
                  <div className="flex flex-col items-center gap-2 py-4 text-center">
                    <FileCheck size={32} className="text-indigo/30" />
                    <p className="text-sm text-ink-soft">
                      Belum ada tugas yang perlu direview.
                    </p>
                    <p className="text-xs text-ink-soft/60">
                      Tugas akan muncul di sini setelah murid mengumpulkan.
                    </p>
                  </div>
                </Card>
              </div>

              {/* Activity */}
              <Card padded>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-ink">Aktivitas Kelas</p>
                  <span className="text-xs text-ink-soft">7 hari terakhir</span>
                </div>
                <div className="mt-4">
                  <Sparkline data={activity} />
                </div>
                <p className="mt-3 text-xs text-ink-soft">
                  Data aktivitas akan muncul setelah murid mulai belajar.
                </p>
              </Card>
            </div>
          </div>
        </>
      )}
    </>
  );
}
