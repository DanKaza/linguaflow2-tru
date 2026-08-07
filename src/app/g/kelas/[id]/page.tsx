"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Search, ChevronRight, Plus, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";

/* ───────── Types ───────── */
interface ClassInfo {
  id: string;
  name: string;
  code: string;
}

interface Student {
  id: string;
  full_name: string;
  nis: string | null;
  created_at: string;
}

export default function ClassDetail() {
  const router = useRouter();
  const supabase = createClient();
  const { profile: teacherProfile } = useAuth();
  // Pakai useParams() — lebih reliable daripada props params di Next.js 16
  const params = useParams();
  const classId = params?.id as string | undefined;

  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("nama");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const teacherId = teacherProfile?.id;
    if (!teacherId || !classId) return;

    async function load() {
      setLoading(true);

      // 1) Ambil info kelas
      const { data: cls } = await supabase
        .from("classes")
        .select("id, name, code")
        .eq("id", classId)
        .eq("teacher_id", teacherId)
        .maybeSingle();

      if (!cls) {
        setLoading(false);
        return;
      }

      setClassInfo(cls);

      // 2) Ambil murid di kelas ini
      const { data: muridRaw } = await supabase
        .from("profiles")
        .select("id, full_name, nis, created_at")
        .eq("role", "murid")
        .eq("class_code", cls.code)
        .order("full_name");

      setStudents(muridRaw || []);
      setLoading(false);
    }

    load();
  }, [teacherProfile?.id, classId, supabase]);

  const q = search.toLowerCase();
  let filtered = students.filter(
    (s) =>
      s.full_name.toLowerCase().includes(q) ||
      (s.nis && s.nis.includes(q)),
  );

  // Sort
  if (sort === "nis") {
    filtered = [...filtered].sort((a, b) => (a.nis ?? "").localeCompare(b.nis ?? ""));
  } else if (sort === "terbaru") {
    filtered = [...filtered].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  if (!loading && !classInfo) {
    return (
      <div className="mt-8 text-center text-sm text-ink-soft">
        Kelas tidak ditemukan atau bukan kelas Anda.
      </div>
    );
  }

  return (
    <>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-ink-soft">
        <Link href="/g/kelas" className="hover:text-indigo">
          Kelas Saya
        </Link>
        <ChevronRight size={14} />
        <span className="font-semibold text-ink">{classInfo?.name ?? "..."}</span>
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink jp-rule">{classInfo?.name ?? "..."}</h1>
          <p className="text-sm text-ink-soft">{students.length} murid</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => router.push("/g/tugas")}>
            <Plus size={16} /> Assign Tugas
          </Button>
          <Button size="sm" variant="outline" onClick={() => router.push("/g/kuis")}>
            Buat Kuis
          </Button>
        </div>
      </div>

      {/* Search + sort */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <Input
            placeholder="Cari murid..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          className="sm:w-56"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="nama">Urutkan: Nama</option>
          <option value="nis">Urutkan: NIS</option>
          <option value="terbaru">Urutkan: Terbaru</option>
        </Select>
      </div>

      {loading ? (
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-ink-soft">
          <Loader2 size={18} className="animate-spin" /> Memuat murid&hellip;
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-8 text-center text-sm text-ink-soft">
          {students.length === 0
            ? "Belum ada murid di kelas ini."
            : "Tidak ada murid yang cocok."}
        </div>
      ) : (
        <>
          {/* Desktop / tablet table */}
          <Card className="mt-4 hidden overflow-hidden p-0 md:block" padded={false}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-line bg-indigo-tint-soft/40 text-left text-xs font-bold text-ink-soft">
                    <th className="px-4 py-3">Murid</th>
                    <th className="px-4 py-3">NIS</th>
                    <th className="px-4 py-3">Bergabung</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() =>
                        router.push(
                          `/g/kelas/${classId}/murid?class=${classId}&nis=${s.nis ?? ""}&name=${encodeURIComponent(s.full_name)}`,
                        )
                      }
                      className="cursor-pointer border-b border-line transition-colors last:border-0 hover:bg-indigo-tint-soft/30"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={s.full_name} size={36} />
                          <div>
                            <p className="font-semibold text-ink">{s.full_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{s.nis || "—"}</td>
                      <td className="px-4 py-3 text-ink-soft">
                        {new Date(s.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-semibold text-indigo hover:underline">
                          Detail
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile student cards */}
          <div className="mt-4 space-y-3 md:hidden">
            {filtered.map((s) => (
              <Card
                key={s.id}
                interactive
                padded
                onClick={() =>
                  router.push(
                    `/g/kelas/${classId}/murid?class=${classId}&nis=${s.nis ?? ""}&name=${encodeURIComponent(s.full_name)}`,
                  )
                }
              >
                <div className="flex items-center gap-3">
                  <Avatar name={s.full_name} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink">{s.full_name}</p>
                    <p className="text-xs text-ink-soft">
                      NIS {s.nis || "—"} · Bergabung{" "}
                      {new Date(s.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </>
  );
}
