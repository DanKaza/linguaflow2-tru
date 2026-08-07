"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Check if we have a valid session (from password reset email)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
      else router.push("/login");
    });
  }, [supabase, router]);

  async function handleSubmit(e: React.FormEvent) {
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

    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setError(err.message);
    } else {
      setDone(true);
    }
    setLoading(false);
  }

  if (!ready && !done) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 size={24} className="animate-spin text-indigo" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <div className="seigaiha pointer-events-none absolute inset-x-0 top-0 h-40 opacity-40" />

      <div className="relative w-full max-w-[420px]">
        <div className="mb-8 text-center">
          <Logo size={32} />
          <p className="mt-3 text-sm text-ink-soft">Buat Password Baru</p>
        </div>

        {done ? (
          <div className="rounded-card border border-line bg-paper p-6 text-center shadow-soft">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
              <CheckCircle2 size={28} className="text-success" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-ink">Password Diubah!</h2>
            <p className="mt-2 text-sm text-ink-soft">Password kamu berhasil diperbarui.</p>
            <Button fullWidth className="mt-6" onClick={() => router.push("/login")}>
              Ke Halaman Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-card border border-line bg-paper p-6 shadow-soft">
            <label className="mb-1.5 block text-sm font-semibold text-ink">Password Baru</label>
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

            <Button type="submit" fullWidth className="mt-5" disabled={loading || !password || !confirm}>
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> Menyimpan…</>
              ) : (
                "Simpan Password Baru"
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
