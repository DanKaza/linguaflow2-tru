#!/usr/bin/env node
/**
 * build-vocab.mjs — Word bank harvest & transform pipeline.
 *
 * Downloads open-source datasets once, merges them into a single typed
 * vocabulary array, and writes `src/data/vocabulary.ts`.
 *
 * Sources (see scripts/build-vocab/README.md for licenses):
 *   1. JLPT word list + level  → Bluskyo/JLPT_Vocabulary (tanos.co.uk, CC-BY)
 *   2. Indonesian meanings     → open-dict-data/wikidict-ja  (CC0)
 *   3. POS + frequency + gloss → AnchorI/jlpt-kanji-dictionary (MIT)
 *
 * Usage:
 *   node scripts/build-vocab.mjs                # N5–N3 (default)
 *   node scripts/build-vocab.mjs --levels=N5,N4,N3,N2,N1
 *   node scripts/build-vocab.mjs --force        # re-download sources
 *
 * Output: src/data/vocabulary.ts (committed, used by the app).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP_DIR = join(__dirname, "build-vocab", "tmp");
const OUT_DIR = join(__dirname, "..", "src", "data");
const OUT_FILE = join(OUT_DIR, "vocabulary.ts");
const TRANSLATIONS_FILE = join(TMP_DIR, "translations.json");
const REVIEW_FILE = join(TMP_DIR, "review-translations.txt");

/* ──────────────────────────────────────────────
 * 1. Sources
 * ────────────────────────────────────────────── */
const SOURCES = {
  bluskyo:
    "https://raw.githubusercontent.com/Bluskyo/JLPT_Vocabulary/master/data/vocab/results/JLPT_vocab_ALL.json",
  wikidict:
    "https://raw.githubusercontent.com/open-dict-data/wikidict-ja/master/data/id-ja_wiki.txt",
  anchor: [1, 2, 3, 4].map(
    (i) =>
      `https://raw.githubusercontent.com/AnchorI/jlpt-kanji-dictionary/main/dictionary_part_${i}.json`,
  ),
};

const LEVEL_ORDER = ["N5", "N4", "N3", "N2", "N1"];
/** Bluskyo uses level 1=N1 … 5=N5. */
const bluskyoLevel = (n) => LEVEL_ORDER[5 - n];

const args = process.argv.slice(2);
const force = args.includes("--force");
/** Disable the EN→ID machine-translation step (e.g. offline builds). */
const noTranslate = args.includes("--no-translate");
const levelsArg = args.find((a) => a.startsWith("--levels="));
const levels = new Set(
  levelsArg
    ? levelsArg.split("=")[1].split(",").filter(Boolean)
    : ["N5", "N4", "N3"],
);

/** Valid kana-only reading: hiragana/katakana + long-vowel + iteration marks. */
const KANA_ONLY = /^[\u3041-\u3096\u30A1-\u30F6\u30FC\u30FD\u30FE\u309D\u309E]+$/;

/* ──────────────────────────────────────────────
 * 2. Download helpers
 * ────────────────────────────────────────────── */
