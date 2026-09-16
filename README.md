# LinguaFlow School — 日本語を学ぼう 🎌

Platform belajar **Bahasa Jepang interaktif** untuk murid SMK Indonesia. Murid belajar kosakata JLPT lewat flashcard, kuis harian, latihan pelafalan berbasis AI, dan chat suara dengan **AI Sensei**; guru membuat tugas & kuis untuk kelasnya; admin mengelola sekolah, guru, murid, dan kelas — lengkap dengan laporan pengerjaan.

> **Bahasa antarmuka:** Indonesia · **Fokus level:** JLPT N5–N3 (±3.095 kosakata)

---

## ⚠️ MODE PROTOTIPE (baca dulu!)

> **Updated 2026-09-15:** Aplikasi ini sedang berjalan sebagai **prototipe tanpa backend & tanpa auth**.

Yang berarti:

- **Tidak ada sistem akun sungguhan.** Halaman `/masuk` menyediakan **3 akun demo** (murid / guru / admin) — pilih salah satu untuk masuk. Pilihan disimpan sementara di localStorage.
- **Data bersifat demo & sementara.** Semua angka dashboard, laporan, kelas, murid, dan guru berasal dari `src/lib/demo-data.ts` (dummy, deterministik).
- **Supabase & middleware auth dihapus** dari codebase untuk sementara. Riwayatnya bisa dilihat di history git.
- Fitur yang memerlukan penyimpanan permanen (buat guru/murid/kelas, publish kuis, rekam attempt) saat ini hanya menyimpan ke **state lokal / localStorage** dan ditandai banner "Mode Prototipe".

Jika nanti backend diaktifkan kembali, hapus `src/lib/demo-data.ts`, `src/lib/demo-session.tsx`, dan halaman `src/app/masuk/` — lalu sambungkan ulang halaman ke database.

### Akun demo

| Role       | Nama                     | Masuk lewat                      |
| ---------- | ------------------------ | -------------------------------- |
| 🧑🎓 Murid | Ahmad Fauzi (XII RPL 1)  | `/masuk` → pilih "Ahmad Fauzi"   |
| 👩‍🏫 Guru    | Bu Siti Rahma            | `/masuk` → pilih "Bu Siti Rahma" |
| 🛠️ Admin   | Budi Santoso (SMK Texar) | `/masuk` → pilih "Budi Santoso"  |

---

## ✨ Fitur Utama

### 🧑🎓 Area Murid (`/m`)

| Fitur              | Deskripsi                                                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| **Dashboard**      | Sapaan waktu-nyata (pagi/siang/sore/malam), progress bab, streak & XP                                                         |
| **Belajar**        | Sesi flashcard per bab, antrean ulasan SRS ("belum hafal"), ringkasan sesi                                                    |
| **Kuis Harian**    | Soal acak dari vocab bank (10 soal pilihan ganda) + **Susun Kalimat** + daftar tugas guru                                     |
| **Deck Latihan**   | Flashcard personal — tandai kata di Kamus untuk drill sendiri                                                                 |
| **Kamus**          | Cari & telusuri ±3.095 kosakata (kanji / kana / romaji / arti), bookmark, kata terkait, contoh kalimat otomatis               |
| **AI Sensei**      | Chat suara dua arah dengan AI — rekam, Sensei menjawab dengan teks + audio, dilengkapi subtitle romaji & terjemahan Indonesia |
| **Latihan Ucapan** | Dengar contoh → rekam → transkripsi Whisper → **skor pelafalan** (Levenshtein)                                                |
| **Peringkat**      | Papan peringkat kelas / sekolah / mingguan                                                                                    |
| **Profil**         | Edit profil, mode gelap, notifikasi, bahasa                                                                                   |

### 👨🏫 Area Guru (`/g`)

