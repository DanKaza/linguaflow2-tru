"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X, Send, Check, ClipboardList, Mic, BookOpen, BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useSchool } from "@/lib/school";

function StudentProgressModal() {
  const router = useRouter();
  const params = useSearchParams();
  const classId = params.get("class") ?? "";
  const nis = params.get("nis") ?? "";
  const name = params.get("name")?.trim() || "Murid";
  const [school, setSchool] = useSchool();
  const [tab, setTab] = useState<"ringkasan" | "kuis" | "ucapan" | "feedback">("ringkasan");
  const [feedback, setFeedback] = useState("");
  const [sent, setSent] = useState(false);

  const existing = school.submissions.find((s) => s.studentNis === nis && s.classId === classId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" />
      <Card className="relative z-10 max-h-[90vh] w-full max-w-[640px] overflow-y-auto p-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] md:p-6" padded={false}>
        <button
          onClick={() => router.back()}
          className="absolute right-4 top-4 text-ink-soft"
          aria-label="Tutup"
        >
          <X size={22} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-4">
          <Avatar name={name} size={56} />
          <div>
            <h2 className="text-xl font-bold text-ink">{name}</h2>
            <p className="text-sm text-ink-soft">
              {nis ? `NIS ${nis}` : "Murid"}{classId ? ` · ${classId}` : ""}
            </p>
          </div>
        </div>

        {/* Stats — belum ada sumber data asli per murid */}
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-btn bg-indigo-tint-soft p-2">
            <p className="text-sm font-bold text-indigo">—</p>
            <p className="text-[10px] text-ink-soft">Streak</p>
          </div>
          <div className="rounded-btn bg-indigo-tint-soft p-2">
            <p className="text-sm font-bold text-indigo">—</p>
            <p className="text-[10px] text-ink-soft">XP</p>
          </div>
          <div className="rounded-btn bg-indigo-tint-soft p-2">
            <p className="text-sm font-bold text-indigo">—</p>
            <p className="text-[10px] text-ink-soft">Level</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-5 flex gap-1 overflow-x-auto rounded-btn bg-indigo-tint-soft/50 p-1">
          {([
            { id: "ringkasan", label: "Ringkasan" },
            { id: "kuis", label: "Riwayat Kuis" },
            { id: "ucapan", label: "Riwayat Ucapan" },
            { id: "feedback", label: "Feedback" },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={
                "whitespace-nowrap flex-1 rounded-[0.5rem] px-3 py-2 text-sm font-semibold transition-colors " +
                (tab === t.id
                  ? "bg-paper text-indigo shadow-soft"
                  : "text-ink-soft hover:text-ink")
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {tab === "ringkasan" && (
            <div className="flex flex-col items-center rounded-card border border-line bg-paper py-10 text-center">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-tint-soft">
                <BarChart3 size={22} className="text-indigo/40" />
              </span>
              <p className="text-sm font-bold text-ink">Belum ada data aktivitas</p>
              <p className="mt-1 max-w-[16rem] text-xs text-ink-soft">
                Statistik belajar murid akan muncul setelah data belajar tersinkron dari aplikasi.
              </p>
            </div>
          )}
          {tab === "kuis" && (
            <div className="flex flex-col items-center rounded-card border border-line bg-paper py-10 text-center">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-tint-soft">
                <BookOpen size={22} className="text-indigo/40" />
              </span>
              <p className="text-sm font-bold text-ink">Belum ada riwayat kuis</p>
              <p className="mt-1 max-w-[16rem] text-xs text-ink-soft">
                Hasil kuis yang dikerjakan murid akan muncul di sini.
              </p>
            </div>
          )}
          {tab === "ucapan" && (
            <div className="flex flex-col items-center rounded-card border border-line bg-paper py-10 text-center">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-tint-soft">
                <Mic size={22} className="text-indigo/40" />
              </span>
              <p className="text-sm font-bold text-ink">Belum ada riwayat ucapan</p>
              <p className="mt-1 max-w-[16rem] text-xs text-ink-soft">
                Evaluasi latihan ucapan akan muncul di sini.
              </p>
            </div>
          )}
          {tab === "feedback" && (
            <div>
              <textarea
                rows={3}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder={`Tulis feedback untuk ${name}...`}
                className="w-full rounded-btn border border-line bg-warm-white p-3 text-sm focus:border-indigo focus:outline-none"
              />
              {sent && (
                <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-success">
                  <Check size={14} /> Feedback terkirim
                </p>
              )}
              <Button
                className="mt-2"
                size="sm"
                disabled={!feedback.trim()}
                onClick={() => {
                  if (existing) {
                    setSchool((prev) => ({
                      ...prev,
                      submissions: prev.submissions.map((s) =>
                        s.id === existing.id ? { ...s, note: feedback } : s,
                      ),
                    }));
                  }
                  setSent(true);
                }}
              >
                <Send size={15} /> Kirim Feedback
              </Button>
              {!existing && (
                <p className="mt-2 flex items-center gap-1 text-[11px] text-ink-soft/70">
                  <ClipboardList size={12} /> Feedback akan tersimpan setelah data submission tersinkron.
                </p>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <StudentProgressModal />
    </Suspense>
  );
}