async function download(url, dest) {
  if (!force && existsSync(dest)) {
    console.log(`  cached  ${dest.split(/[\\/]/).pop()}`);
    return;
  }
  console.log(`  fetch   ${url}`);
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

async function ensureSources() {
  mkdirSync(TMP_DIR, { recursive: true });
  console.log("› Downloading sources");
  await download(SOURCES.bluskyo, join(TMP_DIR, "bluskyo_vocab.json"));
  await download(SOURCES.wikidict, join(TMP_DIR, "id-ja_wiki.txt"));
  for (const url of SOURCES.anchor) {
    const i = url.match(/part_(\d)/)[1];
    await download(url, join(TMP_DIR, `anchor${i}.json`));
  }
}

/* ──────────────────────────────────────────────
 * 3. Parsers
 * ──────────────────────────────────────────────
 * Bluskyo: { kanji: [{reading, level}] }.
 * Some readings are notes (（感）) or mojibake — keep only kana readings,
 * and split space/・ separated multi-readings into separate entries.
 */
function parseBluskyo() {
  const raw = JSON.parse(readFileSync(join(TMP_DIR, "bluskyo_vocab.json"), "utf8"));
  const out = [];
  let dropped = 0;
  for (const [kanji, entries] of Object.entries(raw)) {
    for (const e of entries) {
      const readings = String(e.reading ?? "")
        .split(/[\s・]+/)
        .map((r) => r.trim())
        .filter((r) => r && KANA_ONLY.test(r));
      if (readings.length === 0) {
        dropped++;
        continue;
      }
      for (const reading of readings) {
        out.push({ kanji, reading, level: bluskyoLevel(e.level) });
      }
    }
  }
  console.log(`  bluskyo : ${out.length} entries (${dropped} dirty readings dropped)`);
  return out;
}

/** wikidict id-ja: `Indonesian<TAB>Japanese` → reverse map JP term → ID terms.
 * NB: the JP column is a single Wikidata label (one term). Never split it on
 * 、 or , — in this dataset those belong to titles/phrases (e.g. the film
 * title お願い、キャプテン), and splitting created bogus mappings like
 * キャプテン → "Take Care of Us, Captain" (a K-drama title). */
function parseWikidict() {
  const text = readFileSync(join(TMP_DIR, "id-ja_wiki.txt"), "utf8");
  const exact = new Map(); // jp term -> Set<indonesian>
  const norm = new Map(); // normalized jp term (no ー) -> Set<indonesian>
  const add = (map, key, val) => {
    if (!key) return;
    if (!map.has(key)) map.set(key, new Set());
    map.get(key).add(val);
  };
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [id, jp] = trimmed.split("\t");
    if (!id || !jp) continue;
    const t = jp.trim();
    if (!t) continue;
    add(exact, t, id.trim());
    add(norm, t.replace(/ー/g, ""), id.trim());
  }
  return { exact, norm };
}

/** AnchorI: array of { kanji, reading, pos, glossary_en, sequence }. */
function parseAnchor() {
  const byKey = new Map(); // `${kanji}\t${reading}` -> rec
  const byReading = new Map(); // exact reading -> rec
  const byReadingNorm = new Map(); // reading w/o ー -> rec
  const byKanji = new Map(); // first rec per kanji (fallback)
  const hasJpChars = (s) => /[\u3040-\u30ff\u3400-\u9fff\uff66-\uff9d]/.test(s);

  for (let i = 1; i <= 4; i++) {
    const raw = JSON.parse(
      readFileSync(join(TMP_DIR, `anchor${i}.json`), "utf8"),
    );
    for (const item of raw) {
      const gloss = Array.isArray(item.glossary_en)
        ? item.glossary_en.find((g) => typeof g === "string" && !hasJpChars(g)) ?? ""
        : "";
      const rec = {
        pos: typeof item.pos === "string" ? item.pos.replace(/^\d+\s*/, "") : "",
        frequency: typeof item.sequence === "number" ? item.sequence : undefined,
        glossEn: gloss,
      };
      const key = `${item.kanji}\t${item.reading}`;
      if (item.kanji && !byKey.has(key)) byKey.set(key, rec);
      if (item.reading) {
        if (!byReading.has(item.reading)) byReading.set(item.reading, rec);
        const norm = item.reading.replace(/ー/g, "");
        if (!byReadingNorm.has(norm)) byReadingNorm.set(norm, rec);
      }
      if (item.kanji && !byKanji.has(item.kanji)) byKanji.set(item.kanji, rec);
    }
  }
  return { byKey, byReading, byReadingNorm, byKanji };
}

/* ──────────────────────────────────────────────
 * 4. Kana → romaji (Hepburn-ish)
 * ────────────────────────────────────────────── */
const KANA = {
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
const YOON = {
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

/** Convert katakana → hiragana so lookups & romaji share one table. */
function toHiragana(s) {
  return [...s]
    .map((c) => {
      const code = c.codePointAt(0);
      return code >= 0x30a1 && code <= 0x30f6
        ? String.fromCodePoint(code - 0x60)
        : c;
    })
    .join("");
}

function kanaToRomaji(input) {
  const chars = [...toHiragana(input)];
  let out = "";
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];

    // Long vowel marker ー → repeat previous vowel
    if (ch === "ー") {
      const last = out[out.length - 1];
      if (last && /[aeiou]/.test(last)) out += last;
      continue;
    }

    // Sokuon っ → geminate next consonant
    if (ch === "っ") {
      const next = chars[i + 1];
      if (next === "ち") out += "t";
      else if (next === "し") out += "s";
      else if (next === "つ") out += "t";
      else if (next && KANA[next]) out += KANA[next][0];
      continue;
    }

    // ん before p/b/m → "m"
    if (ch === "ん") {
      const next = chars[i + 1];
      out += next && /[ぱぴぷぺぽばびぶべぼまみむめも]/.test(next) ? "m" : "n";
      continue;
    }

    // yōon cluster (base + small ゃ/ゅ/ょ)
    if (YOON[ch + (chars[i + 1] || "")]) {
      out += YOON[ch + chars[i + 1]];
      i++;
      continue;
    }

    out += KANA[ch] ?? ch;
  }
  return out;
}

