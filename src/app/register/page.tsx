"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Mail, User, Eye, EyeOff, Loader2 } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/auth-context";

export default function RegisterPage() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Password tidak cocok");
      return;
    }
    if (password.length < 6) {
      setError("Password minimal 6 karakter");
      return;
    }

    setLoading(true);
    setError(null);

    const { error: err } = await signUp(email, password, name);
    if (err) {
      setError(err);
    } else {
      setDone(true);
    }
    setLoading(false);
  }

  return (
    <div className="relative min-h-screen px-5 py-8">
      <div className="seigaiha pointer-events-none absolute inset-x-0 top-0 h-40 opacity-40" />
      <div className="relative mx-auto max-w-md">
        <Link href="/login" className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-indigo">
          <ChevronLeft size={18} /> Kembali
        </Link>

        <div className="mb-6 text-center">
          <Logo size={30} />
          <h1 className="mt-4 text-2xl font-bold text-ink">Buat Akun Baru</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {done ? "Cek email untuk verifikasi" : "Daftar untuk mulai belajar Bahasa Jepang"}
          </p>
        </div>

        {done ? (
          <div className="rounded-card border border-line bg-paper p-6 text-center shadow-soft">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-tint-soft">
              <Mail size={28} className="text-indigo" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-ink">Cek Email Kamu</h2>
            <p className="mt-2 text-sm text-ink-soft">
              Kami sudah kirim link konfirmasi ke <span className="font-semibold text-ink">{email}</span>.
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              Klik link tersebut untuk mengaktifkan akun, lalu login.
            </p>
            <Link href="/login" className="mt-6 block">
              <Button fullWidth>Ke Halaman Login</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="rounded-card border border-line bg-paper p-6 shadow-soft">
            {/* Step indicator */}
            <div className="mb-6 flex items-center justify-center gap-2 text-xs font-semibold">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo text-white">
                {step === 1 ? "1" : "✓"}
              </span>
              <span className="h-0.5 w-8 bg-indigo" />
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full ${
                  step >= 2 ? "bg-indigo text-white" : "bg-line text-ink-soft"
                }`}
              >
                2
              </span>
            </div>

            {step === 1 && (
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-ink">Nama Lengkap</label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ahmad Fauzi"
                    className="pl-10"
                    required
                  />
                </div>

                <label className="mb-1.5 mt-4 block text-sm font-semibold text-ink">Email</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="pl-10"
                    required
                  />
                </div>

                <Button
                  type="button"
                  fullWidth
                  className="mt-6"
                  disabled={!name || !email}
                  onClick={() => setStep(2)}
                >
                  Lanjut
                </Button>
              </div>
            )}

            {step === 2 && (
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-ink">Password</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft"
                    aria-label="Tampilkan password"
                  >
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  <Input
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    required
                    minLength={6}
                  />
                </div>

                <label className="mb-1.5 mt-4 block text-sm font-semibold text-ink">Konfirmasi Password</label>
                <Input
                  type={show ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Ketik ulang password"
                  required
                />

                {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

                <div className="mt-6 flex gap-3">
                  <Button variant="outline" fullWidth type="button" onClick={() => setStep(1)}>
                    Kembali
                  </Button>
                  <Button fullWidth type="submit" disabled={loading || !password || !confirm}>
                    {loading ? (
                      <><Loader2 size={18} className="animate-spin" /> Mendaftar…</>
                    ) : (
                      "Daftar"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </form>
        )}

        <p className="mt-4 text-center text-xs text-ink-soft">
          Sudah punya akun?{" "}
          <Link href="/login" className="font-semibold text-indigo hover:underline">
            Masuk
          </Link>
        </p>
      </div>
    </div>
  );
}
