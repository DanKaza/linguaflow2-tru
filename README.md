# LinguaFlow School — 日本語を学ぼう 🎌

Platform belajar **Bahasa Jepang interaktif** untuk murid SMK Indonesia. Murid belajar kosakata JLPT lewat flashcard, kuis harian, latihan pelafalan berbasis AI, dan chat suara dengan **AI Sensei**; guru membuat tugas & kuis untuk kelasnya; admin mengelola sekolah, guru, murid, dan kelas — lengkap dengan laporan pengerjaan.

> **Bahasa antarmuka:** Indonesia · **Fokus level:** JLPT N5–N3 (±3.095 kosakata)

---

## ✨ Fitur Utama

### 🧑🎓 Area Murid (`/m`)
| Fitur | Deskripsi |
|---|---|
| **Dashboard** | Sapaan waktu-nyata (pagi/siang/sore/malam), progress bab, streak & XP |
| **Belajar** | Sesi flashcard per bab, antrean ulasan SRS ("belum hafal"), ringkasan sesi |
| **Kuis Harian** | Soal acak dari vocab bank (10 soal pilihan ganda) + **Susun Kalimat** |
| **Deck Latihan** | Flashcard personal — tandai kata di Kamus untuk drill sendiri |
| **Kamus** | Cari & telusuri ±3.095 kosakata (kanji / kana / romaji / arti), bookmark, kata terkait, contoh kalimat otomatis |
| **AI Sensei** | Chat suara dua arah dengan AI — rekam, Sensei menjawab dengan teks + audio, dilengkapi subtitle romaji & terjemahan Indonesia |
| **Latihan Ucapan** | Dengar contoh → rekam → transkripsi Whisper → **skor pelafalan** (Levenshtein) |
| **Peringkat** | Papan peringkat kelas / sekolah / mingguan |
| **Profil** | Edit profil, mode gelap, notifikasi, bahasa |

### 👨🏫 Area Guru (`/g`)
| Fitur | Deskripsi |
|---|---|
| **Dashboard** | Ringkasan kelas diajar, total murid, tugas aktif |
| **Kelas Saya** | Lihat kelas & daftar murid (cari, urutkan, detail per murid) |
| **Assign Tugas** | Wizard 5 langkah: jenis (flashcard/kuis) → materi → target → deadline → preview |
| **Buat Kuis** | Pilih kata dari bank, urutkan soal dengan **drag-and-drop**, set passing grade, publish |
| **Laporan** | Daftar murid per kelas + export CSV |

### 🏫 Area Admin (`/a`)
| Fitur | Deskripsi |
|---|---|
| **Dashboard** | Total murid/guru/kelas, grafik pertumbuhan 30 hari, kelas & guru teratas |
| **Guru / Murid** | Buat akun via Supabase Admin API, edit, nonaktifkan (ban), hapus |
| **Kelas** | Buat kelas (kode unik otomatis, mis. `XII-RPL-1-a3f`), atur wali kelas |
| **Laporan Sekolah** | Rata-rata skor, total pengerjaan, murid aktif, penyelesaian per kelas, tabel murid + **export CSV** |
| **Pengaturan** | Konfigurasi profil sekolah (nama, NPSN, email admin) |

### 🎬 Landing Page (`/`)
Halaman beranda sinematik multi-babak: pembukaan animasi → hero → demo AI Sensei → speech → flashcard → peringkat → cerita → tim → CTA, dengan transisi warna navy/cream, pola *seigaiha*, scroll mulus (Lenis), dan animasi GSAP + Framer Motion.

---

