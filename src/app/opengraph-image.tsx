import { ImageResponse } from "next/og";

/**
 * OG card (1200×630) — dirender otomatis saat build menjadi PNG.
 * Dipakai untuk og:image & twitter:image lewat file convention Next.js.
 *
 * Font latin bawaan @vercel/og (Inter). Untuk teks Jepang, font Noto Sans JP
 * diambil saat build; bila gagal (jaringan), desain tetap ter-render tanpa
 * baris Jepang — tidak pernah merusak build.
 */

export const alt = "LinguaFlow — Platform belajar Bahasa Jepang interaktif";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Ambil Noto Sans JP (variable TTF, satu file) — null bila gagal. */
async function loadJapaneseFont(): Promise<
  { name: string; data: ArrayBuffer; weight: 400 }[] | null
> {
  try {
    const res = await fetch(
      "https://github.com/google/fonts/raw/main/ofl/notosansjp/NotoSansJP%5Bwght%5D.ttf",
      { signal: AbortSignal.timeout(15_000) },
    );
    if (!res.ok) return null;
    const data = await res.arrayBuffer();
    if (data.byteLength < 100_000) return null; // respons aneh — jangan dipakai
    return [{ name: "NotoJP", data, weight: 400 }];
  } catch {
    return null;
  }
}

export default async function OgImage() {
  const jpFont = await loadJapaneseFont();
  const jpFamily = jpFont ? "NotoJP" : "sans-serif";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "linear-gradient(135deg, #2b3a67 0%, #3d4f82 60%, #5a6fa8 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        {/* dekorasi lingkaran lembut */}
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -80,
            width: 420,
            height: 420,
            borderRadius: 9999,
            background: "rgba(255,255,255,0.06)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -140,
            left: -60,
            width: 360,
            height: 360,
            borderRadius: 9999,
            background: "rgba(255,255,255,0.05)",
            display: "flex",
          }}
        />
        {/* aksen vermillion */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 14,
            height: "100%",
            background: "#c8373a",
            display: "flex",
          }}
        />

        {/* Header: torii + nama */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg width="76" height="76" viewBox="0 0 32 32" fill="none">
            <path d="M3 9h26" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
            <path d="M5.5 13h21" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M9 13v14M23 13v14" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
            <path d="M6.5 13l1.6 0M24.5 13l-1.6 0" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: -1, display: "flex" }}>
            LinguaFlow
          </div>
        </div>

        {/* Tengah: tagline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {jpFont && (
            <div
              style={{
                fontFamily: jpFamily,
                fontSize: 76,
                fontWeight: 400,
                color: "#fc5d5c",
                display: "flex",
              }}
            >
              日本語を学ぼう
            </div>
          )}
          <div
            style={{
              fontSize: 40,
              lineHeight: 1.35,
              color: "rgba(255,255,255,0.92)",
              maxWidth: 880,
              display: "flex",
            }}
          >
            Platform belajar Bahasa Jepang interaktif untuk murid Indonesia —
            flashcard, kuis, latihan pelafalan &amp; AI Sensei.
          </div>
        </div>

        {/* Footer: URL */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "14px 28px",
              borderRadius: 9999,
              background: "rgba(255,255,255,0.14)",
              fontSize: 28,
              fontWeight: 600,
            }}
          >
            linguaflowdemo.vercel.app
          </div>
          <div style={{ fontSize: 24, color: "rgba(255,255,255,0.6)", display: "flex" }}>
            Mode Demo · JLPT N5–N3
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: jpFont ?? undefined,
    },
  );
}
