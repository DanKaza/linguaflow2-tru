"use client";

import { useState, useEffect } from "react";
import { Building2, Save, Loader2, Check, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { saveSchoolSettings } from "./actions";

export default function PengaturanSekolah() {
  const supabase = createClient();
  const { profile: adminProfile, refreshProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [npsn, setNpsn] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  // Load existing school data
  useEffect(() => {
    async function load() {
      if (!adminProfile?.school_id) {
        // Belum ada sekolah — default dari profile admin
        setName(adminProfile?.full_name ? `Sekolah ${adminProfile.full_name}` : "");
        setAdminEmail(adminProfile?.email ?? "");
        setLoading(false);
        return;
      }

      const { data: school } = await supabase
        .from("schools")
        .select("name, npsn")
        .eq("id", adminProfile.school_id)
        .single();

      if (school) {
        setName(school.name);
        setNpsn(school.npsn ?? "");
      }
      setAdminEmail(adminProfile?.email ?? "");
      setLoading(false);
    }
    load();
  }, [adminProfile, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;
    setSubmitting(true);
    setError(null);
    setSaved(false);

    const fd = new FormData();
    fd.set("name", name);
    fd.set("npsn", npsn);
    fd.set("admin_email", adminEmail);

    const result = await saveSchoolSettings(fd);
    if (result?.error) {
      setError(result.error);
    } else {
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSubmitting(false);
  }

  /* ─── Render ─── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-ink-soft">
        <Loader2 size={18} className="animate-spin" /> Memuat pengaturan&hellip;
      </div>
    );
  }

  const hasNoSchool = !adminProfile?.school_id;

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink jp-rule">Pengaturan Sekolah</h1>
          {hasNoSchool && (
            <p className="mt-1 text-sm text-gold">
              Konfigurasi sekolah diperlukan sebelum bisa menggunakan dashboard.
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4 lg:w-2/3">
        {/* Profil sekolah */}
        <Card padded>
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-indigo" />
            <h2 className="text-base font-bold text-ink">Profil Sekolah</h2>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink">
                Nama Sekolah <span className="text-error">*</span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Misal: SMK Texar"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink">NPSN</label>
              <Input
                value={npsn}
                onChange={(e) => setNpsn(e.target.value)}
                placeholder="Nomor Pokok Sekolah Nasional"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink">Email Admin</label>
              <Input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@sekolah.sch.id"
              />
            </div>
          </div>
        </Card>

        {/* Info sistem */}
        <Card padded>
          <h2 className="text-sm font-bold text-ink">Informasi Sistem</h2>
          <div className="mt-3 space-y-2 text-sm text-ink-soft">
            <p>
              Status:{ " " }
              {hasNoSchool ? (
                <span className="font-semibold text-gold">Belum dikonfigurasi</span>
              ) : (
                <span className="font-semibold text-success">Terkonfigurasi</span>
              )}
            </p>
            {adminProfile?.school_id && (
              <p className="truncate text-xs">
                ID Sekolah: <code className="rounded bg-indigo-tint-soft px-1">{adminProfile.school_id}</code>
              </p>
            )}
          </div>
        </Card>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            <X size={16} /> {error}
          </div>
        )}

        {/* Save button */}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={submitting || !name}>
            {submitting ? (
              <><Loader2 size={16} className="animate-spin" /> Menyimpan&hellip;</>
            ) : (
              <><Save size={16} /> Simpan Pengaturan</>
            )}
          </Button>

          {saved && (
            <span className="flex items-center gap-1 text-sm font-semibold text-success animate-in fade-in">
              <Check size={16} /> Tersimpan!
            </span>
          )}
        </div>
      </form>
    </>
  );
}
