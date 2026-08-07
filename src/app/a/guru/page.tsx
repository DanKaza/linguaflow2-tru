"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Upload,
  Pencil,
  UserX,
  UserCheck,
  Trash2,
  Loader2,
  Check,
  X,
  Mail,
  Lock,
  User as UserIcon,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import {
  createTeacher,
  updateTeacher,
  setTeacherStatus,
  deleteTeacher,
  getBannedTeacherStatuses,
} from "./actions";

/* ───────── Guru type ───────── */
type GuruStatus = "aktif" | "nonaktif";

interface Guru {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  kelas: string[];
  status: GuruStatus;
}

/* ───────── Main page ───────── */
export default function KelolaGuru() {
  const supabase = createClient();
  const { profile: adminProfile } = useAuth();

  const [teachers, setTeachers] = useState<Guru[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [fName, setFName] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fPassword, setFPassword] = useState("");
  const [fError, setFError] = useState<string | null>(null);

  /* ─── Fetch teachers ─── */
  const fetchTeachers = useCallback(async () => {
    if (!adminProfile?.school_id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select(
        `id, full_name, email, avatar_url,
         kelas:classes!teacher_id ( name )`,
      )
      .eq("role", "guru")
      .eq("school_id", adminProfile.school_id)
      .order("full_name");

    if (error) {
      console.error("Gagal ambil data guru:", error);
    } else if (data) {
      const mapped: Guru[] = data.map((row: any) => ({
        id: row.id ?? "",
        full_name: row.full_name ?? "",
        email: row.email ?? "",
        avatar_url: row.avatar_url ?? null,
        kelas: Array.isArray(row.kelas)
          ? row.kelas.map((c: any) => c.name).filter(Boolean)
          : [],
        status: "aktif" as GuruStatus,
      }));

      // Status ban (aktif/nonaktif) tidak bisa dibaca lewat RLS client
      // → ambil via Server Action dengan Admin API.
      try {
        const banMap = await getBannedTeacherStatuses(mapped.map((g) => g.id));
        for (const g of mapped) {
          if (banMap[g.id]) g.status = "nonaktif";
        }
      } catch (err) {
        console.error("Gagal ambil status guru:", err);
      }

      setTeachers(mapped);
    }
    setLoading(false);
  }, [supabase, adminProfile?.school_id]);

  useEffect(() => {
    if (adminProfile?.school_id) fetchTeachers();
  }, [adminProfile?.school_id, fetchTeachers]);

  /* ─── Search filter ─── */
  const q = search.toLowerCase();
  const filtered = teachers.filter(
    (t) =>
      t.full_name.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q),
  );

  /* ─── Open modals ─── */
  function openAdd() {
    setFName("");
    setFEmail("");
    setFPassword("");
    setFError(null);
    setEditId(null);
    setModal("add");
  }

  function openEdit(guru: Guru) {
    setFName(guru.full_name);
    setFEmail(guru.email);
    setFPassword("");
    setFError(null);
    setEditId(guru.id);
    setModal("edit");
  }

  function closeModal() {
    setModal(null);
    setEditId(null);
    setFError(null);
  }

  /* ─── Submit: Tambah / Edit ─── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fName || !fEmail) return;
    setSubmitting(true);
    setFError(null);

    try {
      const fd = new FormData();
      fd.set("full_name", fName);
      fd.set("email", fEmail);

      if (editId) {
        // Edit — panggil Server Action
        fd.set("id", editId);
        const result = await updateTeacher(fd);
        if (result?.error) throw new Error(result.error);
      } else {
        // Tambah — panggil Server Action dengan service_role (session admin aman)
        if (!fPassword) {
          setFError("Password harus diisi untuk guru baru.");
          setSubmitting(false);
          return;
        }
        fd.set("password", fPassword);
        fd.set("school_id", adminProfile?.school_id ?? "");
        const result = await createTeacher(fd);
        if (result?.error) throw new Error(result.error);
      }

      closeModal();
      fetchTeachers();
    } catch (err: any) {
      setFError(err?.message || "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ─── Hapus guru (khusus status nonaktif) ─── */
  async function handleDelete(guru: Guru) {
    if (
      !confirm(
        `Hapus guru "${guru.full_name}" secara permanen?\nAkun, profil, dan akses login guru akan dihapus. Tindakan ini tidak bisa dibatalkan.`,
      )
    )
      return;

    setDeletingId(guru.id);
    try {
      const fd = new FormData();
      fd.set("id", guru.id);
      const result = await deleteTeacher(fd);
      if (result?.error) throw new Error(result.error);
      // Hapus dari state lokal tanpa perlu refetch penuh
      setTeachers((prev) => prev.filter((t) => t.id !== guru.id));
    } catch (err: any) {
      alert(err?.message || "Gagal menghapus guru.");
    } finally {
      setDeletingId(null);
    }
  }

  /* ─── Nonaktifkan / Aktifkan guru ─── */
  async function handleToggleStatus(guru: Guru) {
    const deactivating = guru.status === "aktif";
    const target = deactivating ? "nonaktifkan" : "aktifkan";

    const msg = deactivating
      ? `Nonaktifkan guru "${guru.full_name}"?\nGuru tidak akan bisa login sampai diaktifkan kembali.`
      : `Aktifkan kembali guru "${guru.full_name}"?`;
    if (!confirm(msg)) return;

    setTogglingId(guru.id);
    try {
      const fd = new FormData();
      fd.set("id", guru.id);
      fd.set("activate", deactivating ? "0" : "1");
      const result = await setTeacherStatus(fd);
      if (result?.error) throw new Error(result.error);
      fetchTeachers();
    } catch (err: any) {
      alert(err?.message || `Gagal ${target} guru.`);
    } finally {
      setTogglingId(null);
    }
  }

  /* ─── Render ─── */
  return (
    <>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink jp-rule">Kelola Guru</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => alert("Import CSV (coming soon)")}>
            <Upload size={15} /> Import CSV
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus size={15} /> Tambah Guru
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mt-5 max-w-sm">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
        <Input
          placeholder="Cari guru..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-ink-soft">
          <Loader2 size={18} className="animate-spin" /> Memuat data guru&hellip;
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="mt-8 text-center text-sm text-ink-soft">
          {teachers.length === 0
            ? 'Belum ada guru. Klik "Tambah Guru" untuk memulai.'
            : "Tidak ada guru yang cocok dengan pencarian."}
        </div>
      )}

      {/* Mobile: card list */}
      {!loading && (
        <div className="mt-4 space-y-3 md:hidden">
          {filtered.map((g) => (
            <Card key={g.id} padded>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={g.full_name} size={40} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{g.full_name}</p>
                    <p className="truncate text-xs text-ink-soft">{g.email}</p>
                  </div>
                </div>
                <Badge tone={g.status === "aktif" ? "success" : "neutral"}>
                  {g.status === "aktif" ? "Aktif" : "Nonaktif"}
                </Badge>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-sm">
                <span className="text-ink-soft">
                  {g.kelas?.length || 0} kelas
                </span>
                <div className="flex flex-wrap justify-end gap-1">
                  {g.kelas?.length ? (
                    g.kelas.map((c) => (
                      <Badge key={c} tone="indigo">
                        {c}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-ink-soft">&mdash;</span>
                  )}
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => openEdit(g)}
                >
                  <Pencil size={15} /> Edit
                </Button>
                <Button
                  variant={g.status === "aktif" ? "ghost" : "outline"}
                  size="sm"
                  className={`flex-1 ${
                    g.status === "aktif" ? "text-error" : "text-success"
                  }`}
                  disabled={togglingId === g.id}
                  onClick={() => handleToggleStatus(g)}
                >
                  {togglingId === g.id ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : g.status === "aktif" ? (
                    <UserX size={15} />
                  ) : (
                    <UserCheck size={15} />
                  )}
                  {g.status === "aktif" ? "Nonaktifkan" : "Aktifkan"}
                </Button>
                {g.status === "nonaktif" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-error"
                    disabled={deletingId === g.id}
                    onClick={() => handleDelete(g)}
                  >
                    {deletingId === g.id ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Trash2 size={15} />
                    )}
                    Hapus
                  </Button>
                )}
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
                  <th className="px-4 py-3">Guru</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Kelas</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((g) => (
                  <tr key={g.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={g.full_name} size={32} />
                        <span className="font-semibold text-ink">{g.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{g.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {g.kelas?.length ? (
                          g.kelas.map((c) => (
                            <Badge key={c} tone="indigo">
                              {c}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-ink-soft">&mdash;</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={g.status === "aktif" ? "success" : "neutral"}>
                        {g.status === "aktif" ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          className="text-indigo transition-colors hover:text-indigo/70"
                          aria-label="Edit"
                          onClick={() => openEdit(g)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className={
                            g.status === "aktif"
                              ? "text-ink-soft transition-colors hover:text-error"
                              : "text-success transition-colors hover:text-success/70"
                          }
                          aria-label={
                            g.status === "aktif" ? "Nonaktifkan" : "Aktifkan"
                          }
                          title={
                            g.status === "aktif" ? "Nonaktifkan" : "Aktifkan"
                          }
                          disabled={togglingId === g.id}
                          onClick={() => handleToggleStatus(g)}
                        >
                          {togglingId === g.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : g.status === "aktif" ? (
                            <UserX size={16} />
                          ) : (
                            <UserCheck size={16} />
                          )}
                        </button>
                        {g.status === "nonaktif" && (
                          <button
                            className="text-error transition-colors hover:text-error/70"
                            aria-label="Hapus guru"
                            title="Hapus guru"
                            disabled={deletingId === g.id}
                            onClick={() => handleDelete(g)}
                          >
                            {deletingId === g.id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Modal: Tambah / Edit Guru ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={closeModal} />

          <Card className="relative z-10 w-full max-w-md animate-in fade-in zoom-in-95 duration-200" padded>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">
                {editId ? "Edit Guru" : "Tambah Guru"}
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
                    placeholder="guru@sekolah.sch.id"
                    className="pl-10"
                    value={fEmail}
                    onChange={(e) => setFEmail(e.target.value)}
                    required
                  />
                </div>
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
                    Guru bisa mengganti password setelah login.
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
                    <>
                      <Loader2 size={16} className="animate-spin" /> Menyimpan&hellip;
                    </>
                  ) : editId ? (
                    <>
                      <Check size={16} /> Simpan
                    </>
                  ) : (
                    <>
                      <Plus size={16} /> Tambah Guru
                    </>
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
