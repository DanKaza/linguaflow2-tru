"use client";

/**
 * Romaji (pelafalan Latin) untuk teks Jepang — dipakai sebagai subtitle
 * di chat AI Sensei supaya pemula bisa membaca pelafalan tanpa bolak-balik
 * ke Google Translate.
 *
 * 1) Sumber utama: endpoint gratis Google Translate (`client=gtx`, `dt=rm`).
 *    Akurat untuk teks ber-kanji — tidak bisa ditangani konversi kana lokal.
 * 2) Fallback: konversi kana→romaji (Hepburn-ish) tanpa jaringan, menangani
 *    hiragana/katakana saja (kanji dihilangkan). Dipakai bila Google sedang
 *    tidak terjangkau.
 */

const GTX_ROMANIZE_URL =
  "https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=ja&dt=t&dt=rm&q=";

/* ── Konversi kana → romaji (di-port dari scripts/build-vocab.mjs) ── */

const KANA: Record<string, string> = {
  あ: "a", い: "i", う: "u", え: "e", お: "o",
  か: "ka", き: "ki", く: "ku", け: "ke", こ: "ko",
  さ: "sa", し: "shi", す: "su", せ: "se", そ: "so",
  た: "ta", ち: "chi", つ: "tsu", て: "te", と: "to",
  な: "na", に: "ni", ぬ: "nu", ね: "ne", の: "no",
  は: "ha", ひ: "hi", ふ: "fu", へ: "he", ほ: "ho",
  ま: "ma", み: "mi", む: "mu", め: "me", も: "mo",
  や: "ya", ゆ: "yu", よ: "yo",
  ら: "ra", り: "ri", る: "ru", れ: "re", ろ: "ro",
  わ: "wa", を: "o", ん: "n",
  が: "ga", ぎ: "gi", ぐ: "gu", げ: "ge", ご: "go",
  ざ: "za", じ: "ji", ず: "zu", ぜ: "ze", ぞ: "zo",
  だ: "da", ぢ: "ji", づ: "zu", で: "de", ど: "do",
  ば: "ba", び: "bi", ぶ: "bu", べ: "be", ぼ: "bo",
  ぱ: "pa", ぴ: "pi", ぷ: "pu", ぺ: "pe", ぽ: "po",
};

/** yōon clusters: base kana + small ゃ/ゅ/ょ. */
const YOON: Record<string, string> = {
  きゃ: "kya", きゅ: "kyu", きょ: "kyo",
  ぎゃ: "gya", ぎゅ: "gyu", ぎょ: "gyo",
  しゃ: "sha", しゅ: "shu", しょ: "sho",
  じゃ: "ja", じゅ: "ju", じょ: "jo",
  ちゃ: "cha", ちゅ: "chu", ちょ: "cho",
  にゃ: "nya", にゅ: "nyu", にょ: "nyo",
  ひゃ: "hya", ひゅ: "hyu", ひょ: "hyo",
  びゃ: "bya", びゅ: "byu", びょ: "byo",
  ぴゃ: "pya", ぴゅ: "pyu", ぴょ: "pyo",
  みゃ: "mya", みゅ: "myu", みょ: "myo",
  りゃ: "rya", りゅ: "ryu", りょ: "ryo",
};

/** Katakana → hiragana agar lookup & romaji memakai satu tabel. */
function toHiragana(s: string): string {
  return [...s]
    .map((c) => {
      const code = c.codePointAt(0);
      return code !== undefined && code >= 0x30a1 && code <= 0x30f6
        ? String.fromCodePoint(code - 0x60)
        : c;
    })
    .join("");
}

function kanaToRomaji(input: string): string {
  const chars = [...toHiragana(input)];
  let out = "";
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];

    // Long vowel ー → ulangi vokal sebelumnya
    if (ch === "ー") {
      const last = out[out.length - 1];
      if (last && /[aeiou]/.test(last)) out += last;
      continue;
    }

    // Sokuon っ → geminasi konsonan berikut
    if (ch === "っ") {
      const next = chars[i + 1];
      if (next === "ち") out += "t";
      else if (next === "し") out += "s";
      else if (next === "つ") out += "t";
      else if (next && KANA[next]) out += KANA[next][0];
      continue;
    }

    // ん sebelum p/b/m → "m"
    if (ch === "ん") {
      const next = chars[i + 1];
      out += next && /[ぱぴぷぺぽばびぶべぼまみむめも]/.test(next) ? "m" : "n";
      continue;
    }

    // yōon cluster
    if (YOON[ch + (chars[i + 1] || "")]) {
      out += YOON[ch + chars[i + 1]!];
      i++;
      continue;
    }

    out += KANA[ch] ?? ch;
  }
  return out;
}

/** Fallback offline: kana → romaji, kanji/tanda baca dibuang. */
function fallbackRomaji(text: string): string {
  return kanaToRomaji(text)
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ── API publik ── */

/**
 * Ubah teks Jepang (boleh ber-kanji) menjadi romaji.
 * Utama: Google Translate `dt=rm`; fallback: konversi kana lokal.
 * Mengembalikan string kosong bila teks kosong.
 */
export async function romanizeJapanese(
  text: string,
  timeoutMs = 8000,
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${GTX_ROMANIZE_URL}${encodeURIComponent(trimmed)}`, {
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json().catch(() => null);

    const segments: unknown[] = data?.[0] ?? [];
    const romaji = segments
      .map((seg) => {
        const arr = Array.isArray(seg) ? seg : [];
        const v = arr[3] || arr[2];
        return typeof v === "string" ? v : "";
      })
      .join("");

    if (romaji.trim()) return romaji.trim();
  } catch {
    /* lanjut ke fallback lokal */
  } finally {
    window.clearTimeout(timer);
  }

  return fallbackRomaji(trimmed);
}