## 🛠 Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, Server Actions) · React 19 · TypeScript (strict) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com) + design tokens kustom (warna, radius, shadow) |
| Database & Auth | [Supabase](https://supabase.com) — Postgres + Auth + Row Level Security (RLS) |
| Animasi | [Framer Motion](https://www.framer.com/motion/) · [GSAP](https://gsap.com) · [Lenis](https://lenis.darkroom.engineering/) |
| Drag & drop | [@dnd-kit](https://dndkit.com) (urutan soal kuis) |
| Ikon | [lucide-react](https://lucide.dev) |
| Speech | **Web Speech API** (TTS gratis) + server speech eksternal (Whisper STT / AI / TTS) |

---

## 📁 Struktur Proyek

```
src/
├── app/
│   ├── page.tsx              # Landing page sinematik
│   ├── login/ register/      # Autentikasi
│   ├── register-sekolah/     # Pendaftaran sekolah
│   ├── auth/                 # Callback & reset password
│   ├── m/                    # 🧑🎓 MURID (perlu role "murid")
│   │   ├── dashboard/ belajar/ deck/ kamus/ kuis/ leaderboard/ profil/
│   │   ├── sensei/           # Chat AI Sensei
│   │   └── speech/           # Latihan pelafalan + halaman hasil
│   ├── g/                    # 👨🏫 GURU (perlu role "guru")
│   │   ├── dashboard/ kelas/[id]/(murid)/ tugas/ kuis/ laporan/ profil/
│   └── a/                    # 🏫 ADMIN (perlu role "admin")
│       ├── dashboard/ guru/ murid/ kelas/ laporan/ pengaturan/
├── components/
│   ├── landing/              # Bagian-bagian landing page
│   ├── layout/               # Shell, sidebar, bottom-nav per role
│   └── ui/                   # Button, Card, Badge, Input, BottomSheet, dll.
├── lib/
│   ├── supabase/             # Client & server Supabase (src/app pakai ini)
│   ├── queries/              # Agregasi laporan & dashboard
│   ├── progress.ts           # Store progress murid (localStorage)
│   ├── speech.ts             # TTS browser (Web Speech API)
│   ├── speech-api.ts         # Klien API speech eksternal (STT/AI/TTS)
│   ├── scoring.ts            # Skor pelafalan (Levenshtein, normalisasi kana)
│   ├── romaji.ts             # Kana → romaji (dengan fallback Google Translate)
│   └── school.ts             # Store tugas/kuis kelas (localStorage, seed kosong)
├── data/vocabulary.ts        # 🗂 Vocab bank JLPT (di-generate, di-commit)
└── middleware.ts             # Proteksi route berbasis role
supabase/
└── migrations/               # Migrasi SQL (jalankan di Supabase Dashboard)
scripts/
└── build-vocab.mjs           # Pipeline word bank (lihat dokumen di folder-nya)
```

> 💡 **Catatan:** folder `src/utils/supabase/` adalah kode lama yang tidak lagi dipakai — implementasi aktif ada di `src/lib/supabase/`.

---

## 🚀 Menjalankan di Lokal

### 1. Prasyarat
- Node.js ≥ 20 & npm
- Akun [Supabase](https://supabase.com) (gratis)

### 2. Clone & install

```bash
git clone <url-repo> linguaflow
cd linguaflow
npm install
```

### 3. Siapkan environment

Salin contoh berikut ke `.env.local`:

```env
# Supabase — Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...   # hanya untuk admin buat akun murid/guru (JANGAN bocorkan)

# Opsional — override server speech eksternal
NEXT_PUBLIC_SPEECH_API_URL=https://api.rynaqrtz.my.id
```

### 4. Siapkan database

Buat tabel di Supabase Dashboard → SQL Editor:

1. **Tabel inti** (buat sekali): `profiles`, `schools`, `classes`, `tasks`, `quizzes`, `quiz_words` — ikuti struktur kolom yang dipakai kode (lihat tabel [Database](#database) di bawah).
2. **Migrasi quiz_attempts** (sudah tersedia di repo):
   ```bash
   # Buka supabase/migrations/001_quiz_attempts.sql
   # Tempel seluruh isinya ke Supabase → SQL Editor → Run
   ```
   Tabel ini mencatat pengerjaan kuis murid — sumber data **Laporan Sekolah** dan laporan guru.

> Saat tabel `quiz_attempts` belum dibuat, halaman Laporan menampilkan banner peringatan yang ramah, dan aplikasi tetap berjalan normal.

### 5. Jalankan

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

---

## 🔐 Autentikasi & Role

- Pendaftaran murid: `/register` (verifikasi email) · Guru & admin dibuat oleh admin sekolah lewat dashboard `/a/guru` & `/a/murid` (Supabase Admin API).
- `src/middleware.ts` melindungi route berdasarkan role:
  - `/m/*` → role `murid` · `/g/*` → role `guru` · `/a/*` → role `admin`
- Profile dibuat otomatis saat sign-up; `AuthProvider` (`src/lib/auth-context.tsx`) memiliki *safety net* yang membuat/memperbaiki profile bila hilang.
- **RLS** membatasi akses data per role (mis. murid hanya bisa melihat/menambah `quiz_attempts` miliknya sendiri).

### Env vars yang digunakan

| Variable | Wajib | Fungsi |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL proyek Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Kunci anon (client & server) |
| `SUPABASE_SERVICE_ROLE_KEY` | Untuk admin | Membuat/ban/hapus user via Admin API |
| `NEXT_PUBLIC_SPEECH_API_URL` | ❌ | Base URL server speech (default `https://api.rynaqrtz.my.id`) |

---

## 🗄 Database

Tabel utama yang dipakai aplikasi (kolom mengikuti pemakaian di kode):

| Tabel | Kolom kunci | Dipakai untuk |
|---|---|---|
| `profiles` | `id`, `role` (`murid`/`guru`/`admin`), `full_name`, `email`, `school_id`, `class_code`, `nis`, `avatar_url` | Identitas & relasi semua role |
| `schools` | `id`, `name`, `npsn` | Profil sekolah |
| `classes` | `id`, `name`, `code` (unik), `school_id`, `teacher_id` | Kelas & wali kelas |
| `tasks` | `id`, `school_id`, `teacher_id`, `class_code`, `title`, `type` (`flashcard`/`kuis`), `level`, `category`, `target`, `duration`, `deadline` | Tugas guru |
| `quizzes` | `id`, `school_id`, `teacher_id`, `title`, `level`, `passing_grade`, `class_code`, `published_at` | Kuis guru |
| `quiz_words` | `id`, `quiz_id`, `kanji`, `furigana`, `arti`, `level`, `sort_order` | Soal kuis guru |
| `quiz_attempts` | `id`, `student_id`, `school_id`, `quiz_id`, `score` (0–100), `correct_count`, `total_questions`, `total_xp`, `submitted_at` | Pengerjaan kuis murid (migrasi `001_quiz_attempts.sql`, lengkap dengan policy RLS) |

> Progress murid (XP, streak, kata dipelajari, SRS) disimpan di **localStorage** (`lf-progress`) — bukan di database, jadi reset per perangkat.

---

## 🎙 Speech, AI Sensei & Scoring

### Server speech eksternal
Fitur AI (Sensei, transkripsi, terjemahan) memanggil server teman di `https://api.rynaqrtz.my.id` (bisa di-override lewat env). Semua panggilan di `src/lib/speech-api.ts` punya **timeout & pesan error bahasa Indonesia**; karena bukan layanan ber-SLA, ada proteksi anti-spam di sisi klien (`useSpeechRateLimit`) — cooldown antar request + kuota sesi.

### TTS gratis
Pengucapan kata/kalimat memakai **Web Speech API** bawaan browser (suara Jepang neural di Chrome/Edge/Android) — tanpa backend & tanpa biaya (`src/lib/speech.ts`).

### Skor pelafalan (`src/lib/scoring.ts`)
Transkrip Whisper dibandingkan dengan kalimat target memakai **jarak Levenshtein**, setelah normalisasi simetris: tanda baca dibuang, katakana → hiragana, partikel は/へ/を dilonggarkan ke わ/え/お (Whisper sering menulis sesuai bunyi). Skor 0–100 + label motivasi.

### AI Sensei
Chat suara: rekam → server mengembalikan transkrip + balasan AI + audio (opsional) → subtitle romaji (Google Translate `dt=rm`, fallback konversi kana lokal di `src/lib/romaji.ts`) & terjemahan Indonesia dimuat async tanpa memblokir chat. Tiga level percakapan: Pemula / Menengah / Mahir.

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

| Data | Sumber | Lisensi |
|---|---|---|
| Word list + level JLPT | Bluskyo/JLPT_Vocabulary (tanos.co.uk) | **CC-BY** — Jonathan Waller |
| Arti bahasa Indonesia | open-dict-data/wikidict-ja | CC0 (Wikidata) |
| POS + frekuensi + gloss | AnchorI/jlpt-kanji-dictionary | MIT |

> ⚠️ **Kewajiban atribusi (CC-BY):** cantumkan kredit *"Kosakata JLPT — Jonathan Waller (tanos.co.uk)"* di aplikasi publik (mis. footer halaman Kamus atau halaman Tentang).

Pipeline: unduh → parse & gabung → generate romaji (Hepburn-ish, tanpa library) → dedupe (prioritas level terendah) → validasi → tulis `src/data/vocabulary.ts`.

---

## 🧩 Konvensi Kode

- **Struktur folder:** per-route di `src/app/<area>/<fitur>/` berisi `page.tsx` (UI, "use client") + `actions.ts` (Server Actions untuk mutasi DB) + kadang `page.tsx` server component yang memanggil `src/lib/queries/`.
- **Path alias:** `@/*` → `src/*`.
- **UI kit:** komponen di `src/components/ui/` (Button, Card, Badge, Input, Select, ProgressBar, BottomSheet, Avatar, dst.) dengan **design tokens** Tailwind: `bg-warm-white`, `bg-paper`, `text-ink`, `text-ink-soft`, `text-indigo`, `text-vermillion`, `text-gold`, `text-success`, `text-error`, `border-line`, `rounded-card`, `rounded-btn`, `shadow-soft`, `shadow-soft-lg`, dsb. Mode gelap via kelas `.dark` (`src/lib/theme.tsx`).
- **Progress murid:** selalu lewat `useProgress()` dari `src/lib/progress.ts` — jangan hardcode angka.
- **Panggilan speech:** selalu lewat `speakJapanese`/`useJapaneseSpeech` (bukan `speechSynthesis` langsung), dan API eksternal lewat `src/lib/speech-api.ts` dengan timeout.
- **Hydration-safe:** baca `localStorage`/`sessionStorage`/`Date` di dalam `useEffect`, bukan di initial state.
- **Bahasa kode:** komentar ditulis campuran Indonesia/Inggris mengikuti konvensi file sekitarnya.

---

## 📜 Scripts (`package.json`)

| Script | Fungsi |
|---|---|
| `npm run dev` | Jalankan dev server |
| `npm run build` / `start` | Build & jalankan produksi |
| `npm run lint` | ESLint (Next core-web-vitals + TS) |
| `npm run build:vocab` | Generate word bank vocabulary |
| `npm run dev:start` | Bersihkan port 3000/3001 + `.next`, lalu `next dev` |
| `npm run dev:stop` | Matikan server di port 3000/3001 |
| `npm run start:prod` | `rm -rf .next && next build && next start` |

---

## 🧰 Troubleshooting

| Gejala | Solusi |
|---|---|
| "Tabel quiz_attempts belum dibuat" di Laporan | Jalankan `supabase/migrations/001_quiz_attempts.sql` di Supabase → SQL Editor |
| Laporan sekolah kosong | Pastikan admin punya `school_id` (atur di **Pengaturan Sekolah**) dan murid sudah pernah mengerjakan kuis |
| Login gagal "Email belum diverifikasi" | Klik link konfirmasi di email (cekJuga folder spam) |
| AI Sensei gagal / "TTS dibatasi" | Server speech milik teman sering kena batas Google TTS — tunggu 1–2 menit, lalu coba lagi (ada cooldown otomatis) |
| `NEXT_PUBLIC_SUPABASE_*` undefined | Pastikan `.env.local` terisi & server di-restart |
| Mode gelap tidak tersimpan | Penyimpanan di `localStorage` (`lf-theme`) — bersihkan cache bila aneh |

---

## 🗺 Roadmap / Ide Selanjutnya

- Menautkan tugas & kuis guru ke dashboard murid (saat ini seed kosong — data akan datang dari DB)
- Papan peringkat dengan data nyata antar murid
- Leaderboard & statistik guru berbasis `quiz_attempts`
- Ganti password langsung dari aplikasi

---

Dibuat dengan ❤️ untuk murid SMK Indonesia. 日本語を楽しんでください！
