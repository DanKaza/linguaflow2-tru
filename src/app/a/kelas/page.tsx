"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Users,
  BookOpen,
  Pencil,
  Trash2,
  Loader2,
  X,
  Check,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { createClass, updateClass, deleteClass } from "./actions";
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
  const supabase = createClient();
  const router = useRouter();
  const { profile: adminProfile } = useAuth();

  const [classes, setClasses] = useState<Kelas[]>([]);
  const [guruOptions, setGuruOptions] = useState<GuruOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fError, setFError] = useState<string | null>(null);

  // Form state
  const [fName, setFName] = useState("");
  const [fTeacherId, setFTeacherId] = useState("");

  /* ─── Fetch data ─── */
  const fetchData = useCallback(async () => {
    if (!adminProfile?.school_id) return;
    setLoading(true);

    // 1) Ambil semua kelas + guru wali
    const { data: kelasRaw } = await supabase
      .from("classes")
      .select(`*, teacher:teacher_id ( id, full_name )`)
      .eq("school_id", adminProfile.school_id)
      .order("name");

    // 2) Ambil semua murid untuk hitung per kelas
    const { data: muridRaw } = await supabase
      .from("profiles")
      .select("class_code")
      .eq("role", "murid")
      .eq("school_id", adminProfile.school_id);

    // Hitung murid per class_code
    const studentCounts = new Map<string, number>();
    muridRaw?.forEach((m) => {
      if (m.class_code)
        studentCounts.set(
          m.class_code,
          (studentCounts.get(m.class_code) || 0) + 1,
        );
    });

    // Map ke format Kelas
    const mapped: Kelas[] = (kelasRaw || []).map((k: any) => ({
      id: k.id,
      name: k.name,
      code: k.code,
      teacher_id: k.teacher?.id ?? null,
      teacher_name: k.teacher?.full_name ?? null,
      student_count: studentCounts.get(k.code) || 0,
    }));
    setClasses(mapped);

    // 3) Ambil daftar guru untuk dropdown
    const { data: gurus } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "guru")
      .eq("school_id", adminProfile.school_id)
      .order("full_name");

    setGuruOptions(gurus || []);
    setLoading(false);
  }, [supabase, adminProfile?.school_id]);

  useEffect(() => {
    if (adminProfile?.school_id) fetchData();
  }, [adminProfile?.school_id, fetchData]);

  /* ─── Search ─── */
  const q = search.toLowerCase();
  const filtered = classes.filter(
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

  /* ─── Submit ─── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fName) return;
    setSubmitting(true);
    setFError(null);

    const fd = new FormData();
    fd.set("name", fName);
    fd.set("teacher_id", fTeacherId);

    try {
      if (editId) {
        fd.set("id", editId);
        const r = await updateClass(fd);
        if (r?.error) throw new Error(r.error);
      } else {
        const r = await createClass(fd);
        if (r?.error) throw new Error(r.error);
      }
      closeModal();
      fetchData();
    } catch (err: any) {
      setFError(err?.message || "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ─── Hapus ─── */
  async function handleDelete(kls: Kelas) {
    if (!confirm(`Hapus kelas "${kls.name}"? Murid di kelas ini akan dihapus dari kelas (data murid tetap ada).`)) return;

    const fd = new FormData();
    fd.set("id", kls.id);
    fd.set("code", kls.code);
    const r = await deleteClass(fd);
    if (r?.error) {
      alert(r.error);
    } else {
      fetchData();
    }
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

      {/* Loading */}
      {loading && (
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-ink-soft">
          <Loader2 size={18} className="animate-spin" /> Memuat data kelas&hellip;
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="mt-8 text-center text-sm text-ink-soft">
          {classes.length === 0
            ? 'Belum ada kelas. Klik "Buat Kelas" untuk memulai.'
            : "Tidak ada kelas yang cocok."}
        </div>
      )}

      {/* Grid kelas */}
      {!loading && (
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
                    <><Loader2 size={16} className="animate-spin" /> Menyimpan&hellip;</>
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
