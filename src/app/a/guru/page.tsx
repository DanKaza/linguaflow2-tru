"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Upload,
  Pencil,
  UserX,
  UserCheck,
  Trash2,
  Check,
  X,
  Mail,
  User as UserIcon,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import {
  DEMO_TEACHERS,
  DEMO_CLASSES,
  type DemoTeacher,
} from "@/lib/demo-data";

/* ───────── Guru type (dipakai UI) ───────── */
type GuruStatus = "aktif" | "nonaktif";

interface Guru {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  kelas: string[];
  status: GuruStatus;
}

/** Peta demo → bentuk UI. Kelas dihitung dari DEMO_CLASSES. */
function toGuru(t: DemoTeacher): Guru {
  return {
    id: t.id,
    full_name: t.full_name,
    email: t.email,
    avatar_url: t.avatar_url,
    kelas: DEMO_CLASSES.filter((c) => c.teacher_id === t.id).map((c) => c.name),
    status: t.status,
  };
}

const PROTOTYPE_MSG =
  "Mode prototipe — fitur ini dinonaktifkan. Data demo tidak tersimpan.";

/* ───────── Main page ───────── */
export default function KelolaGuru() {
  const [teachers, setTeachers] = useState<Guru[]>(() => DEMO_TEACHERS.map(toGuru));
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [fName, setFName] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fError, setFError] = useState<string | null>(null);

  /* ─── Search filter ─── */
  const q = search.toLowerCase();
  const filtered = useMemo(
    () =>
      teachers.filter(
        (t) =>
          t.full_name.toLowerCase().includes(q) ||
          t.email.toLowerCase().includes(q),
      ),
    [teachers, q],
  );

  /* ─── Open modals ─── */
  function openAdd() {
    setFName("");
    setFEmail("");
    setFError(null);
    setEditId(null);
    setModal("add");
  }

  function openEdit(guru: Guru) {
    setFName(guru.full_name);
    setFEmail(guru.email);
    setFError(null);
    setEditId(guru.id);
    setModal("edit");
  }

  function closeModal() {
    setModal(null);
    setEditId(null);
    setFError(null);
  }

  /* ─── Submit: Tambah / Edit (demo — state lokal saja) ─── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fName || !fEmail) return;
    setSubmitting(true);
    setFError(null);

    // Simulasi simpan (prototipe): update state lokal.
    if (editId) {
      setTeachers((prev) =>
        prev.map((g) => (g.id === editId ? { ...g, full_name: fName, email: fEmail } : g)),
      );
    } else {
      setTeachers((prev) => [
        ...prev,
        {
          id: `demo-guru-${Date.now()}`,
          full_name: fName,
          email: fEmail,
          avatar_url: null,
          kelas: [],
          status: "aktif",
        },
      ]);
    }

    closeModal();
    setSubmitting(false);
  }

  /* ─── Hapus guru (khusus status nonaktif) ─── */
  async function handleDelete(guru: Guru) {
    if (
      !confirm(
        `Hapus guru "${guru.full_name}" secara permanen? Tindakan ini tidak bisa dibatalkan.`,
      )
    )
      return;

    setDeletingId(guru.id);
    // Demo: hapus dari state lokal saja.
    setTeachers((prev) => prev.filter((t) => t.id !== guru.id));
    setDeletingId(null);
  }

  /* ─── Nonaktifkan / Aktifkan guru ─── */
  async function handleToggleStatus(guru: Guru) {
    setTogglingId(guru.id);
    setTeachers((prev) =>
      prev.map((g) =>
        g.id === guru.id
          ? { ...g, status: g.status === "aktif" ? "nonaktif" : "aktif" }
          : g,
      ),
    );
    setTogglingId(null);
  }

  /* ─── Render ─── */
  return (
    <>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink jp-rule">Kelola Guru</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => alert(PROTOTYPE_MSG)}>
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

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="mt-8 text-center text-sm text-ink-soft">
          {teachers.length === 0
            ? 'Belum ada guru. Klik "Tambah Guru" untuk memulai.'
            : "Tidak ada guru yang cocok dengan pencarian."}
        </div>
      )}

      {/* Mobile: card list */}
      {filtered.length > 0 && (
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
                  {g.status === "aktif" ? <UserX size={15} /> : <UserCheck size={15} />}
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
                    <Trash2 size={15} /> Hapus
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Desktop: table */}
      {filtered.length > 0 && (
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
                          {g.status === "aktif" ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                        {g.status === "nonaktif" && (
                          <button
                            className="text-error transition-colors hover:text-error/70"
                            aria-label="Hapus guru"
                            title="Hapus guru"
                            disabled={deletingId === g.id}
                            onClick={() => handleDelete(g)}
                          >
                            <Trash2 size={16} />
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

              {!editId && (
                <p className="rounded-lg bg-gold/[0.08] p-3 text-xs text-ink-soft">
                  Mode prototipe: guru baru hanya tersimpan sementara di sesi ini
                  (tidak ada akun login sungguhan).
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
                    <>
                      <Check size={16} /> Menyimpan&hellip;
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
