import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowLeft,
  ArrowRight,
  Bug,
  HelpCircle,
  Lightbulb,
  Mail,
} from "lucide-react";
import { ToriiMark } from "@/components/brand/Logo";
import { LandingFooter } from "@/components/landing/LandingFooter";

export const metadata: Metadata = {
  title: "Bantuan & Kontak — LinguaFlow",
  description:
    "Lapor bug, minta bantuan akun, atau kirim saran untuk LinguaFlow — platform belajar Bahasa Jepang murid SMK Texar.",
};

/* ─────────────────────────────────────────────────────────────
   GANTI DI SINI sebelum go-live:
   - WA_NUMBER    → nomor WhatsApp admin (format internasional, tanpa +)
   - CONTACT_EMAIL → email resmi LinguaFlow / SMK Texar
   ───────────────────────────────────────────────────────────── */
const WA_NUMBER = "6281234567890";
const WA_MESSAGE = "Halo LinguaFlow! Saya ingin melaporkan masalah / bertanya...";
const CONTACT_EMAIL = "bantuan@linguaflow.id";

const waLink = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_MESSAGE)}`;

const reasons = [
  {
    icon: Bug,
    title: "Lapor bug / masalah",
    desc: "Kuis error, skor tidak masuk, flashcard rusak, atau halaman terlihat aneh.",
  },
  {
    icon: HelpCircle,
    title: "Bantuan akun",
    desc: "Lupa password, tidak bisa login, atau data profil kamu salah.",
  },
  {
    icon: Lightbulb,
    title: "Ide & saran",
    desc: "Minta fitur baru atau kasih masukan biar belajar makin enak.",
  },
];

export default function KontakPage() {
  return (
    <div className="min-h-screen bg-cream">
      {/* ── Header simpel ── */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 pt-6 md:px-10">
        <Link href="/" className="flex items-center gap-2" aria-label="LinguaFlow — beranda">
          <ToriiMark width={22} height={22} />
          <span className="text-base font-bold tracking-tight text-navy">LinguaFlow</span>
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-navy/70 transition-colors hover:bg-navy/5 hover:text-navy"
        >
          <ArrowLeft size={15} />
          Kembali ke beranda
        </Link>
      </header>

      <main id="main-content" className="mx-auto w-full max-w-5xl px-6 pb-24 pt-14 md:px-10 md:pt-20">
        {/* ── Judul ── */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-jp-red">
            Bantuan & Kontak
          </p>
          <h1 className="mt-4 text-3xl font-bold leading-tight text-navy md:text-5xl">
            Ada yang mengganggu belajarmu?
          </h1>
          <div className="lf-stroke reveal mx-auto mt-5" />
          <p className="mt-5 text-ink-soft md:text-lg">
            Tim LinguaFlow siap bantu. Pilih masalahmu di bawah, atau langsung
            chat kami lewat WhatsApp — balasannya paling cepat di sana.
          </p>
        </div>

        {/* ── Isi: alasan menghubungi + kanal kontak ── */}
        <div className="mt-14 grid gap-8 md:grid-cols-2 md:gap-10">
          {/* Kiri: kapan harus hubungi */}
          <section aria-label="Alasan menghubungi" className="rounded-2xl border border-line bg-white p-6 shadow-soft md:p-8">
            <h2 className="text-base font-bold text-navy">
              Hubungi kami kalau…
            </h2>
            <ul className="mt-5 space-y-5">
              {reasons.map((r) => {
                const Icon = r.icon;
                return (
                  <li key={r.title} className="flex gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-jp-red/10 text-jp-red" aria-hidden="true">
                      <Icon size={18} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-navy">{r.title}</p>
                      <p className="mt-0.5 text-sm text-ink-soft">{r.desc}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Kanan: kanal kontak */}
          <div className="flex flex-col gap-5">
            {/* WhatsApp — kanal utama */}
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-2xl bg-navy p-6 shadow-xl shadow-navy/20 transition-all duration-300 hover:shadow-[0_20px_45px_-12px_rgba(18,32,58,0.45)] hover:-translate-y-0.5 md:p-8"
            >
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success/20 text-success">
                  {/* Logo WhatsApp */}
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.25 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.17.24-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29Z" />
                  </svg>
                </span>
                <div>
                  <p className="text-base font-bold text-cream">Chat WhatsApp</p>
                  <p className="text-sm text-cream/60">Balasan tercepat — langsung ke admin</p>
                </div>
              </div>
              <div className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-gold transition-transform duration-300 group-hover:translate-x-1">
                Buka chat
                <ArrowRight size={15} />
              </div>
            </a>

            {/* Email */}
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Bantuan LinguaFlow")}`}
              className="group flex items-center justify-between gap-4 rounded-2xl border border-line bg-white p-6 shadow-soft transition-all duration-300 hover:border-navy/20 hover:shadow-soft-lg md:p-8"
            >
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-tint-soft text-indigo" aria-hidden="true">
                  <Mail size={20} />
                </span>
                <div>
                  <p className="text-base font-bold text-navy">Kirim Email</p>
                  <p className="text-sm text-ink-soft">{CONTACT_EMAIL}</p>
                </div>
              </div>
              <ArrowRight size={18} className="shrink-0 text-ink-soft/40 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-navy" />
            </a>

            {/* Catatan murid */}
            <div className="rounded-2xl border border-gold/30 bg-gold/5 p-5 md:p-6">
              <p className="text-sm text-navy">
                <span className="font-bold">Murid SMK Texar:</span> kalau lagi di
                sekolah, bisa juga lapor langsung ke{" "}
                <span className="font-semibold">guru atau wali kelas</span> kamu —
                nanti diteruskan ke tim LinguaFlow.
              </p>
            </div>
          </div>
        </div>

        {/* ── CTA bawah ── */}
        <div className="mt-16 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full bg-navy px-8 py-3.5 text-sm font-bold text-cream shadow-lg shadow-navy/20 transition-all duration-300 hover:bg-navy-soft hover:scale-[1.02] active:scale-[0.98]"
          >
            Masuk ke kelas
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-8 py-3.5 text-sm font-bold text-navy transition-all duration-300 hover:bg-navy/5 hover:border-navy/30"
          >
            Lihat beranda
          </Link>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