| Fitur            | Deskripsi                                                                               |
| ---------------- | --------------------------------------------------------------------------------------- |
| **Dashboard**    | Ringkasan kelas diajar, total murid, tugas aktif                                        |
| **Kelas Saya**   | Lihat kelas & daftar murid (cari, urutkan, detail per murid)                            |
| **Assign Tugas** | Wizard 5 langkah: jenis (flashcard/kuis) → materi → target → deadline → preview         |
| **Buat Kuis**    | Pilih kata dari bank, urutkan soal dengan **drag-and-drop**, set passing grade, publish |
| **Laporan**      | Daftar murid per kelas + export CSV                                                     |

### 🏫 Area Admin (`/a`)

| Fitur               | Deskripsi                                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| **Dashboard**       | Total murid/guru/kelas, grafik pertumbuhan 30 hari, kelas & guru teratas                            |
| **Guru / Murid**    | Kelola daftar guru & murid (mode demo — tidak tersimpan permanen)                                   |
| **Kelas**           | Buat kelas (kode unik otomatis, mis. `XII-RPL-1-a3f`), atur wali kelas                              |
| **Laporan Sekolah** | Rata-rata skor, total pengerjaan, murid aktif, penyelesaian per kelas, tabel murid + **export CSV** |
| **Pengaturan**      | Konfigurasi profil sekolah (nama, NPSN, email admin)                                                |

### 🎙 AI Sensei (`/m/sensei`) — satu hub, dua mode
| Mode | Deskripsi |
|---|---|
| **Chat** | Chatbot interaktif via `POST /sensei/chat` — ketuk ketik, Sensei membalas teks + audio (server TTS `/tts/synthesize`), lengkap subtitle romaji & terjemahan Indonesia |
| **Suara Live** | Percakapan suara real-time via `WS /sensei/live` (Gemini Live API, speech-to-speech native tanpa transkripsi) — subtitle parsial tampil langsung, murid bisa menyela (interrupt), subtitle akhir tersimpan sebagai bubble chat |

Live voice butuh token admin API — diperoleh aman lewat route broker `/api/sensei/live-token` (kredensial hanya di env server).

### 🎬 Landing Page (`/`)

Halaman beranda sinematik multi-babak: pembukaan animasi → hero → demo AI Sensei → speech → flashcard → peringkat → cerita → tim → CTA, dengan transisi warna navy/cream, pola _seigaiha_, scroll mulus (Lenis), dan animasi GSAP + Framer Motion.

---

## 🛠 Tech Stack

