"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Mail, Loader2 } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/auth-context";

/** Inner component that uses useSearchParams */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, user, role, loading: authLoading } = useAuth();

  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const redirect = searchParams.get("redirect") || "";

  // If already logged in, redirect to appropriate dashboard
  useEffect(() => {
    if (!authLoading && user && role) {
      const map = { murid: "/m/dashboard", guru: "/g/dashboard", admin: "/a/dashboard" };
      router.push(redirect || map[role]);
    }
  }, [authLoading, user, role, router, redirect]);

  function translateError(msg: string): string {
    const lower = msg.toLowerCase();
    if (lower.includes("invalid login") || lower.includes("invalid credentials")) {
      return "Email atau password salah";
    }
    if (lower.includes("email not confirmed")) {
      return "Email belum diverifikasi. Cek inbox atau spam email kamu.";
    }
    if (lower.includes("rate limit")) {
      return "Terlalu banyak percobaan. Coba lagi nanti.";
    }
    if (lower.includes("user not found")) {
      return "Akun tidak ditemukan.";
    }
    return msg;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError(null);

    const { error: err } = await signIn(email, password);
    if (err) {
      setError(translateError(err));
    }
    // If no error, AuthContext's onAuthStateChange will trigger the effect above
    setLoading(false);
  }

  return (
    <>
      {searchParams.get("error") === "auth_callback_failed" && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          Gagal verifikasi akun. Silakan coba lagi.
        </div>
      )}

      <form onSubmit={submit} className="rounded-card border border-line bg-paper p-6 shadow-soft">
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

        <label className="mb-1.5 mt-4 block text-sm font-semibold text-ink">Password</label>
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
            placeholder="••••••••"
            required
          />
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-500">{error}</p>
        )}

        <Button type="submit" fullWidth className="mt-5" disabled={loading || !email || !password}>
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Memeriksa…
            </>
          ) : (
            "Masuk"
          )}
        </Button>

        <div className="mt-4 text-right">
          <Link href="/auth/forgot-password" className="text-sm font-semibold text-indigo hover:underline">
            Lupa password?
          </Link>
        </div>

        <div className="my-5 flex items-center gap-3 text-xs text-ink-soft">
          <span className="h-px flex-1 bg-line" /> atau <span className="h-px flex-1 bg-line" />
        </div>

        <Link href="/register">
          <Button fullWidth variant="outline">
            Daftar Akun Baru
          </Button>
        </Link>
      </form>

      <p className="mt-4 text-center text-xs text-ink-soft">
        Punya kode kelas?{" "}
        <Link href="/register" className="font-semibold text-indigo hover:underline">
          Daftar dengan Kode Kelas
        </Link>
      </p>
    </>
  );
}

/** Loading fallback for Suspense */
function LoginFallback() {
  return (
    <div className="rounded-card border border-line bg-paper p-6 shadow-soft">
      <div className="flex items-center justify-center py-8">
        <Loader2 size={24} className="animate-spin text-indigo" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <div className="seigaiha pointer-events-none absolute inset-x-0 top-0 h-40 opacity-40" />

      <div className="relative w-full max-w-[420px]">
        <div className="mb-8 text-center">
          <Link href="/">
            <Logo size={32} />
          </Link>
          <p className="mt-3 text-sm text-ink-soft">Belajar Bahasa Jepang, Setiap Hari</p>
        </div>

        <Suspense fallback={<LoginFallback />}>
          <LoginForm />
        </Suspense>

        <p className="mt-6 text-center text-xs text-ink-soft">© 2026 LinguaFlow School</p>
      </div>
    </div>
  );
}
