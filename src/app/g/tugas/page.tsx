"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Layers, FileCheck, Users, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { createTask } from "./actions";

const steps = ["Jenis", "Materi", "Target", "Deadline", "Preview"];

export default function AssignTaskWizard() {
  const router = useRouter();
  const supabase = createClient();
  const { profile: teacherProfile } = useAuth();

  const [classes, setClasses] = useState<{ code: string; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [fError, setFError] = useState<string | null>(null);
  const [loadingClasses, setLoadingClasses] = useState(true);

  const [step, setStep] = useState(1);
  const [type, setType] = useState<"flashcard" | "kuis" | null>(null);
  const [level, setLevel] = useState("N5");
  const [category, setCategory] = useState("Kata Kerja");
  const [target, setTarget] = useState("20");
  const [duration, setDuration] = useState("15");
  const [deadline, setDeadline] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  );
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  useEffect(() => {
    const teacherId = teacherProfile?.id;
    if (!teacherId) return;

    async function load() {
      setLoadingClasses(true);
      const { data: kelasRaw } = await supabase
        .from("classes")
        .select("code, name")
        .eq("teacher_id", teacherId)
        .order("name");

      const clsList = (kelasRaw || []).map((k: any) => ({
        code: k.code,
        name: k.name,
      }));
      setClasses(clsList);
      if (clsList.length > 0) setSelectedClass(clsList[0].name);
      setLoadingClasses(false);
    }

    load();
  }, [teacherProfile?.id, supabase]);

  async function handleSubmit() {
    if (!type || !selectedClass) return;

    const cls = classes.find((c) => c.name === selectedClass);
    if (!cls) return;

    setSubmitting(true);
    setFError(null);

    const fd = new FormData();
    fd.set("class_code", cls.code);
    fd.set("title", type === "kuis" ? `Kuis ${category} ${level}` : `Hafalan ${target} Kata ${level}`);
    fd.set("type", type);
    fd.set("level", level);
    fd.set("category", category);
    fd.set("target", target);
    fd.set("duration", duration);
    fd.set("deadline", deadline);

    const r = await createTask(fd);
    if (r?.error) {
      setFError(r.error);
      setSubmitting(false);
    } else {
      router.push("/g/dashboard");
    }
  }


  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-ink jp-rule">Assign Tugas</h1>

      {/* Step indicator */}
      <div className="mt-5 flex items-center">
        {steps.map((s, i) => (
          <div key={s} className="flex flex-1 items-center">
            <div className="flex items-center gap-2">
              <span
                className={
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold " +
                  (i + 1 < step
                    ? "bg-success text-white"
                    : i + 1 === step
                      ? "bg-indigo text-white"
                      : "bg-line text-ink-soft")
                }
              >
                {i + 1 < step ? <Check size={16} /> : i + 1}
              </span>
              <span className={"hidden text-xs font-semibold sm:block " + (i + 1 <= step ? "text-ink" : "text-ink-soft")}>
                {s}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span className={"mx-2 h-0.5 flex-1 " + (i + 1 < step ? "bg-success" : "bg-line")} />
            )}
          </div>
        ))}
      </div>

      <Card className="mt-6" padded>
        {/* Step 1 — type + class */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-bold tracking-tight text-ink">Jenis & Kelas</h2>
            <p className="text-sm text-ink-soft">Pilih jenis tugas dan kelas tujuan.</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => setType("flashcard")}
                className={
                  "flex items-center gap-3 rounded-btn border-2 p-4 text-left transition-colors " +
                  (type === "flashcard" ? "border-indigo bg-indigo-tint-soft/40" : "border-line")
                }
              >
                <Layers size={24} className="text-indigo" />
                <div>
                  <p className="font-bold text-ink">Flashcard Deck</p>
                  <p className="text-xs text-ink-soft">Hafalan vocabulary</p>
                </div>
                {type === "flashcard" && <Check size={18} className="ml-auto text-indigo" />}
              </button>
              <button
                onClick={() => setType("kuis")}
                className={
                  "flex items-center gap-3 rounded-btn border-2 p-4 text-left transition-colors " +
                  (type === "kuis" ? "border-indigo bg-indigo-tint-soft/40" : "border-line")
                }
              >
                <FileCheck size={24} className="text-indigo" />
                <div>
                  <p className="font-bold text-ink">Kuis</p>
                  <p className="text-xs text-ink-soft">Pilihan ganda / susun kalimat</p>
                </div>
                {type === "kuis" && <Check size={18} className="ml-auto text-indigo" />}
              </button>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-semibold text-ink">Kelas Tujuan</label>
              {loadingClasses ? (
                <p className="text-sm text-ink-soft">Memuat kelas...</p>
              ) : classes.length === 0 ? (
                <p className="text-sm text-ink-soft">Belum ada kelas yang diajar.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {classes.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => setSelectedClass(c.name)}
                      className={
                        "flex items-center gap-1.5 rounded-btn border px-3 py-2 text-sm font-semibold transition-colors " +
                        (selectedClass === c.name
                          ? "border-indigo bg-indigo-tint-soft/40 text-indigo"
                          : "border-line text-ink-soft")
                      }
                    >
                      <Users size={15} /> {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2 — material */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-bold tracking-tight text-ink">Pilih Materi Tugas</h2>
            <p className="text-sm text-ink-soft">
              Jenis: <span className="font-semibold text-indigo">{type === "kuis" ? "Kuis" : "Flashcard Deck"}</span> · Pilih materi yang akan dikerjakan murid.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-ink">Level</label>
                <Select value={level} onChange={(e) => setLevel(e.target.value)}>
                  <option>N5</option>
                  <option>N4</option>
                  <option>N3</option>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-ink">Kategori</label>
                <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option>Kata Benda</option>
                  <option>Kata Kerja</option>
                  <option>Kata Sifat</option>
                  <option>Partikel</option>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — target */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-bold tracking-tight text-ink">Target & Durasi</h2>
            <p className="text-sm text-ink-soft">Tentukan jumlah soal dan estimasi pengerjaan.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-ink">Jumlah Soal</label>
                <input
                  type="number"
                  min={1}
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="h-11 w-full rounded-btn border border-line bg-paper px-3 text-sm font-semibold focus:border-indigo focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-ink">Estimasi (menit)</label>
                <input
                  type="number"
                  min={1}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="h-11 w-full rounded-btn border border-line bg-paper px-3 text-sm font-semibold focus:border-indigo focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4 — deadline */}
        {step === 4 && (
          <div>
            <h2 className="text-lg font-bold tracking-tight text-ink">Tenggat Waktu</h2>
            <p className="text-sm text-ink-soft">Murid tidak bisa mengumpulkan setelah tenggat.</p>
            <div className="mt-4">
              <label className="mb-1 block text-sm font-semibold text-ink">Deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="h-11 w-full rounded-btn border border-line bg-paper px-3 text-sm font-semibold focus:border-indigo focus:outline-none sm:w-64"
              />
            </div>
          </div>
        )}

        {/* Step 5 — preview */}
        {step === 5 && (
          <div>
            <h2 className="text-lg font-bold tracking-tight text-ink">Preview & Konfirmasi</h2>
            <div className="mt-4 space-y-2 rounded-card bg-indigo-tint-soft/40 p-4">
              <Row k="Kelas" v={selectedClass ?? "—"} />
              <Row k="Jenis" v={type === "kuis" ? "Kuis" : "Flashcard Deck"} />
              <Row k="Materi" v={`${category} ${level}`} />
              <Row k="Target" v={`${target} soal · ${duration} menit`} />
              <Row k="Deadline" v={new Date(deadline).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} />
            </div>
          </div>
        )}
      </Card>

      {/* Error */}
      {fError && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {fError}
        </div>
      )}

      {/* Footer */}
      <div className="sticky bottom-0 z-10 mt-6 flex gap-3 border-t border-line bg-warm-white pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 md:pb-4">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
          Kembali
        </Button>
        {step < 5 ? (
          <Button className="flex-1" onClick={() => setStep((s) => Math.min(5, s + 1))}>
            Lanjut
          </Button>
        ) : (
          <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <><Loader2 size={16} className="animate-spin" /> Mengirim&hellip;</>
            ) : (
              "Kirim Tugas"
            )}
          </Button>
        )}
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-ink-soft">{k}</span>
      <span className="font-semibold text-ink">{v}</span>
    </div>
  );
}
