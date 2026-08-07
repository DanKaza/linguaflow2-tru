"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Pencil,
  Moon,
  LogOut,
  Settings,
  Shield,
  Bell,
  Star,
  Flame,
  BookOpen,
  Check,
  User as UserIcon,
  Loader2,
} from "lucide-react";
import { StudentShell } from "@/components/layout/StudentShell";
import { RoleSwitcher } from "@/components/layout/RoleSwitcher";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { AnimatedPage, staggerContainer, staggerItem } from "@/components/ui/AnimatedPage";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Input } from "@/components/ui/Input";
import { useTheme } from "@/lib/theme";
import { useProgress } from "@/lib/progress";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";

const languages = ["Indonesia", "English", "日本語"] as const;

type SheetKind = "profile" | "password" | "notif" | "language" | "logout" | null;

export default function Profil() {
  const { theme, toggle: toggleTheme } = useTheme();
  const dark = theme === "dark";
  const { profile, signOut, refreshProfile } = useAuth();
  const [progress] = useProgress();

  const [sheet, setSheet] = useState<SheetKind>(null);
  const [draftName, setDraftName] = useState(profile?.full_name ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifOn, setNotifOn] = useState(true);
  const [language, setLanguage] = useState("Indonesia");

  const fullName = profile?.full_name || "Murid";
  const classInfo = profile?.class_code || (profile?.role === "murid" ? "Murid" : "");

  async function saveProfile() {
    if (!profile) return;
    const name = draftName.trim();
    if (!name) {
      setError("Nama tidak boleh kosong.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ full_name: name })
        .eq("id", profile.id);
      if (updateError) throw new Error(updateError.message);
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      setSheet(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan profil.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <StudentShell noHeader>
      <AnimatedPage>
        <motion.div variants={staggerContainer} initial="initial" animate="animate">
          {/* Profile header */}
          <motion.div variants={staggerItem} className="relative flex flex-col items-center pt-4 text-center">
            <motion.div
              className="relative"
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <Avatar name={fullName} size={88} />
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => {
                  setDraftName(fullName);
                  setError(null);
                  setSheet("profile");
                }}
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-paper bg-indigo text-white shadow-soft transition-colors hover:bg-indigo-tint"
                aria-label="Edit profil"
              >
                <Pencil size={14} />
              </motion.button>
            </motion.div>
            <motion.h1
              className="mt-3 text-xl font-bold text-ink"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              {fullName}
            </motion.h1>
            <motion.p
              className="text-sm text-ink-soft"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {profile?.email || classInfo}
            </motion.p>
          </motion.div>

          {/* Stats grid with stagger */}
          <motion.div variants={staggerItem} className="mt-6 grid grid-cols-2 gap-3">
            {[
              { v: progress.xp.toLocaleString(), l: "Total XP", icon: Star },
              { v: `${progress.streak} Hari`, l: "Streak", icon: Flame },
              { v: progress.reviewed.length, l: "Kata Dipelajari", icon: BookOpen },
              { v: progress.totalSessions, l: "Sesi Selesai", icon: Check },
            ].map((s) => (
              <motion.div
                key={s.l}
                whileHover={{ y: -2 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <Card className="text-center transition-all hover:shadow-soft-lg">
                  <s.icon size={24} className="mx-auto text-indigo/60" />
                  <p className="mt-1 text-2xl lf-stat lf-stat-indigo">{s.v}</p>
                  <p className="text-xs text-ink-soft">{s.l}</p>
                </Card>
              </motion.div>
            ))}
          </motion.div>


          {/* Settings */}
          <motion.div variants={staggerItem} className="mt-4 space-y-1">
            {[
              { icon: Pencil, label: "Edit Profil", desc: "Nama, foto, kelas", kind: "profile" as const },
              { icon: Shield, label: "Ganti Password", desc: "Keamanan akun", kind: "password" as const },
              { icon: Bell, label: "Notifikasi", desc: notifOn ? "Aktif" : "Nonaktif", kind: "notif" as const },
              { icon: Moon, label: "Mode Gelap", toggle: true },
              { icon: Settings, label: "Bahasa", desc: language, kind: "language" as const },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <motion.button
                  key={s.label}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => (s.kind ? setSheet(s.kind) : toggleTheme())}
                  className="flex w-full items-center gap-3 rounded-btn px-3 py-3.5 text-left transition-colors hover:bg-indigo-tint-soft/60"
                >
                  <span className="flex h-9 w-9 items-center justify-center text-indigo/60">
                    <Icon size={18} />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-ink">{s.label}</p>
                    {"desc" in s && s.desc && (
                      <p className="text-[11px] text-ink-soft">{s.desc}</p>
                    )}
                  </div>
                  <div className="ml-auto">
                    {s.toggle ? (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTheme();
                        }}
                        className={
                          "relative inline-flex h-6 w-11 cursor-pointer rounded-full transition-colors duration-300 " +
                          (dark ? "bg-indigo" : "bg-line")
                        }
                      >
                        <motion.span
                          className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-soft"
                          animate={{ left: dark ? 22 : 2 }}
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        />
                      </span>
                    ) : (
                      <ChevronRight size={18} className="text-ink-soft" />
                    )}
                  </div>
                </motion.button>
              );
            })}
          </motion.div>

          {/* Logout */}
          <motion.div variants={staggerItem}>
            <Card className="mt-2 transition-all hover:shadow-soft-lg" padded>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setSheet("logout")}
                className="flex w-full items-center gap-3 text-sm font-bold text-vermillion"
              >
                <LogOut size={18} /> Keluar
              </motion.button>
            </Card>
          </motion.div>
        </motion.div>
      </AnimatedPage>

      {/* ─── Sheets ─── */}
      <BottomSheet open={sheet === "profile"} onClose={() => setSheet(null)} title="Edit Profil">
        <div className="space-y-4 pb-2">
          <div className="flex flex-col items-center">
            <Avatar name={draftName || fullName} size={72} />
            <p className="mt-2 text-[11px] text-ink-soft">Foto profil menyusul</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-soft">Nama</label>
            <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="Nama" />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-soft">Email</label>
            <Input value={profile?.email ?? ""} disabled className="opacity-60" />
          </div>
          {error && <p className="text-center text-xs font-semibold text-error">{error}</p>}
          <Button fullWidth size="lg" onClick={saveProfile} disabled={saving}>
            {saving ? <Loader2 size={18} className="animate-spin" /> : saved ? <Check size={18} /> : <UserIcon size={18} />}
            {saving ? "Menyimpan..." : saved ? "Tersimpan" : "Simpan Profil"}
          </Button>
        </div>
      </BottomSheet>

      <BottomSheet open={sheet === "password"} onClose={() => setSheet(null)} title="Ganti Password">
        <div className="space-y-3 pb-2">
          {["Password baru", "Konfirmasi password baru"].map((ph) => (
            <Input key={ph} type="password" placeholder={ph} />
          ))}
          <Button fullWidth size="lg" disabled className="opacity-60">
            <Shield size={18} /> Simpan (Segera Hadir)
          </Button>
          <p className="text-center text-[11px] text-ink-soft/60">
            Fitur ganti password akan segera tersedia.
          </p>
        </div>
      </BottomSheet>

      <BottomSheet open={sheet === "notif"} onClose={() => setSheet(null)} title="Notifikasi">
        <div className="space-y-3 pb-2">
          <div className="flex items-center justify-between rounded-card border border-line bg-paper p-3">
            <div>
              <p className="text-sm font-semibold text-ink">Pengingat belajar</p>
              <p className="text-[11px] text-ink-soft">Tiap hari 19:00 WIB</p>
            </div>
            <span
              onClick={() => setNotifOn(!notifOn)}
              className={
                "relative inline-flex h-6 w-11 cursor-pointer rounded-full transition-colors duration-300 " +
                (notifOn ? "bg-indigo" : "bg-line")
              }
            >
              <motion.span
                className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-soft"
                animate={{ left: notifOn ? 22 : 2 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              />
            </span>
          </div>
          <p className="text-center text-[11px] text-ink-soft/60">
            Preferensi disimpan di perangkat ini.
          </p>
        </div>
      </BottomSheet>

      <BottomSheet open={sheet === "language"} onClose={() => setSheet(null)} title="Bahasa">
        <div className="space-y-2 pb-2">
          {languages.map((l) => (
            <button
              key={l}
              onClick={() => {
                setLanguage(l);
                setSheet(null);
              }}
              className={
                "flex w-full items-center justify-between rounded-card border px-4 py-3 text-left text-sm font-semibold transition-colors " +
                (language === l
                  ? "border-indigo bg-indigo-tint-soft text-indigo"
                  : "border-line bg-paper text-ink hover:bg-indigo-tint-soft/40")
              }
            >
              {l}
              {language === l && <Check size={18} />}
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet open={sheet === "logout"} onClose={() => setSheet(null)} title="Keluar">
        <div className="space-y-3 pb-2">
          <p className="text-center text-sm text-ink-soft">
            Kamu akan keluar dari akun ini di perangkat ini.
          </p>
          <Button
            fullWidth
            size="lg"
            variant="primary"
            onClick={() => signOut()}
            className="bg-vermillion"
          >
            <LogOut size={18} /> Ya, Keluar
          </Button>
          <Button fullWidth variant="outline" onClick={() => setSheet(null)}>
            Batal
          </Button>
        </div>
      </BottomSheet>
    </StudentShell>
  );
}
