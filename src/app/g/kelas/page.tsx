"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ChevronRight, Plus, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { useDemoSession } from "@/lib/demo-session";
import { DEMO_STUDENTS, getDemoClassesByTeacher } from "@/lib/demo-data";
import { useMemo, useState } from "react";

/* ───────── Types ───────── */
interface TeacherClass {
  id: string;
  name: string;
  code: string;
  student_count: number;
}

export default function ClassList() {
  const router = useRouter();
  const { profile } = useDemoSession();
  const [search, setSearch] = useState("");

  const teacherId = profile?.id ?? "demo-guru-001";

  const classes: TeacherClass[] = useMemo(
    () =>
      getDemoClassesByTeacher(teacherId).map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        student_count: DEMO_STUDENTS.filter((s) => s.class_code === c.code).length,
      })),
    [teacherId],
  );

  const totalStudents = classes.reduce((a, b) => a + b.student_count, 0);

  const q = search.toLowerCase();
  const filtered = classes.filter((c) => c.name.toLowerCase().includes(q));

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink jp-rule">Kelas Saya</h1>
          <p className="text-sm text-ink-soft">
            {classes.length} kelas · {totalStudents} murid
          </p>
        </div>
        <Button size="sm" onClick={() => router.push("/g/tugas")}>
          <Plus size={16} /> Assign Tugas
        </Button>
      </div>

      <div className="relative mt-5">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
        <Input
          placeholder="Cari kelas..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="mt-8 text-center text-sm text-ink-soft">
          {classes.length === 0
            ? "Belum ada kelas yang diajar."
            : "Tidak ada kelas yang cocok."}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <Card key={c.id} interactive padded className="flex flex-col">
              <Link href={`/g/kelas/${c.id}`} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-11 w-11 items-center justify-center rounded-btn bg-indigo-tint-soft text-indigo">
                    <Users size={20} />
                  </div>
                  <Badge tone="indigo">{c.student_count} murid</Badge>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-ink">{c.name}</h3>
                  <p className="text-sm text-ink-soft">{c.student_count} murid</p>
                </div>
              </Link>
              <Link
                href={`/g/kelas/${c.id}`}
                className="mt-3 flex items-center justify-end gap-1 text-sm font-semibold text-indigo hover:underline"
              >
                Buka kelas <ChevronRight size={15} />
              </Link>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
