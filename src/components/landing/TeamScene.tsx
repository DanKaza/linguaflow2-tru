"use client";

import { motion } from "framer-motion";
import { viewportOnce, easeOut } from "@/lib/motion";
import { JapaneseCloud, CloudAccent } from "@/components/landing/JapaneseCloud";

const team = [
  { name: "Kelas", role: "Community", focus: "Belajar bareng, tumbuh bareng. Setiap murid punya tempat di sini.", initials: "学", num: "01" },
  { name: "Guru", role: "Guidance", focus: "Bimbingan yang nggak pernah berhenti, dari mereka yang peduli.", initials: "師", num: "02" },
  { name: "Teknologi", role: "Innovation", focus: "AI dan metode modern yang bikin belajar makin dekat dan personal.", initials: "技", num: "03" },
  { name: "Kreativitas", role: "Creativity", focus: "Dibangun dengan sepenuh hati, untuk sekolah yang menjadi rumah.", initials: "創", num: "04" },
];

const colors = [
  "from-jp-red/10 via-transparent to-transparent",
  "from-gold/10 via-transparent to-transparent",
  "from-navy/10 via-transparent to-transparent",
  "from-jp-red/5 via-gold/5 to-transparent",
];

export function TeamScene() {
  return (
    <section aria-label="Tim kami" id="tim" className="relative py-24 md:py-32 overflow-hidden">
      {/* Decorative Japanese clouds — Kasumi + mega mendung style */}
      <div className="pointer-events-none absolute top-8 right-0 w-[40%] max-w-[400px] translate-x-[10%] -translate-y-[8%] select-none">
        <JapaneseCloud
          variant="kasumi-medium"
          color="navy"
          className="blur-[1.5px]"
        />
      </div>
      <CloudAccent
        variant="kasumi-small"
        color="navy"
        className="blur-[1px] bottom-[10%] left-[2%] w-[28%] max-w-[260px]"
      />

      <div className="relative z-10 mx-auto max-w-6xl px-6 md:px-10">
        {/* ─── Puzzle Header ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.6, ease: easeOut }}
          className="mb-16 md:mb-24"
        >
          {/* The inkan stamp floats and overlaps */}
          <div className="relative inline-block">
            {/* Stamp — rotated, overlapping title */}
            <span
              className="absolute -top-2 -left-2 md:-top-4 md:-left-4 inline-flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-lg border-2 border-jp-red/80 text-jp-red font-bold text-lg md:text-xl rotate-[-6deg] select-none z-20 bg-cream/80 backdrop-blur-[2px] md:backdrop-blur-sm shadow-sm"
              style={{ fontFamily: "serif" }}
            >
              流
            </span>

            {/* Label — offset to the right of stamp */}
            <p className="text-[10px] md:text-xs font-semibold uppercase tracking-[0.4em] text-jp-red/70 ml-14 md:ml-24 mb-2">
              Community — The Spirit of SMK Texar
            </p>
          </div>

          {/* Title with organic layout */}
          <div className="relative mt-4 md:mt-6">
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-navy leading-[1.1] font-display">
              <span className="block">Bukan perusahaan.</span>
              <span className="block mt-1 font-display-italic italic font-light text-ink-soft/50 text-2xl md:text-3xl lg:text-4xl">
                Bukan startup. Tapi semangat.
              </span>
            </h2>


            {/* Organic brushstroke under title */}
            <svg className="mt-2 md:mt-4 w-40 md:w-56 h-4 text-jp-red/15" viewBox="0 0 200 16" fill="none" aria-hidden="true">
              <path d="M2 12 Q 50 0 100 10 Q 150 20 198 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
            </svg>            <p className="mt-4 md:mt-6 text-sm md:text-base text-ink-soft/60 max-w-xl leading-relaxed md:leading-loose">
              Sebuah sekolah yang percaya bahwa masa depan pendidikan
              bahasa dimulai dari kenyamanan, kedekatan, dan dedikasi.{" "}
              <span className="italic">
                Because the best learning happens when you feel at home.
              </span>
            </p>

          </div>
        </motion.div>

        {/* ─── Puzzle Cards Grid ─── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-4 lg:gap-6 items-start">
          {team.map((member, i) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportOnce}
              transition={{ duration: 0.6, ease: easeOut, delay: 0.1 + i * 0.12 }}
              className={`group relative ${i % 2 === 1 ? "md:translate-y-10" : ""} ${i === 3 ? "md:translate-x-4" : ""} ${i === 1 ? "md:-translate-x-4" : ""}`}
            >
              {/* Photo / Initials */}
              <div className={`relative aspect-[4/5] overflow-hidden rounded-xl border border-line/30 bg-gradient-to-br ${colors[i]} transition-all duration-500 group-hover:shadow-xl group-hover:scale-[1.02]`}>
                <div className="flex h-full w-full items-center justify-center">
                  <span className="text-5xl md:text-6xl font-bold text-navy/10 transition-all duration-500 group-hover:text-navy/20 group-hover:scale-110">
                    {member.initials}
                  </span>
                </div>
                {/* Number badge — organic placement */}
                <span className="absolute bottom-3 right-3 text-[11px] font-bold text-ink-soft/15">
                  {member.num}
                </span>
                {/* Hover gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-jp-red/[0.04] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>

              {/* Member info */}
              <div className="mt-4 md:mt-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-jp-red/70 mb-1.5">
                  {member.role}
                </p>
                <h3 className="text-base md:text-lg font-bold text-navy mb-1.5">
                  {member.name}
                </h3>
                <p className="text-xs md:text-sm text-ink-soft/60 leading-relaxed">
                  {member.focus}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Decorative bottom connector — organic wave */}
        <div className="mt-16 md:mt-24 flex justify-center" aria-hidden="true">
          <svg className="w-48 md:w-64 h-3 text-navy/[0.04]" viewBox="0 0 256 12" fill="none">
            <path d="M0 6 Q 32 0 64 6 Q 96 12 128 6 Q 160 0 192 6 Q 224 12 256 6" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </div>
      </div>
    </section>
  );
}
