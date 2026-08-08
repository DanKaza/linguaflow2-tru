-- ============================================================================
-- 001_quiz_attempts.sql
-- Mencatat pengerjaan kuis murid — sumber data untuk Laporan Sekolah (admin)
-- dan laporan guru. Jalankan di Supabase Dashboard → SQL Editor → Run.
--
-- Cara pakai:
--   1. Buka https://supabase.com/dashboard → project kamu → SQL Editor
--   2. Tempel seluruh isi file ini → Run
--   3. Selesai — tabel + RLS langsung aktif, tidak perlu langkah lain.
-- ============================================================================

-- Tabel attempt kuis. `quiz_id` bernilai NULL untuk "Kuis Harian" (soal acak
-- dari vocab bank); terisi saat murid mengerjakan kuis yang dipublikasikan guru.
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,
  school_id uuid references public.schools (id) on delete cascade,
  quiz_id uuid references public.quizzes (id) on delete set null,
  score smallint not null check (score between 0 and 100),
  correct_count smallint not null default 0,
  total_questions smallint not null default 0,
  total_xp smallint not null default 0,
  submitted_at timestamptz not null default now()
);

-- Indeks untuk agregasi laporan per sekolah & per murid.
create index if not exists quiz_attempts_school_idx
  on public.quiz_attempts (school_id, submitted_at desc);
create index if not exists quiz_attempts_student_idx
  on public.quiz_attempts (student_id, submitted_at desc);

-- Aktifkan Row Level Security.
alter table public.quiz_attempts enable row level security;

-- Policy idempoten: bisa dijalankan ulang tanpa error.
drop policy if exists "Murid lihat attempt sendiri" on public.quiz_attempts;
drop policy if exists "Murid tambah attempt sendiri" on public.quiz_attempts;
drop policy if exists "Admin baca attempt sekolahnya" on public.quiz_attempts;
drop policy if exists "Guru baca attempt kelasnya" on public.quiz_attempts;

-- Murid: hanya bisa melihat & menambah pengerjaan miliknya sendiri.
create policy "Murid lihat attempt sendiri"
  on public.quiz_attempts
  for select
  to authenticated
  using (auth.uid() = student_id);

create policy "Murid tambah attempt sendiri"
  on public.quiz_attempts
  for insert
  to authenticated
  with check (auth.uid() = student_id);

-- Admin: baca semua attempt di sekolahnya (untuk Laporan Sekolah).
create policy "Admin baca attempt sekolahnya"
  on public.quiz_attempts
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.school_id = quiz_attempts.school_id
    )
  );

-- Guru: baca attempt murid di kelas yang diajarnya (untuk laporan guru).
create policy "Guru baca attempt kelasnya"
  on public.quiz_attempts
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles murid
      join public.classes c on c.code = murid.class_code
      where murid.id = quiz_attempts.student_id
        and c.teacher_id = auth.uid()
    )
  );
