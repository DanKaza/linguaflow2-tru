"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/auth-context";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);

    const { error: err } = await resetPassword(email);
    if (err) {
      setError(err);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <div className="seigaiha pointer-events-none absolute inset-x-0 top-0 h-40 opacity-40" />

      <div className="relative w-full max-w-[420px]">
        <div className="mb-8 text-center">
          <Link href="/">
            <Logo size={32} />
          </Link>
          <p className="mt-3 text-sm text-ink-soft">Reset Password</p>
        </div>

        {sent ? (
          <div className="rounded-card border border-line bg-paper p-6 text-center shadow-soft">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
              <CheckCircle2 size={28} className="text-success" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-ink">Cek Email Kamu</h2>
            <p className="mt-2 text-sm text-ink-soft">
              Kami sudah kirim link reset password ke <span className="font-semibold text-ink">{email}</span>. 
              Klik link tersebut untuk membuat password baru.
            </p>
            <Link href="/login" className="mt-6 block">
              <Button fullWidth variant="outline">Kembali ke Login</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-card border border-line bg-paper p-6 shadow-soft">
            <p className="mb-5 text-sm text-ink-soft">
              Masukkan email yang terdaftar. Kami akan kirim link reset password.
            </p>

            <label className="mb-1.5 block text-sm font-semibold text-ink">Email</label>
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

            {error && (
              <p className="mt-3 text-sm text-red-500">{error}</p>
            )}

            <Button type="submit" fullWidth className="mt-5" disabled={loading || !email}>
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Mengirim…
                </>
              ) : (
                "Kirim Link Reset"
              )}
            </Button>

            <Link href="/login" className="mt-4 flex items-center justify-center gap-1 text-sm font-semibold text-indigo hover:underline">
              <ChevronLeft size={16} /> Kembali ke Login
            </Link>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-ink-soft">© 2026 LinguaFlow School</p>
      </div>
    </div>
  );
}
