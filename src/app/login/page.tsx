"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Mail, Loader2 } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Role = "murid" | "guru" | "admin";

function detectRole(email: string): Role {
  const e = email.toLowerCase();
  if (e.includes("admin") || e.includes("kepala") || e.includes("waka")) return "admin";
  if (e.includes("guru") || e.includes("bu") || e.includes("pak") || e.includes("sensei")) return "guru";
  return "murid";
}

const demos: { label: string; email: string; role: Role }[] = [
  { label: "Murid", email: "ahmad.fauzi@siswa.smk.id", role: "murid" },
  { label: "Guru", email: "siti.rahma@guru.smk.id", role: "guru" },
  { label: "Admin", email: "admin@smktexar.sch.id", role: "admin" },
];

export default function LoginPage() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function go(role: Role) {
    const map = { murid: "/m/dashboard", guru: "/g/dashboard", admin: "/a/dashboard" };
    router.push(map[role]);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    // Demo auth — no real backend. Simpan role ke localStorage.
    const role = detectRole(email);
    localStorage.setItem("lf_role", role);
    localStorage.setItem("lf_email", email);
    setTimeout(() => go(role), 700);
  }

  function quick(role: Role, mail: string) {
    setEmail(mail);
    setPassword("demo1234");
    localStorage.setItem("lf_role", role);
    localStorage.setItem("lf_email", mail);
    router.push(role === "murid" ? "/m/dashboard" : role === "guru" ? "/g/dashboard" : "/a/dashboard");
  }

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

        <form onSubmit={submit} className="rounded-card border border-line bg-paper p-6 shadow-soft">
          <label className="mb-1.5 block text-sm font-semibold text-ink">Email atau NIS</label>
          <div className="relative">
            <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <Input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ahmad.fauzi@siswa.smk.id"
              className="pl-10"
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
            />
          </div>

          <Button type="submit" fullWidth className="mt-5" disabled={loading || !email}>
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Memeriksa…
              </>
            ) : (
              "Masuk"
            )}
          </Button>

          <div className="mt-4 text-right">
            <a href="#" className="text-sm font-semibold text-indigo hover:underline">
              Lupa password?
            </a>
          </div>

          <div className="my-5 flex items-center gap-3 text-xs text-ink-soft">
            <span className="h-px flex-1 bg-line" /> atau <span className="h-px flex-1 bg-line" />
          </div>

          <Link href="/register">
            <Button fullWidth variant="outline">
              Daftar dengan Kode Kelas
            </Button>
          </Link>
        </form>
        <p className="mt-6 text-center text-xs text-ink-soft">© 2026 LinguaFlow School</p>
      </div>
    </div>
  );
}
