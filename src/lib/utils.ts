import { type ClassValue } from "./types";

/**
 * Minimal className combiner (clsx + tailwind-merge style).
 * Filters falsy values and de-dupes conflicting Tailwind utility classes.
 */
function twMerge(classes: string[]): string {
  const seen = new Map<string, string>();
  const order = [
    "font",
    "text",
    "bg",
    "border",
    "rounded",
    "p",
    "px",
    "py",
    "pt",
    "pb",
    "pl",
    "pr",
    "m",
    "mx",
    "my",
    "mt",
    "mb",
    "ml",
    "mr",
    "flex",
    "grid",
    "w",
    "h",
    "min-w",
    "min-h",
    "max-w",
    "max-h",
    "gap",
    "items",
    "justify",
    "shadow",
    "opacity",
    "block",
    "inline",
    "hidden",
    "absolute",
    "relative",
    "fixed",
    "sticky",
  ];
  for (const cls of classes) {
    if (!cls) continue;
    const base = cls.split(":").pop()!.split("-")[0];
    const idx = order.indexOf(base);
    if (idx >= 0) seen.set(base, cls);
    else seen.set(cls, cls);
  }
  return Array.from(seen.values()).join(" ");
}

/**
 * Contoh kalimat khusus untuk kata yang tidak cocok dengan template umum
 * (kata ganti, angka, seruan, sufiks, dsb.). Dikurasi manual agar sesuai
 * konteks — mis. 私 → 私は学生です, bukan template generik yang aneh.
 */
const CURATED_EXAMPLES: Record<string, { jp: string; id: string }> = {
  // ── Kata ganti ──
  私: { jp: "私は学生です", id: "Saya adalah murid" },
  あなた: { jp: "あなたは学生ですか", id: "Apakah kamu murid?" },
  誰: { jp: "あの人は誰ですか", id: "Siapa orang itu?" },
  何: { jp: "これは何ですか", id: "Apa ini?" },
  // ── Kata seru ──
  はい: { jp: "はい、そうです", id: "Ya, benar" },
  いいえ: { jp: "いいえ、違います", id: "Tidak, bukan begitu" },
  ええ: { jp: "ええ、いいですよ", id: "Ya, tidak apa-apa" },
  さあ: { jp: "さあ、わかりません", id: "Hmm, saya tidak tahu" },
  こんにちは: { jp: "こんにちは、元気ですか", id: "Halo, apa kabar?" },
  ありがとう: { jp: "ありがとうございます", id: "Terima kasih" },
  これ: { jp: "これは本です", id: "Ini adalah buku" },
  それ: { jp: "それは本です", id: "Itu adalah buku" },
  あれ: { jp: "あれは何ですか", id: "Apa itu (di sana)?" },
  // ── Angka ──
  一: { jp: "本が一つあります", id: "Ada satu buku" },
  二: { jp: "本が二つあります", id: "Ada dua buku" },
  三: { jp: "本が三つあります", id: "Ada tiga buku" },
  四: { jp: "本が四つあります", id: "Ada empat buku" },
  五: { jp: "本が五つあります", id: "Ada lima buku" },
  六: { jp: "本が六つあります", id: "Ada enam buku" },
  七: { jp: "本が七つあります", id: "Ada tujuh buku" },
  八: { jp: "本が八つあります", id: "Ada delapan buku" },
  九: { jp: "本が九つあります", id: "Ada sembilan buku" },
  十: { jp: "人が十人います", id: "Ada sepuluh orang" },
  百: { jp: "これは百円です", id: "Ini seratus yen" },
  千: { jp: "これは千円です", id: "Ini seribu yen" },
  万: { jp: "一万人がいます", id: "Ada sepuluh ribu orang" },
  // ── Sufiks ──
  ちゃん: { jp: "花子ちゃん", id: "Hanako (panggilan akrab)" },
};

function hashOf(s: string): number {
  return [...s].reduce((a, c) => a + c.charCodeAt(0), 0);
}

/**
 * POS-based Japanese sentence templates.
 * Returns a contextually appropriate example sentence for a vocabulary word.
 *
 * Catatan: hanya memakai bentuk yang TIDAK butuh konjugasi (mis. verba selalu
 * dipakai bentuk kamus + こと), karena konjugasi ます/たい/ましょう memerlukan
 * analisis morfologis yang tidak ada di data POS.
 *
 * @returns { jp: string; id: string } — Japanese sentence & Indonesian translation
 */
