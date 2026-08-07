/**
 * Evaluasi ucapan: membandingkan transkrip Whisper dengan kalimat target.
 *
 * Metode: kemiripan Levenshtein pada teks yang sudah dinormalisasi
 * (tanda baca & spasi dibuang, katakana disamakan ke hiragana, partikel
 * は/へ/を dilonggarkan ke わ/え/お — Whisper sering menuliskannya persis
 * seperti bunyinya). Normalisasi diterapkan ke KEDUA sisi secara simetris,
 * jadi skor tetap adil.
 */

/** Karakter yang dianggap tanda baca/spasi — dibuang saat normalisasi. */
const PUNCT_CHARS = new Set([
  ..." \t、。！？!?.,，．・「」『』（）()…~〜ー—-:：;；",
]);

function toHiraganaChar(ch: string): string {
  const code = ch.codePointAt(0);
  return code !== undefined && code >= 0x30a1 && code <= 0x30f6
    ? String.fromCodePoint(code - 0x60)
    : ch;
}

/** Partikel dilonggarkan ke bunyinya (1:1, tidak mengubah panjang teks). */
function relaxParticle(ch: string): string {
  if (ch === "は") return "わ";
  if (ch === "へ") return "え";
  if (ch === "を") return "お";
  return ch;
}

export interface NormalizedSpeech {
  /** Teks ternormalisasi. */
  normalized: string;
  /** map[i] = indeks karakter di teks ASLI untuk karakter normalisasi ke-i. */
  map: number[];
}

/** Normalisasi + peta indeks ke teks asli (dipakai untuk highlight yang benar). */
export function normalizeSpeechWithMap(raw: string): NormalizedSpeech {
  const norm: string[] = [];
  const map: number[] = [];
  [...raw].forEach((ch, i) => {
    if (PUNCT_CHARS.has(ch)) return;
    norm.push(relaxParticle(toHiraganaChar(ch)));
    map.push(i);
  });
  return { normalized: norm.join("").toLowerCase(), map };
}

/** Buang tanda baca/spasi, katakana→hiragana, partikel dilonggarkan. */
export function normalizeSpeech(s: string): string {
  return normalizeSpeechWithMap(s).normalized;
}

/** Jarak Levenshtein — iteratif dengan dua baris DP (hemat memori). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

export interface PronunciationScore {
  /** 0–100, makin tinggi makin mirip dengan kalimat target. */
  score: number;
  /** Kalimat target setelah dinormalisasi. */
  target: string;
  /** Transkrip murid setelah dinormalisasi. */
  transcript: string;
  /** Cocok persis (setelah normalisasi). */
  exact: boolean;
}

/** Hitung skor kemiripan transkrip vs target. */
export function scorePronunciation(
  transcript: string,
  target: string,
): PronunciationScore {
  const t = normalizeSpeech(target);
  const tr = normalizeSpeech(transcript);
  if (!t || !tr) return { score: 0, target: t, transcript: tr, exact: false };

  const dist = levenshtein(t, tr);
  const maxLen = Math.max(t.length, tr.length);
  const score = Math.max(0, Math.round((1 - dist / maxLen) * 100));

  return { score, target: t, transcript: tr, exact: t === tr };
}

/** Label ramah sesuai rentang skor. */
export function scoreLabel(score: number): string {
  if (score >= 85) return "Luar biasa! 🎉";
  if (score >= 70) return "Bagus! Tinggal sedikit lagi.";
  if (score >= 50) return "Cukup — coba dengarkan contohnya lagi.";
  return "Perlu latihan lagi — jangan menyerah!";
}
