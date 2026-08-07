# Build Vocab — Word Bank Pipeline

Pipeline satu-kali untuk menyiapkan kosakata JLPT berbahasa Indonesia
yang dipakai di area murid (kamus, deck, belajar, kuis, dsb).

## Cara pakai

```bash
# Generate default (N5–N3, ±3.200 kata)
npm run build:vocab

# Generate semua level
npm run build:vocab -- --levels=N5,N4,N3,N2,N1

# Paksa unduh ulang data mentah
npm run build:vocab -- --force
```

Output: `src/data/vocabulary.ts` (di-commit, dipakai oleh aplikasi).

## Alur

1. **Download** dataset mentah ke `scripts/build-vocab/tmp/` (di-gitignore, ±57 MB)
2. **Parse & merge**: JLPT word list × arti Indonesia × POS/frekuensi
3. **Romaji**: di-generate dari kana (Hepburn-ish, tanpa library tambahan)
4. **Dedupe**: per pasangan `kanji + reading`, prioritas level terendah
5. **Validate**: field tidak kosong, level valid, tidak duplikat
6. **Output**: `src/data/vocabulary.ts` dengan tipe `VocabularyWord`

## Sumber & Lisensi

| Data | Sumber | Lisensi |
|---|---|---|
| Word list + level JLPT | [Bluskyo/JLPT_Vocabulary](https://github.com/Bluskyo/JLPT_Vocabulary) (asal: tanos.co.uk) | **CC-BY** — Jonathan Waller |
| Arti bahasa Indonesia | [open-dict-data/wikidict-ja](https://github.com/open-dict-data/wikidict-ja) `id-ja_wiki.txt` | **CC0** (Wikidata) |
| POS + frekuensi + gloss | [AnchorI/jlpt-kanji-dictionary](https://github.com/AnchorI/jlpt-kanji-dictionary) | **MIT** |

> ⚠️ **Attribution wajib karena CC-BY**: cantumkan kredit
> "Kosakata JLPT — Jonathan Waller (tanos.co.uk)" di aplikasi publik,
> misalnya di footer halaman Kamus atau halaman "Tentang".

## Catatan kualitas data

- Arti Indonesia diambil dari `wikidict` (CC0). Untuk kata yang **tidak punya
  padanan di wikidict (±83% kosakata)**, gloss Inggris dari AnchorI
  **diterjemahkan otomatis EN→ID** memakai endpoint gratis Google Translate
  (`client=gtx`, tanpa API key, sekali jalan — hasilnya di-bake ke
  `src/data/vocabulary.ts` yang di-commit). Nonaktifkan dengan `--no-translate`.
- Cache terjemahan disimpan di `scripts/build-vocab/tmp/translations.json`
  (gitignored) supaya build ulang tidak memanggil jaringan lagi. Gloss yang
  mencurigakan dilaporkan ke `tmp/review-translations.txt` untuk cek manual.
- Pola literal "untuk makan" (dari "to eat") dirapikan otomatis menjadi "makan".
- Kata tanpa arti sama sekali tidak disertakan (laporan `skipped` di akhir build).
- Total default N5–N3 ≈ 3.095 kata.