/* ──────────────────────────────────────────────
 * 4b. Translate EN fallback glosses → Indonesian (free, one-time)
 * ──────────────────────────────────────────────
 * AnchorI glosses are English. We machine-translate them to Indonesian
 * once and bake the result into src/data/vocabulary.ts, with an on-disk
 * cache so re-runs stay offline/cheap.
 *
 * Endpoint: Google Translate's free `client=gtx` endpoint (no API key,
 * no account). Fine for a one-time build step in dev; output is committed
 * so the app never calls it at runtime. Disable with `--no-translate`.
 */
const GTX_ENDPOINT =
  "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=id&dt=t";

/** Per-kanji overrides for junk source data (wrong labels/glosses). */
const KANJI_OVERRIDES = {
  戸: "pintu",
  都: "ibu kota",
  あ: "ah",
};

/** Manual overrides where MT tends to miss the dictionary sense. */
const MANUAL_OVERRIDES = {
  "this way": "ke sini",
  "that way": "ke sana",
  "come (on)": "ayo",
  "this sort of": "semacam ini",
};

/** Heuristic: arti yang masih tampak gloss Inggris (memuat stopword EN). */
const EN_LOOKING =
  /\b(the|a|an|of|to|in|on|for|with|and|or|that|this|from|by|as|is|are|be|not|have|has)\b/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function loadTranslationCache() {
  try {
    return JSON.parse(readFileSync(TRANSLATIONS_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveTranslationCache(cache) {
  writeFileSync(TRANSLATIONS_FILE, JSON.stringify(cache, null, 2), "utf8");
}

/**
 * Translate a list of short English glosses into Indonesian (batched).
 * Returns a Map enGloss → idGloss. Failed items are omitted — the caller
 * falls back to the English gloss and flags them for review.
 */
async function translateEnToId(glosses) {
  const cache = loadTranslationCache();
  const result = new Map();
  // Cache dulu, lalu override manual MENANG atas cache lama.
  for (const [en, id] of Object.entries(cache)) if (id) result.set(en, id);
  for (const [en, id] of Object.entries(MANUAL_OVERRIDES)) result.set(en, id);

  const todo = [...new Set(glosses)].filter((g) => !result.has(g));
  if (todo.length === 0) {
    console.log(`  translate: ${result.size} gloss sudah ada di cache/override`);
    return result;
  }

  console.log(`  translate: ${todo.length} gloss EN → ID (batch 40, delay 1.2s)`);
  const CHUNK = 40;
  let failed = 0;

  for (let i = 0; i < todo.length; i += CHUNK) {
    const chunk = todo.slice(i, i + CHUNK);
    const q = encodeURIComponent(chunk.join("\n"));

    let ok = false;
    for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
      try {
        const res = await fetch(`${GTX_ENDPOINT}&q=${q}`, {
          headers: { "User-Agent": "Mozilla/5.0 (build-vocab pipeline)" },
          signal: AbortSignal.timeout(20000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const lines = (data?.[0] ?? [])
          .map((seg) => seg?.[0] ?? "")
          .join("")
          .split("\n");
        if (lines.length !== chunk.length)
          throw new Error(`baris tidak cocok ${lines.length} vs ${chunk.length}`);
        chunk.forEach((en, idx) => {
          const id = lines[idx]?.trim();
          if (id) {
            cache[en] = id;
            result.set(en, id);
          }
        });
        ok = true;
      } catch (err) {
        if (attempt === 3) {
          failed += chunk.length;
          console.warn(
            `  ⚠ batch ${i / CHUNK + 1} gagal (${err.message}) — ${chunk.length} gloss tetap EN`,
          );
        } else {
          await sleep(4000 * attempt);
        }
      }
    }
    saveTranslationCache(cache);
    if ((i / CHUNK) % 5 === 0)
      console.log(`  translate: ${Math.min(i + CHUNK, todo.length)}/${todo.length} …`);
    await sleep(1200);
  }

  console.log(`  translate: ${todo.length - failed} berhasil, ${failed} gagal`);
  return result;
}

/* ──────────────────────────────────────────────
 * 5. Merge
 * ────────────────────────────────────────────── */
function buildVocabulary() {
  const words = parseBluskyo();
  const idMap = parseWikidict();
  const { byKey, byReading, byReadingNorm, byKanji } = parseAnchor();

  const seen = new Set(); // dedupe by kanji + reading
  const result = [];
  let skippedNoArti = 0;

  for (const w of words) {
    if (!levels.has(w.level)) continue;
    if (!w.kanji || !w.reading) continue;

    const dedupeKey = `${w.kanji}\t${w.reading}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    // Indonesian meaning — exact kanji first, then reading, with ー-normalized fallbacks
    const readingNorm = w.reading.replace(/ー/g, "");
    const idHit =
      idMap.exact.get(w.kanji) ??
      idMap.norm.get(w.kanji) ??
      idMap.exact.get(w.reading) ??
      idMap.norm.get(readingNorm);
    let arti = idHit ? [...idHit][0] : "";
    // Per-kanji overrides beat both wikidict and AnchorI (junk source data).
    const hasOverride = Object.prototype.hasOwnProperty.call(KANJI_OVERRIDES, w.kanji);
    if (hasOverride) arti = KANJI_OVERRIDES[w.kanji];

    // Where did this meaning come from? "id" = native Indonesian from
    // wikidict; "en" = AnchorI English gloss (needs EN→ID translation).
    const artiSrc = idHit || hasOverride ? "id" : "en";

    // POS + frequency + English fallback gloss
    const anchor =
      byKey.get(`${w.kanji}\t${w.reading}`) ??
      byReading.get(w.reading) ??
      byReadingNorm.get(readingNorm) ??
      byKanji.get(w.kanji);
    if (!arti && anchor?.glossEn) arti = anchor.glossEn;
    // Skip words without any meaning — they'd render blank in the kamus UI.
    if (!arti) {
      skippedNoArti++;
      continue;
    }

    result.push({
      kanji: w.kanji,
      furigana: w.reading,
      romaji: kanaToRomaji(w.reading),
      arti,
      level: w.level,
      _src: artiSrc, // internal only — stripped before writing
      ...(anchor?.pos ? { pos: anchor.pos } : {}),
      ...(anchor?.frequency ? { frequency: anchor.frequency } : {}),
    });
  }

  // Sort: level (N5 first) → frequency (lower = more common) → kanji
  result.sort((a, b) => {
    const l = LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level);
    if (l !== 0) return l;
    const f = (a.frequency ?? Infinity) - (b.frequency ?? Infinity);
    if (f !== 0) return f;
    return a.kanji.localeCompare(b.kanji, "ja");
  });

  return { result, skippedNoArti };
}

/* ──────────────────────────────────────────────
 * 6. Validate + write
 * ────────────────────────────────────────────── */
function validate(words) {
  const errors = [];
  const seen = new Set();
  for (const w of words) {
    if (!w.kanji || !w.furigana || !w.romaji)
      errors.push(`missing fields: ${w.kanji}`);
    if (!LEVEL_ORDER.includes(w.level)) errors.push(`bad level: ${w.level}`);
    if (!KANA_ONLY.test(w.furigana))
      errors.push(`non-kana furigana: ${w.kanji} (${w.furigana})`);
    const k = `${w.kanji}\t${w.furigana}`;
    if (seen.has(k)) errors.push(`duplicate: ${k}`);
    seen.add(k);
  }
  return errors.slice(0, 30);
}

function writeOutput(words) {
  const header = `// AUTO-GENERATED by scripts/build-vocab.mjs — DO NOT EDIT.
// Regenerate with: npm run build:vocab
//
// Sources & licenses:
//  - JLPT word list (tanos.co.uk via Bluskyo/JLPT_Vocabulary) — CC-BY, Jonathan Waller
//  - Indonesian meanings (open-dict-data/wikidict-ja) — CC0 (Wikidata)
//  - EN gloss fallback machine-translated EN→ID (Google Translate, one-time)
//  - POS/frequency/gloss (AnchorI/jlpt-kanji-dictionary) — MIT

import type { VocabularyWord } from "@/lib/types";

/** Wrapper keeps TS from building a huge union of literal types (TS2590). */
function w(entry: VocabularyWord): VocabularyWord {
  return entry;
}

/** Canonical word bank used across the student area. */
export const vocabulary: VocabularyWord[] = [
`;
  const body = words
    .map((w) => {
      const pos = w.pos ? `, pos: ${JSON.stringify(w.pos)}` : "";
      const freq = w.frequency ? `, frequency: ${w.frequency}` : "";
      return `  w({ kanji: ${JSON.stringify(w.kanji)}, furigana: ${JSON.stringify(
        w.furigana,
      )}, romaji: ${JSON.stringify(w.romaji)}, arti: ${JSON.stringify(
        w.arti,
      )}, level: "${w.level}"${pos}${freq} }),`;
    })
    .join("\n");
  const footer = `\n];\n`;
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, header + body + footer, "utf8");
}

/* ──────────────────────────────────────────────
 * 7. Main
 * ────────────────────────────────────────────── */
async function main() {
  console.log("LinguaFlow — build-vocab pipeline");
  console.log(`Levels: ${[...levels].join(", ")}`);
  await ensureSources();

  console.log("› Parsing & merging sources");
  const { result, skippedNoArti } = buildVocabulary();

  // Translate English fallback glosses to Indonesian (free endpoint, cached)
  let translated = 0;
  if (!noTranslate) {
    const enEntries = result.filter((w) => w._src === "en" && w.arti);
    if (enEntries.length > 0) {
      console.log("› Translating EN fallback glosses → ID");
      const trans = await translateEnToId(enEntries.map((w) => w.arti));
      for (const w of enEntries) {
        const id = trans.get(w.arti);
        if (id && id !== w.arti) {
          // Dictionary style: "to eat" → "makan" (buang awalan "untuk " literal)
          w.arti = id.replace(/^untuk\s+/i, "");
          translated++;
        }
      }
      const stillEn = result.filter(
        (w) => w._src === "en" && EN_LOOKING.test(w.arti),
      );
      if (stillEn.length > 0) {
        writeFileSync(
          REVIEW_FILE,
          `// Gloss yang masih tampak bahasa Inggris (perlu cek manual)\n${stillEn
            .map((w) => `${w.kanji}\t${w.furigana}\t${w.arti}`)
            .join("\n")}\n`,
          "utf8",
        );
        console.log(
          `  ⚠ ${stillEn.length} arti masih tampak EN → cek ${REVIEW_FILE.split(/[\\/]/).pop()}`,
        );
      }
    }
  } else {
    console.log("› Skip translate (--no-translate) — fallback EN dibiarkan");
  }

  console.log("› Validating");
  const errors = validate(result);
  if (errors.length) {
    console.error(`✗ ${errors.length} validation error(s):`);
    for (const e of errors) console.error(`   - ${e}`);
    process.exitCode = 1;
  }

  writeOutput(result);

  const perLevel = {};
  for (const w of result) perLevel[w.level] = (perLevel[w.level] ?? 0) + 1;

  console.log("✓ Generated src/data/vocabulary.ts");
  console.log(`  total    : ${result.length} kata`);
  console.log(`  per level: ${Object.entries(perLevel)
    .map(([l, n]) => `${l}=${n}`)
    .join(" · ")}`);
  const idNative = result.filter((w) => w._src === "id").length;
  const enTotal = result.length - idNative;
  const enNote = noTranslate
    ? " — fallback EN (--no-translate)"
    : `, ${enTotal - translated} proper noun yang tidak berubah`;
  console.log(
    `  arti    : ${idNative} asli Indonesia (wikidict) + ${translated} terjemahan EN→ID${enNote}`,
  );
  console.log(`  skipped : ${skippedNoArti} kata tanpa padanan arti ID/EN (tidak disertakan)`);
  if (process.exitCode) console.log("⚠ Validation failed — file tetap ditulis untuk debugging.");
}

main().catch((err) => {
  console.error("✗ build-vocab gagal:", err);
  process.exit(1);
});
