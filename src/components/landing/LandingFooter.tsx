import Link from "next/link";
import { ToriiMark } from "@/components/brand/Logo";

export function LandingFooter() {
  return (
    <footer className="relative border-t border-line overflow-hidden">

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center gap-4 px-6 py-10 text-center md:flex-row md:justify-between md:px-10 md:py-12 md:text-left">
        <div className="flex items-center gap-2">
          <ToriiMark width={24} height={24} color="var(--color-jp-red)" />
          <span className="text-base font-bold tracking-tight text-navy">LinguaFlow</span>
        </div>
        <p className="max-w-md text-sm text-ink-soft">
          Platform belajar bahasa Jepang untuk murid SMK Texar —{" "}
          <span className="italic">designed with care, built for community.</span>
        </p>
        <div className="flex gap-5 text-sm font-semibold text-ink-soft">
          <Link href="/login" className="hover:text-navy transition-colors">Masuk</Link>
          <Link href="/kontak" className="hover:text-navy transition-colors">Kontak</Link>
        </div>
      </div>

      {/* Vermillion separator */}
      <div className="relative z-10 mx-auto h-px w-3/4 bg-line/50" />

      <div className="relative z-10 flex flex-col items-center gap-2 pb-6 pt-4">
        <span className="jp text-[10px] text-jp-red/30">言語の旅はここから始まる</span>
        <p className="text-xs text-ink-soft">© 2026 LinguaFlow · SMK Texar</p>
      </div>
    </footer>
  );
}
