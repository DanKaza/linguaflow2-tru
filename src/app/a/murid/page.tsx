"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Upload,
  Pencil,
  UserX,
  Loader2,
  Check,
  X,
  Mail,
  Lock,
  User as UserIcon,
  BookOpen,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { createStudent, updateStudent } from "./actions";

/* ───────── Types ───────── */
interface Murid {
  id: string;
  full_name: string;
  email: string;
  nis: string | null;
  class_code: string | null;
  avatar_url: string | null;
}

/* ───────── Main page ───────── */
export default function KelolaMurid() {
  const supabase = createClient();
  const { profile: adminProfile } = useAuth();

  const [students, setStudents] = useState<Murid[]>([]);
  const [classOptions, setClassOptions] = useState<{ code: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | "import" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [fName, setFName] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fPassword, setFPassword] = useState("");
  const [fNis, setFNis] = useState("");
  const [fClassCode, setFClassCode] = useState("");
  const [fError, setFError] = useState<string | null>(null);

  /* ─── Fetch students ─── */
  const fetchData = useCallback(async () => {
    if (!adminProfile?.school_id) return;
    setLoading(true);

    // 1) Ambil murid
    const { data: muridRaw } = await supabase
      .from("profiles")
      .select("id, full_name, email, nis, class_code, avatar_url")
      .eq("role", "murid")
      .eq("school_id", adminProfile.school_id)
      .order("full_name");

    setStudents((muridRaw as Murid[]) || []);

    // 2) Ambil daftar kelas untuk filter + dropdown (nama + kode)
    const { data: kelas } = await supabase
      .from("classes")
      .select("code, name")
      .eq("school_id", adminProfile.school_id)
      .order("name");

    setClassOptions(kelas?.map((k) => ({ code: k.code, name: k.name })) || []);

    setLoading(false);
  }, [supabase, adminProfile?.school_id]);

  useEffect(() => {
    if (adminProfile?.school_id) fetchData();
  }, [adminProfile?.school_id, fetchData]);

  /* ─── Helper: cari nama kelas dari kode ─── */
  function getClassName(code: string | null): string {
    if (!code) return "";
    return classOptions.find((c) => c.code === code)?.name || code;
  }

  /* ─── Search + Filter ─── */
  const q = search.toLowerCase();
  const filtered = students.filter((s) => {
    const matchSearch =
      s.full_name.toLowerCase().includes(q) ||
      (s.nis && s.nis.includes(q)) ||
      s.email.toLowerCase().includes(q);
    const matchClass = !filterClass || s.class_code === filterClass;
    return matchSearch && matchClass;
  });

  /* ─── Open modals ─── */
  function openAdd() {
    setFName("");
    setFEmail("");
    setFPassword("");
    setFNis("");
    setFClassCode("");
    setFError(null);
    setEditId(null);
    setModal("add");
  }

  function openEdit(m: Murid) {
    setFName(m.full_name);
    setFEmail(m.email);
    setFPassword("");
    setFNis(m.nis || "");
    setFClassCode(m.class_code || "");
    setFError(null);
    setEditId(m.id);
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
    if (!fName || !fEmail) return;
    setSubmitting(true);
    setFError(null);

    try {
      const fd = new FormData();
      fd.set("full_name", fName);
      fd.set("email", fEmail);
      fd.set("nis", fNis);
      fd.set("class_code", fClassCode);

      if (editId) {
        fd.set("id", editId);
        const r = await updateStudent(fd);
        if (r?.error) throw new Error(r.error);
      } else {
        if (!fPassword) {
          setFError("Password harus diisi untuk murid baru.");
          setSubmitting(false);
          return;
        }
        fd.set("password", fPassword);
        fd.set("school_id", adminProfile?.school_id ?? "");
        const r = await createStudent(fd);
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

  /* ─── Render ─── */
  return (
    <>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink jp-rule">Kelola Murid</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setModal("import")}>
            <Upload size={15} /> Import CSV
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus size={15} /> Tambah Murid
          </Button>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="mt-5 flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <Input
            placeholder="Cari murid / NIS..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="flex h-11 items-center gap-2 rounded-btn border border-line bg-paper px-3 text-sm font-semibold text-ink-soft focus:outline-none focus:ring-2 focus:ring-indigo/40"
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
        >
          <option value="">Semua Kelas</option>
          {classOptions.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-ink-soft">
          <Loader2 size={18} className="animate-spin" /> Memuat data murid&hellip;
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="mt-8 text-center text-sm text-ink-soft">
          {students.length === 0
            ? 'Belum ada murid. Klik "Tambah Murid" untuk memulai.'
            : "Tidak ada murid yang cocok."}
        </div>
      )}

      {/* Mobile: card list */}
      {!loading && (
        <div className="mt-4 space-y-3 md:hidden">
          {filtered.map((s) => (
            <Card key={s.id} padded>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={s.full_name} size={40} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{s.full_name}</p>
                    <p className="text-xs text-ink-soft">NIS {s.nis || "—"}</p>
                  </div>
                </div>
                <Badge tone="success">Aktif</Badge>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-sm">
                <span className="text-ink-soft">{getClassName(s.class_code) || <span className="italic">Tanpa kelas</span>}</span>
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" fullWidth onClick={() => openEdit(s)}>
                  <Pencil size={15} /> Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-error"
                  onClick={() => alert("Fitur nonaktifkan akan ditambahkan setelah update database.")}
                >
                  <UserX size={15} /> Nonaktifkan
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Desktop: table */}
      {!loading && filtered.length > 0 && (
        <Card className="mt-4 hidden overflow-hidden p-0 md:block" padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-line bg-indigo-tint-soft/40 text-left text-xs font-bold text-ink-soft">
                  <th className="px-4 py-3">Murid</th>
                  <th className="px-4 py-3">NIS</th>
                  <th className="px-4 py-3">Kelas</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={s.full_name} size={32} />
                        <div>
                          <p className="font-semibold text-ink">{s.full_name}</p>
                          <p className="text-xs text-ink-soft">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{s.nis || "—"}</td>
                    <td className="px-4 py-3 text-ink-soft">{getClassName(s.class_code) || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge tone="success">Aktif</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          className="text-indigo transition-colors hover:text-indigo/70"
                          aria-label="Edit"
                          onClick={() => openEdit(s)}
                        >
                          <Pencil size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── MODAL: Tambah / Edit ── */}
      {modal === "add" || modal === "edit" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={closeModal} />

          <Card className="relative z-10 w-full max-w-md animate-in fade-in zoom-in-95 duration-200" padded>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">
                {editId ? "Edit Murid" : "Tambah Murid"}
              </h2>
              <button onClick={closeModal} className="text-ink-soft hover:text-ink" aria-label="Tutup">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {/* Nama */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-ink">Nama Lengkap</label>
                <div className="relative">
                  <UserIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                  <Input
                    placeholder="Nama lengkap"
                    className="pl-10"
                    value={fName}
                    onChange={(e) => setFName(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-ink">Email</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                  <Input
                    type="email"
                    placeholder="murid@sekolah.sch.id"
                    className="pl-10"
                    value={fEmail}
                    onChange={(e) => setFEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* NIS */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-ink">NIS</label>
                <div className="relative">
                  <BookOpen size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                  <Input
                    placeholder="Nomor Induk Siswa"
                    className="pl-10"
                    value={fNis}
                    onChange={(e) => setFNis(e.target.value)}
                  />
                </div>
              </div>

              {/* Kelas */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-ink">Kelas</label>
                <select
                  className="h-11 w-full rounded-btn border border-line bg-paper px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-indigo/40"
                  value={fClassCode}
                  onChange={(e) => setFClassCode(e.target.value)}
                >
                  <option value="">Pilih kelas</option>
                  {classOptions.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Password (hanya untuk tambah) */}
              {!editId && (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-ink">Password Awal</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                    <Input
                      type="password"
                      placeholder="Min. 6 karakter"
                      className="pl-10"
                      value={fPassword}
                      onChange={(e) => setFPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <p className="mt-1 text-xs text-ink-soft">
                    Murid bisa mengganti password setelah login.
                  </p>
                </div>
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
                    <><Loader2 size={16} className="animate-spin" /> Menyimpan&hellip;</>
                  ) : editId ? (
                    <><Check size={16} /> Simpan</>
                  ) : (
                    <><Plus size={16} /> Tambah Murid</>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}

      {/* ── MODAL: Import CSV ── */}
      {modal === "import" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={closeModal} />
          <Card className="relative z-10 w-full max-w-md" padded>
            <h2 className="text-lg font-bold text-ink">Import Murid (CSV)</h2>
            <div className="mt-4 flex h-32 items-center justify-center rounded-card border-2 border-dashed border-indigo/40 bg-indigo-tint-soft/30 text-sm text-ink-soft">
              Drop file CSV di sini atau klik untuk pilih
            </div>
            <p className="mt-2 text-xs text-ink-soft">Format: Nama, NIS, Kelas, Email</p>
            <p className="text-xs text-ink-soft">(Coming soon)</p>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" fullWidth onClick={closeModal}>
                Tutup
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
