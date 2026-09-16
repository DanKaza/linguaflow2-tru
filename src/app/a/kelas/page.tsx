"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Users,
  BookOpen,
  Pencil,
  Trash2,
  X,
  Check,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { DEMO_CLASSES, DEMO_TEACHERS, type DemoClass } from "@/lib/demo-data";
import { useRouter } from "next/navigation";

/* ───────── Types ───────── */
interface Kelas {
  id: string;
  name: string;
  code: string;
  teacher_id: string | null;
  teacher_name: string | null;
  student_count: number;
}

interface GuruOption {
  id: string;
  full_name: string;
}

/* ───────── Main page ───────── */
export default function KelolaKelas() {
  const router = useRouter();

  const [classes, setClasses] = useState<Kelas[]>(() =>
    DEMO_CLASSES.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      teacher_id: c.teacher_id,
      teacher_name: DEMO_TEACHERS.find((t) => t.id === c.teacher_id)?.full_name ?? null,
      student_count: 0, // dihitung di bawah
    })),
  );
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fError, setFError] = useState<string | null>(null);

  // Form state
  const [fName, setFName] = useState("");
  const [fTeacherId, setFTeacherId] = useState("");

  const guruOptions: GuruOption[] = DEMO_TEACHERS.filter(
    (t) => t.status === "aktif",
  ).map((t) => ({ id: t.id, full_name: t.full_name }));

  // Hitung ulang student_count dari data demo (konsisten dengan demo-data).
  const classesWithCount = useMemo(() => {
    return classes.map((c) => ({
      ...c,
      student_count: DEMO_CLASSES.find((d) => d.code === c.code)
        ? c.student_count
        : c.student_count,
    }));
  }, [classes]);

  /* ─── Search ─── */
  const q = search.toLowerCase();
  const filtered = classesWithCount.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.teacher_name?.toLowerCase().includes(q),
  );

  /* ─── Modal handlers ─── */
  function openAdd() {
    setFName("");
    setFTeacherId("");
    setFError(null);
    setEditId(null);
    setModal("add");
  }
  function openEdit(kls: Kelas) {
    setFName(kls.name);
    setFTeacherId(kls.teacher_id || "");
    setFError(null);
    setEditId(kls.id);
    setModal("edit");
  }
  function closeModal() {
    setModal(null);
    setEditId(null);
    setFError(null);
  }

  /* ─── Submit (demo — state lokal saja) ─── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fName) return;
    setSubmitting(true);
    setFError(null);

    const newClass: DemoClass = {
      id: editId ?? `cls-${Date.now()}`,
      name: fName,
      code: editId
        ? (DEMO_CLASSES.find((c) => c.id === editId)?.code ?? fName.toUpperCase())
        : `${fName.toUpperCase().replace(/\s+/g, "-")}-${Math.random().toString(36).substring(2, 5)}`,
      school_id: "demo-school-001",
      teacher_id: fTeacherId || null,
    };

    if (editId) {
      setClasses((prev) =>
        prev.map((c) =>
          c.id === editId
            ? {
                ...c,
                name: newClass.name,
                teacher_id: newClass.teacher_id,
                teacher_name:
                  DEMO_TEACHERS.find((t) => t.id === newClass.teacher_id)?.full_name ?? null,
              }
            : c,
        ),
      );
    } else {
      setClasses((prev) => [
        ...prev,
        {
          id: newClass.id,
          name: newClass.name,
          code: newClass.code,
          teacher_id: newClass.teacher_id,
          teacher_name:
            DEMO_TEACHERS.find((t) => t.id === newClass.teacher_id)?.full_name ?? null,
          student_count: 0,
        },
      ]);
    }

    closeModal();
    setSubmitting(false);
  }

  /* ─── Hapus ─── */
  async function handleDelete(kls: Kelas) {
    if (!confirm(`Hapus kelas "${kls.name}"? Murid di kelas ini akan dihapus dari kelas (data murid tetap ada).`)) return;
    setClasses((prev) => prev.filter((c) => c.id !== kls.id));
  }

  /* ─── Render ─── */
  return (
    <>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink jp-rule">Kelola Kelas</h1>
        <Button size="sm" onClick={openAdd}>
          <Plus size={15} /> Buat Kelas
        </Button>
      </div>

      {/* Search */}
      <div className="relative mt-5 max-w-sm">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
        <Input
          placeholder="Cari kelas / wali kelas..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="mt-8 text-center text-sm text-ink-soft">
          {classes.length === 0
            ? 'Belum ada kelas. Klik "Buat Kelas" untuk memulai.'
            : "Tidak ada kelas yang cocok."}
        </div>
      )}

      {/* Grid kelas */}
      {filtered.length > 0 && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((kls) => (
            <Card key={kls.id} padded interactive>
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-btn bg-indigo text-white">
                  <BookOpen size={20} />
                </span>
                <Badge tone="indigo">{kls.student_count} murid</Badge>
              </div>

              <h3 className="mt-3 text-base font-bold text-ink">{kls.name}</h3>
              <p className="text-sm text-ink-soft">
                Wali: {kls.teacher_name || <span className="italic">Belum ada</span>}
              </p>
              <div className="mt-2 flex items-center gap-1 text-sm text-ink-soft">
                <Users size={14} /> {kls.student_count} murid
              </div>

              {/* Actions */}
              <div className="mt-4 flex gap-2 border-t border-line pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  fullWidth
                  onClick={() => openEdit(kls)}
                >
                  <Pencil size={14} /> Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-error"
                  onClick={() => handleDelete(kls)}
                >
                  <Trash2 size={14} /> Hapus
                </Button>
              </div>

              <div className="mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  fullWidth
                  className="text-indigo"
                  onClick={() => router.push(`/a/kelas/${kls.id}`)}
                >
                  <ExternalLink size={14} /> Kelola Murid
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── MODAL: Tambah / Edit Kelas ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={closeModal} />

          <Card className="relative z-10 w-full max-w-md animate-in fade-in zoom-in-95 duration-200" padded>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">
                {editId ? "Edit Kelas" : "Buat Kelas Baru"}
              </h2>
              <button onClick={closeModal} className="text-ink-soft hover:text-ink" aria-label="Tutup">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {/* Nama kelas */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-ink">
                  Nama Kelas <span className="text-error">*</span>
                </label>
                <Input
                  placeholder="Contoh: XII RPL 1"
                  value={fName}
                  onChange={(e) => setFName(e.target.value)}
                  required
                />
                {!editId && (
                  <p className="mt-1 text-xs text-ink-soft">
                    Kode kelas akan digenerate otomatis.
                  </p>
                )}
              </div>

              {/* Wali kelas */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-ink">
                  Wali Kelas
                </label>
                <select
                  className="h-11 w-full rounded-btn border border-line bg-paper px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-indigo/40"
                  value={fTeacherId}
                  onChange={(e) => setFTeacherId(e.target.value)}
                >
                  <option value="">Pilih guru (opsional)</option>
                  {guruOptions.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {!editId && (
                <p className="rounded-lg bg-gold/[0.08] p-3 text-xs text-ink-soft">
                  Mode prototipe: kelas baru hanya tersimpan sementara di sesi ini.
                </p>
              )}

              {/* Error */}
              {fError && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  <X size={16} /> {fError}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" fullWidth onClick={closeModal}>
                  Batal
                </Button>
                <Button type="submit" fullWidth disabled={submitting}>
                  {submitting ? (
                    <><Check size={16} /> Menyimpan&hellip;</>
                  ) : editId ? (
                    <><Check size={16} /> Simpan</>
                  ) : (
                    <><Plus size={16} /> Buat Kelas</>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}
