"use client";

import { motion } from "framer-motion";
import { Medal, TrendingUp, Calendar, Flame, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { StudentShell } from "@/components/layout/StudentShell";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { AnimatedPage, staggerContainer, staggerItem } from "@/components/ui/AnimatedPage";
import { useAuth } from "@/lib/auth-context";
import { useProgress } from "@/lib/progress";
import { useState } from "react";

type Filter = "kelas" | "sekolah" | "mingguan";

export default function Leaderboard() {
  const [filter, setFilter] = useState<Filter>("kelas");
  const { profile } = useAuth();
  const [progress] = useProgress();
  const userName = profile?.full_name || "Kamu";

  return (
    <StudentShell noHeader>
      <AnimatedPage>
        <motion.div variants={staggerContainer} initial="initial" animate="animate">
          <motion.div variants={staggerItem}>
            <h1 className="text-2xl font-bold text-ink">Peringkat</h1>
          </motion.div>

          {/* Filter tabs */}
          <motion.div variants={staggerItem} className="mt-4 flex gap-2" role="tablist" aria-label="Filter peringkat">
            {([
              { id: "kelas", label: "Kelas", icon: Medal },
              { id: "sekolah", label: "Sekolah", icon: TrendingUp },
              { id: "mingguan", label: "Mingguan", icon: Calendar },
            ] as { id: Filter; label: string; icon: React.ComponentType<{ size?: number }> }[]).map((f) => {
              const active = filter === f.id;
              return (
                <motion.button
                  key={f.id}
                  role="tab"
                  aria-selected={active}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-btn py-2.5 text-sm font-bold transition-colors cursor-pointer",
                    active ? "bg-indigo text-white shadow-soft" : "bg-paper text-ink-soft border border-line hover:border-indigo/30",
                  )}
                >
                  <f.icon size={16} />
                  {f.label}
                </motion.button>
              );
            })}
          </motion.div>

          {/* My rank card — real data dari progress */}
          <motion.div variants={staggerItem}>
            <Card className="mt-6 bg-indigo-tint-soft border-2 border-indigo/20 transition-all hover:shadow-soft-lg" padded>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo text-sm font-bold text-white">
                  —
                </span>
                <Avatar name={userName} size={36} />
                <div className="flex-1">
                  <p className="text-sm font-bold text-ink">Kamu</p>
                  <p className="text-xs text-ink-soft"><Flame size={14} className="inline text-vermillion" /> {progress.streak} hari streak</p>
                </div>
                <span className="text-sm font-bold text-indigo">{progress.xp} XP</span>
              </div>
            </Card>
          </motion.div>

          {/* Honest empty state — peringkat butuh data murid lain */}
          <motion.div variants={staggerItem} className="relative mt-10 flex flex-col items-center overflow-hidden rounded-card border border-line bg-paper py-14 text-center">
            <span className="lf-kanji-watermark pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 text-[140px]">競</span>
            <div className="seigaiha absolute inset-0 opacity-[0.05]" />
            <div className="relative">
              <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-tint-soft">
                <Trophy size={26} className="text-indigo/40" />
              </span>
              <p className="text-base font-bold text-ink">Peringkat belum tersedia</p>
              <p className="mx-auto mt-1 max-w-[16rem] text-xs text-ink-soft">
                Peringkat akan muncul setelah ada data belajar dari murid lain di kelas atau sekolahmu.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </AnimatedPage>
    </StudentShell>
  );
}
