"use client";

import { useState } from "react";
import { Building2, Save, Check, FlaskConical } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DEMO_SCHOOL, DEMO_PROFILES } from "@/lib/demo-data";

export default function PengaturanSekolah() {
  const adminProfile = DEMO_PROFILES.admin;

  const [name, setName] = useState(DEMO_SCHOOL.name);
  const [npsn, setNpsn] = useState(DEMO_SCHOOL.npsn);
  const [adminEmail, setAdminEmail] = useState(adminProfile.email);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;
    // Mode prototipe: tidak ada penyimpanan permanen.
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink jp-rule">Pengaturan Sekolah</h1>
        </div>
      </div>

      {/* Banner prototipe */}
      <div className="mt-4 flex items-start gap-2 rounded-card border border-gold/40 bg-gold/[0.06] p-3 text-sm text-ink-soft lg:w-2/3">
        <FlaskConical size={16} className="mt-0.5 shrink-0 text-gold" />
        <p>
          <span className="font-semibold text-ink">Mode Prototipe.</span> Pengaturan
          ditampilkan dari data demo dan tidak tersimpan permanen.
        </p>
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
              Status: <span className="font-semibold text-success">Mode Demo</span>
            </p>
            <p className="truncate text-xs">
              ID Sekolah: <code className="rounded bg-indigo-tint-soft px-1">{DEMO_SCHOOL.id}</code>
            </p>
          </div>
        </Card>

        {/* Save button */}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={!name}>
            <><Save size={16} /> Simpan Pengaturan</>
          </Button>

          {saved && (
            <span className="flex items-center gap-1 text-sm font-semibold text-success animate-in fade-in">
              <Check size={16} /> Tersimpan! (sesi ini)
            </span>
          )}
        </div>
      </form>
    </>
  );
}