| Layer       | Teknologi                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| Framework   | [Next.js 16](https://nextjs.org) (App Router, Server Actions) · React 19 · TypeScript (strict)                            |
| Styling     | [Tailwind CSS 4](https://tailwindcss.com) + design tokens kustom (warna, radius, shadow)                                  |
| Animasi     | [Framer Motion](https://www.framer.com/motion/) · [GSAP](https://gsap.com) · [Lenis](https://lenis.darkroom.engineering/) |
| Drag & drop | [@dnd-kit](https://dndkit.com) (urutan soal kuis)                                                                         |
| Ikon        | [lucide-react](https://lucide.dev) · [@phosphor-icons/react](https://phosphoricons.com) (landing)                         || Speech & AI | **LinguaFlow API** (`lg.tixrouter.my.id`, lihat `api.md`) — TTS neural, STT, translate, AI Sensei, live voice (Gemini Live) + **Web Speech API** sebagai fallback TTS gratis |

> Database (Supabase) & auth dihapus pada fase prototipe — akan ditambahkan kembali saat integrasi backend.

---

## 📁 Struktur Proyek

```
src/
├── app/
│   ├── page.tsx              # Landing page sinematik
│   ├── masuk/                # Pemilih akun demo (pengganti login)
│   ├── kontak/               # Halaman kontak
│   ├── m/                    # 🧑🎓 MURID
│   │   ├── dashboard/ belajar/ deck/ kamus/ kuis/ leaderboard/ profil/
│   │   ├── sensei/           # Chat AI Sensei
│   │   └── speech/           # Latihan pelafalan + halaman hasil
│   ├── g/                    # 👨🏫 GURU
│   │   └── dashboard/ kelas/[id]/(murid)/ tugas/ kuis/ laporan/ profil/
│   └── a/                    # 🏫 ADMIN
│       └── dashboard/ guru/ murid/ kelas/ laporan/ pengaturan/
├── components/
│   ├── landing/              # Bagian-bagian landing page
│   ├── layout/               # Shell, sidebar, bottom-nav per role
│   └── ui/                   # Button, Card, Badge, Input, BottomSheet, dll.
├── lib/
│   ├── demo-data.ts          # 🧪 Dataset demo (sekolah, kelas, murid, guru, attempts)
│   ├── demo-session.tsx      # 🧪 Session demo (pengganti auth, localStorage)
│   ├── linguaflow-api.ts     # 🎙 Klien API LinguaFlow (TTS/STT/translate/sensei)
│   ├── sensei-live.ts        # 🎙 Klien WebSocket live voice
│   ├── live-audio.ts         # 🎙 Capture mic & playback PCM untuk live voice
│   ├── speech.ts             # TTS browser (Web Speech API, fallback)
│   ├── queries/              # Agregasi laporan & dashboard (dari data demo)
│   ├── progress.ts           # Store progress murid (localStorage)
│   ├── speech.ts             # TTS browser (Web Speech API)
│   ├── speech-api.ts         # Klien API speech eksternal (STT/AI/TTS)
│   ├── scoring.ts            # Skor pelafalan (Levenshtein, normalisasi kana)
│   ├── romaji.ts             # Kana → romaji (dengan fallback Google Translate)
│   └── school.ts             # Store tugas/kuis kelas (localStorage)
├── data/vocabulary.ts        # 🗂 Vocab bank JLPT (di-generate, di-commit)
└── middleware.ts             # (dihapus pada fase prototipe)
scripts/
└── build-vocab.mjs           # Pipeline word bank
```

---

## 🚀 Menjalankan di Lokal

### 1. Prasyarat

- Node.js ≥ 20 & npm

### 2. Clone & install

```bash
git clone <url-repo> linguaflow
cd linguaflow
npm install
```

### 3. Environment (opsional)

Lihat `.env.example`. Saat ini **tidak ada env var yang wajib** — mode prototipe berjalan penuh dari data demo.

### 4. Jalankan

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000), klik "Masuk" (atau buka `/masuk`), lalu pilih salah satu akun demo.

---

## 🔐 Session Demo (pengganti auth)

- Buka `/masuk` → pilih akun demo (murid / guru / admin) → diarahkan ke dashboard sesuai role.
- Pilihan disimpan di localStorage (`lf-demo-role`); tombol "Keluar" / "Ganti Akun Demo" menghapusnya dan kembali ke `/masuk`.
- Tidak ada validasi kredensial, tidak ada proteksi route — wajar untuk prototipe. **Jangan deploy ke publik dengan data palsu tanpa disclaimer.**

### Env vars

| Variable                        | Wajib              | Fungsi                                                              |
| ------------------------------- | ------------------ | ------------------------------------------------------------------- |
| `NEXT_PUBLIC_LINGUAFLOW_API_URL` | ❌                | Base URL API LinguaFlow (default `https://lg.tixrouter.my.id/api/v1`) |
| `LINGUAFLOW_ADMIN_USERNAME`      | untuk Suara Live  | Username admin API — hanya dipakai route broker di server            |
| `LINGUAFLOW_ADMIN_PASSWORD`      | untuk Suara Live  | Password admin API — jangan pakai prefix `NEXT_PUBLIC_`              |
| `NEXT_PUBLIC_SUPABASE_URL`      | (nanti)            | URL proyek Supabase                                                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (nanti)            | Kunci anon                                                          |

---

## 🗄 Data

Saat ini semua data berasal dari `src/lib/demo-data.ts`:

| Data demo                                          | Isi                                               |
| -------------------------------------------------- | ------------------------------------------------- |
| `DEMO_SCHOOL`                                      | SMK Texar (NPSN dummy)                            |
| `DEMO_PROFILES`                                    | 3 akun demo: murid, guru, admin                   |
| `DEMO_CLASSES` / `DEMO_TEACHERS` / `DEMO_STUDENTS` | 3 kelas, 3 guru, 12 murid                         |
| `DEMO_TASKS` / `DEMO_QUIZZES`                      | Contoh tugas & kuis guru                          |
| `DEMO_ATTEMPTS`                                    | Riwayat pengerjaan kuis per murid (deterministik) |

> Progress murid (XP, streak, kata dipelajari, SRS) tetap tersimpan di **localStorage** (`lf-progress`) — reset per perangkat. Hasil kuis murid juga direkam lokal (`lf-demo-attempts`, maks. 50 terakhir).

---

## 🎙 Speech, AI Sensei & Scoring### LinguaFlow API
Fitur AI memanggil API sendiri di `https://lg.tixrouter.my.id/api/v1` (dokumentasi lengkap: `api.md`). Klien di `src/lib/linguaflow-api.ts` membungkus TTS, STT, translate, dan Sensei chat dengan **timeout & pesan error bahasa Indonesia** (format error baku `{ error, code }`).

- **TTS** `/tts/synthesize` — suara neural (Nanami/Keita ja, Gadis/Ardi id, dll.); mendukung `translate` (teks Indonesia → audio Jepang dalam satu panggilan).
- **STT** `/stt/transcribe` — dipakai Latihan Ucapan (`/m/speech`) + skor pelafalan.
- **Sensei chat** `/sensei/chat` — balasan pendek gaya tutor, riwayat maks. 20 pesan.
- **Live voice** `WS /sensei/live` — Gemini Live API, PCM16 16 kHz upstream / 24 kHz downstream, event `interrupted` & `turnComplete` ditangani di `src/lib/sensei-live.ts`.

> Kuota Gemini gratis terbatas (puluhan request teks/hari, dibagi translate + Sensei). Habis → `502 AI_ERROR` dengan pesan ramah di UI. Live voice tidak memakai kuota teks.

### TTS fallback
Web Speech API bawaan browser (`src/lib/speech.ts`) tetap tersedia sebagai cadangan gratis ketika server TTS gagal.

### TTS gratis

Pengucapan kata/kalimat memakai **Web Speech API** bawaan browser (suara Jepang neural di Chrome/Edge/Android) — tanpa backend & tanpa biaya (`src/lib/speech.ts`).

### Skor pelafalan (`src/lib/scoring.ts`)

Transkrip Whisper dibandingkan dengan kalimat target memakai **jarak Levenshtein**, setelah normalisasi simetris: tanda baca dibuang, katakana → hiragana, partikel は/へ/を dilonggarkan ke わ/え/お (Whisper sering menulis sesuai bunyi). Skor 0–100 + label motivasi.### AI Sensei (terintegrasi)
Satu halaman (`/m/sensei`) dengan dua mode: **Chat** (teks + audio) dan **Suara Live** (duplex penuh). Subtitle romaji (konversi lokal di `src/lib/romaji.ts`) & terjemahan Indonesia (via `/translate`) dimuat async tanpa memblokir chat.

---

## 📚 Word Bank & Pipeline Vocabulary

Kosakata JLPT (kanji, furigana, romaji, arti Indonesia, level, POS, frekuensi) di-generate dari dataset open-source oleh `scripts/build-vocab.mjs` dan di-commit ke `src/data/vocabulary.ts`.

```bash
npm run build:vocab                    # default N5–N3 (±3.095 kata)
npm run build:vocab -- --levels=N5,N4,N3,N2,N1
npm run build:vocab -- --force         # unduh ulang data mentah
npm run build:vocab -- --no-translate  # tanpa terjemahan otomatis EN→ID
```

**Sumber & lisensi** (detail lengkap di `scripts/build-vocab/README.md`):

| Data                    | Sumber                                | Lisensi                     |
| ----------------------- | ------------------------------------- | --------------------------- |
| Word list + level JLPT  | Bluskyo/JLPT_Vocabulary (tanos.co.uk) | **CC-BY** — Jonathan Waller |
| Arti bahasa Indonesia   | open-dict-data/wikidict-ja            | CC0 (Wikidata)              |
| POS + frekuensi + gloss | AnchorI/jlpt-kanji-dictionary         | MIT                         |

> ⚠️ **Kewajiban atribusi (CC-BY):** cantumkan kredit _"Kosakata JLPT — Jonathan Waller (tanos.co.uk)"_ di aplikasi publik (mis. footer halaman Kamus atau halaman Tentang).

Pipeline: unduh → parse & gabung → generate romaji (Hepburn-ish, tanpa library) → dedupe (prioritas level terendah) → validasi → tulis `src/data/vocabulary.ts`.

---

## 🧩 Konvensi Kode

- **Struktur folder:** per-route di `src/app/<area>/<fitur>/` berisi `page.tsx` (UI, "use client").
- **Path alias:** `@/*` → `src/*`.
- **UI kit:** komponen di `src/components/ui/` (Button, Card, Badge, Input, Select, ProgressBar, BottomSheet, Avatar, dst.) dengan **design tokens** Tailwind: `bg-warm-white`, `bg-paper`, `text-ink`, `text-ink-soft`, `text-indigo`, `text-vermillion`, `text-gold`, `text-success`, `text-error`, `border-line`, `rounded-card`, `rounded-btn`, `shadow-soft`, `shadow-soft-lg`, dsb. Mode gelap via kelas `.dark` (`src/lib/theme.tsx`).
- **Session demo:** selalu lewat `useDemoSession()` dari `src/lib/demo-session.tsx` — jangan baca localStorage langsung.
- **Data demo:** hanya lewat helper di `src/lib/demo-data.ts`.
- **Progress murid:** selalu lewat `useProgress()` dari `src/lib/progress.ts` — jangan hardcode angka.
- **Panggilan speech:** selalu lewat `speakJapanese`/`useJapaneseSpeech` (bukan `speechSynthesis` langsung), dan API eksternal lewat `src/lib/speech-api.ts` dengan timeout.
- **Hydration-safe:** baca `localStorage`/`sessionStorage`/`Date` di dalam `useEffect`, bukan di initial state.
- **Bahasa kode:** komentar ditulis campuran Indonesia/Inggris mengikuti konvensi file sekitarnya.

---

## 📜 Scripts (`package.json`)

| Script                    | Fungsi                                              |
| ------------------------- | --------------------------------------------------- |
| `npm run dev`             | Jalankan dev server                                 |
| `npm run build` / `start` | Build & jalankan produksi                           |
| `npm run lint`            | ESLint (Next core-web-vitals + TS)                  |
| `npm run typecheck`       | TypeScript `tsc --noEmit`                           |
| `npm run build:vocab`     | Generate word bank vocabulary                       |
| `npm run dev:start`       | Bersihkan port 3000/3001 + `.next`, lalu `next dev` |
| `npm run dev:stop`        | Matikan server di port 3000/3001                    |
| `npm run start:prod`      | `rm -rf .next && next build && next start`          |

---

## 🧰 Troubleshooting

| Gejala                                                 | Solusi                                                                                                                                       |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard/laporan kosong atau angka aneh               | Data demo di-generate deterministik — hapus `lf-progress` / `lf-demo-role` / `lf-demo-attempts` dari localStorage bila state lama mengganggu || AI Sensei gagal / "Kuota AI habis" | Kuota Gemini gratis habis untuk hari ini (translate + chat berbagi kuota). Live voice tidak terdampak — gunakan mode Suara Live, atau coba lagi besok |
| Mode gelap tidak tersimpan                             | Penyimpanan di `localStorage` (`lf-theme`) — bersihkan cache bila aneh                                                                       |
| Perubahan data guru/murid/kelas hilang setelah refresh | Wajar — mode prototipe tidak menyimpan permanen                                                                                              |

---

## 🗺 Roadmap / Ide Selanjutnya

- Re-aktifkan Supabase (auth, RLS, tabel) dan ganti demo session dengan auth sungguhan
- Menautkan tugas & kuis guru ke dashboard murid secara real-time
- Papan peringkat dengan data nyata antar murid
- Leaderboard & statistik guru berbasis attempt
- Ganti password langsung dari aplikasi

---

Dibuat dengan ❤️ 日本語を楽しんでください！
