"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, FlaskConical } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { useDemoSession } from "@/lib/demo-session";
import { DEMO_ACCOUNT_LIST, type Role } from "@/lib/demo-data";

/** Halaman pemilih akun demo — pengganti halaman login di mode prototipe. */
export default function MasukPage() {
  const router = useRouter();
  const { role, signInAs } = useDemoSession();

  // Kalau sudah pernah memilih akun demo, langsung ke dashboard-nya.
  useEffect(() => {
    if (role) {
      const map: Record<Role, string> = {
        murid: "/m/dashboard",
        guru: "/g/dashboard",
        admin: "/a/dashboard",
      };
      router.replace(map[role]);
    }
  }, [role, router]);

  function choose(r: Role) {
    signInAs(r);
    const map: Record<Role, string> = {
      murid: "/m/dashboard",
      guru: "/g/dashboard",
      admin: "/a/dashboard",
    };
    router.push(map[r]);
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

        {/* Banner mode prototipe */}
        <div className="mb-4 flex items-start gap-2 rounded-card border border-gold/40 bg-gold/[0.06] p-3 text-sm text-ink-soft">
          <FlaskConical size={16} className="mt-0.5 shrink-0 text-gold" />
          <p>
            <span className="font-semibold text-ink">Mode Prototipe.</span> Belum ada
            sistem akun sungguhan — pilih salah satu akun demo di bawah untuk
            menjelajah. Data bersifat sementara.
          </p>
        </div>

        <div className="space-y-2.5">
          {DEMO_ACCOUNT_LIST.map((acc) => (
            <button
              key={acc.role}
              onClick={() => choose(acc.role)}
              className="group flex w-full items-center gap-3 rounded-card border border-line bg-paper p-4 text-left shadow-soft transition-all hover:border-indigo/40 hover:shadow-soft-lg"
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${acc.accent} text-sm font-bold text-white`}
              >
                {acc.label.charAt(0)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-ink">{acc.label}</span>
                <span className="block truncate text-xs text-ink-soft">{acc.sub}</span>
              </span>
              <ArrowRight
                size={18}
                className="shrink-0 text-ink-soft/40 transition-all group-hover:translate-x-0.5 group-hover:text-indigo"
              />
            </button>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-ink-soft">© 2026 LinguaFlow School</p>
      </div>
    </div>
  );
}
