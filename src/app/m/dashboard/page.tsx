"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Star,
  Clock,
  Bell,
  BookOpen,
  ListChecks,
  BookText,
  MessageCircle,
  Mic,
  ArrowRight,
  Flame,
} from "lucide-react";
import { StudentShell } from "@/components/layout/StudentShell";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { Card } from "@/components/ui/Card";
import { AnimatedPage, staggerContainer, staggerItem } from "@/components/ui/AnimatedPage";
import { useTimeGreeting } from "@/lib/time-greeting";
import { useProgress, babProgress } from "@/lib/progress";
import { useAuth } from "@/lib/auth-context";

const quickActions = [
  { label: "Kuis Harian", icon: ListChecks, href: "/m/kuis", desc: "Uji pemahaman" },
  { label: "Kamus", icon: BookText, href: "/m/kamus", desc: "Kosakata JLPT" },
  { label: "AI Sensei", icon: MessageCircle, href: "/m/sensei", desc: "Tanya grammar" },
  { label: "Latihan Ucapan", icon: Mic, href: "/m/speech", desc: "Speech AI" },
];

export default function StudentDashboard() {
  const timeGreeting = useTimeGreeting();
  const { profile } = useAuth();
  const [progress] = useProgress();

  const firstName = (profile?.full_name || "Murid").trim().split(/\s+/)[0] || "Murid";

  return (
    <StudentShell noHeader>
      <AnimatedPage>
        <motion.div variants={staggerContainer} initial="initial" animate="animate">
          {/* ════════════════════════════════════════ */}
          {/* HERO CARD — full-width header replacement */}
          {/* ════════════════════════════════════════ */}
          <motion.div variants={staggerItem}>
            {/* -mx-4 -mt-4 makes it stretch edge-to-edge, rounded-none at top, rounded-b-card at bottom */}
            <div className={"relative -mx-4 -mt-4 overflow-hidden bg-gradient-to-br px-5 pb-6 pt-12 text-white shadow-soft rounded-none rounded-b-card " + timeGreeting.gradient}>
              {/* Time-based decorative glow */}
              {timeGreeting.period === "malam" && (
                <div className="absolute inset-0 opacity-20" style={{background: "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.15) 0%, transparent 70%)"}} />
              )}
              {timeGreeting.period === "pagi" && (
                <div className="absolute inset-0" style={{background: "radial-gradient(ellipse at 20% 30%, rgba(255,200,100,0.25) 0%, transparent 60%)"}} />
              )}
              {/* Decorative */}
              <div className="seigaiha absolute inset-0 opacity-[0.07]" />
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/5" />
              <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/[0.03]" />

              <div className="relative">
                {/* Greeting row with notification bell */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white">
                      <timeGreeting.icon size={18} strokeWidth={2.25} />
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-white/70">{timeGreeting.greeting}</p>
                      <p className="text-sm font-bold leading-tight">{firstName}! {timeGreeting.jpGreeting}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {profile?.class_code && (
                      <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold">
                        {profile.class_code}
                      </span>
                    )}
                    <NotificationBell size={20} color="text-white" />
                  </div>
                </div>

                {/* Main CTA */}
                <div className="mt-4">
                  <h2 className="text-lg font-bold">Lanjutkan Belajar</h2>
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/70">Progress Bab</span>
                      <span className="font-bold text-gold">{babProgress(progress)}%</span>
                    </div>
                    <div className="mt-1.5 h-2.5 w-full rounded-full bg-white/20 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-vermillion to-[#fc5d5c]"
                        initial={{ width: "0%" }}
                        animate={{ width: `${babProgress(progress)}%` }}
                        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                      />
                    </div>
                  </div>

                  <Link href="/m/belajar/sesi">
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      className="mt-4 flex items-center justify-center gap-2 rounded-btn bg-white px-4 py-3 text-sm font-bold text-indigo transition-all hover:bg-white/90"
                    >
                      <BookOpen size={18} />
                      Lanjutkan Belajar
                      <ArrowRight size={18} />
                    </motion.div>
                  </Link>
                </div>

                {/* Mini stats row */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-btn bg-white/10 px-3 py-2 text-center">
                    <p className="text-2xl font-extrabold leading-none lf-stat">{progress.reviewed.length}</p>
                    <p className="mt-1 text-[10px] text-white/70">Kata</p>
                  </div>
                  <div className="rounded-btn bg-white/10 px-3 py-2 text-center">
                    <p className="text-2xl font-extrabold leading-none lf-stat"><Flame size={16} className="inline text-vermillion" /> {progress.streak}</p>
                    <p className="mt-1 text-[10px] text-white/70">Streak</p>
                  </div>
                  <div className="rounded-btn bg-white/10 px-3 py-2 text-center">
                    <p className="text-2xl font-extrabold leading-none lf-stat">{progress.xp}</p>
                    <p className="mt-1 text-[10px] text-white/70">Total XP</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stats row */}
          <motion.div variants={staggerItem} className="mt-4 grid grid-cols-2 gap-3">
            <Card className="flex items-center gap-3 transition-all hover:shadow-soft-lg">
              <span className="flex h-12 w-12 items-center justify-center text-vermillion">
                <Flame size={28} />
              </span>
              <div>
                <motion.p
                  className="text-3xl lf-stat lf-stat-vermillion"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  {progress.streak} hari
                </motion.p>
                <p className="text-xs text-ink-soft">Streak</p>
              </div>
            </Card>
            <Card className="flex items-center gap-3 transition-all hover:shadow-soft-lg">
              <span className="flex h-12 w-12 items-center justify-center text-gold">
                <Star size={28} className="text-gold" fill="currentColor" />
              </span>
              <div>
                <motion.p
                  className="text-3xl lf-stat lf-stat-gold"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                >
                  {progress.xp}
                </motion.p>
                <p className="text-xs text-ink-soft">XP</p>
              </div>
            </Card>
          </motion.div>

          {/* Pending tasks — honest empty state until teacher data is linked */}
          <motion.section variants={staggerItem} className="mt-6">
            <h2 className="lf-section-rule mb-4 flex items-center gap-2 text-base font-bold text-ink">
              <Clock size={18} className="text-indigo" /> Tugas Pending
            </h2>
            <Card className="flex items-center gap-3 py-5" padded>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-btn bg-indigo-tint-soft">
                <Bell size={18} className="text-indigo" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink">Belum ada tugas</p>
                <p className="text-xs text-ink-soft">Tugas dari guru akan muncul di sini.</p>
              </div>
            </Card>
          </motion.section>

          {/* Quick actions */}
          <motion.section variants={staggerItem} className="mt-6">
            <h2 className="lf-section-rule mb-4 text-base font-bold text-ink">Aksi Cepat</h2>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((q, i) => {
                const Icon = q.icon;
                return (
                  <motion.div
                    key={q.label}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.4 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Link href={q.href} className="group">
                      <Card interactive className="flex flex-col items-start gap-2 h-full" padded>
                        <span className="flex h-10 w-10 items-center justify-center rounded-btn bg-indigo-tint-soft group-hover:bg-indigo-tint-soft/80 transition-colors">
                          <Icon size={20} className="text-indigo" />
                        </span>
                        <span className="text-sm font-semibold text-ink">{q.label}</span>
                        <span className="text-[11px] text-ink-soft">{q.desc}</span>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>
        </motion.div>
      </AnimatedPage>
    </StudentShell>
  );
}