export function makeJapaneseSentence(w: {
  kanji: string;
  furigana: string;
  romaji: string;
  arti: string;
  pos?: string;
}): { jp: string; id: string } {
  // Kata bermasalah → contoh khusus yang sudah sesuai konteks.
  const curated = CURATED_EXAMPLES[w.kanji] ?? CURATED_EXAMPLES[w.furigana];
  if (curated) return curated;

  const p = w.pos ?? "";
  const arti = w.arti.toLowerCase();
  const hash = hashOf(w.kanji);

  // ── Kata kerja / verb — bentuk kamus + こと (selalu benar, tanpa konjugasi) ──
  if (p.startsWith("v")) {
    const templates: (() => { jp: string; id: string })[] = [
      () => ({ jp: `私は毎日${w.kanji}ことが好きです`, id: `Saya suka ${arti} setiap hari` }),
      () => ({ jp: `${w.kanji}ことができます`, id: `Saya bisa ${arti}` }),
      () => ({ jp: `${w.kanji}ことをおすすめします`, id: `Saya menyarankan untuk ${arti}` }),
    ];
    return templates[hash % templates.length]();
  }

  // ── Kata sifat i ──
  if (p.startsWith("adj-i")) {
    const templates: (() => { jp: string; id: string })[] = [
      () => ({ jp: `とても${w.kanji}です`, id: `Sangat ${arti}` }),
      () => ({ jp: `${w.kanji}ですね`, id: `${arti} ya` }),
    ];
    return templates[hash % templates.length]();
  }

  // ── Kata sifat na ──
  if (p.startsWith("adj-na") || p.startsWith("a-")) {
    const templates: (() => { jp: string; id: string })[] = [
      () => ({ jp: `${w.kanji}です`, id: arti }),
      () => ({ jp: `ここは${w.kanji}です`, id: `Di sini ${arti}` }),
    ];
    return templates[hash % templates.length]();
  }

  // ── Kata penunjuk / adj-pn (この, あの, どんな…) & adj-no ──
  if (p.startsWith("adj-pn") || p.startsWith("adj-no")) {
    return { jp: `${w.kanji}本です`, id: `Buku ${arti}` };
  }

  // ── adj lainnya ──
  if (p.startsWith("adj")) {
    return { jp: `${w.kanji}です`, id: arti };
  }

  // ── Angka (num) ──
  if (p.startsWith("num")) {
    return { jp: `これは${w.kanji}です`, id: `Ini ${arti}` };
  }

  // ── Kata keterangan (adv) ──
  if (p.startsWith("adv")) {
    return { jp: `${w.kanji}勉強します`, id: `${arti} belajar` };
  }

  // ── Kata sambung (conj) ──
  if (p.startsWith("conj")) {
    return { jp: `${w.kanji}、学校へ行きます`, id: `${arti}, saya pergi ke sekolah` };
  }

  // ── Kata ganti / petunjuk (pn) ──
  if (p.startsWith("pn")) {
    return { jp: `これは${w.kanji}ですか`, id: `Apakah ini ${arti}?` };
  }

  // ── Kata seru (int) ──
  if (p.startsWith("int")) {
    return { jp: `${w.kanji}、そうですか`, id: `"${arti}", begitu ya` };
  }

  // ── Partikel (prt) ──
  if (p.startsWith("prt")) {
    return { jp: `${w.kanji}、これはペンです`, id: `Partikel "${w.kanji}": Ini adalah pena` };
  }

  // ── Prefiks / sufiks ──
  if (p.startsWith("pref") || p.startsWith("suf") || p.startsWith("n-pref")) {
    return { jp: `これは${w.kanji}です`, id: `Ini ${arti}` };
  }

  // ── Ungkapan (exp) ──
  if (p.startsWith("exp")) {
    return { jp: w.kanji, id: arti };
  }

  // ── Kata benda / default (n) ──
  const nounTemplates: (() => { jp: string; id: string })[] = [
    () => ({ jp: `ここに${w.kanji}があります`, id: `Ada ${arti} di sini` }),
    () => ({ jp: `${w.kanji}が好きです`, id: `Saya suka ${arti}` }),
    () => ({ jp: `${w.kanji}を見ました`, id: `Saya melihat ${arti}` }),
    () => ({ jp: `これは${w.kanji}です`, id: `Ini adalah ${arti}` }),
    () => ({ jp: `${w.kanji}を買いました`, id: `Saya membeli ${arti}` }),
  ];
  return nounTemplates[hash % nounTemplates.length]();
}

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  for (const i of inputs) {
    if (!i) continue;
    if (typeof i === "string") out.push(i);
    else if (Array.isArray(i)) out.push(cn(...i));
    else if (typeof i === "object") {
      for (const [k, v] of Object.entries(i)) if (v) out.push(k);
    }
  }
  return twMerge(out);
}
