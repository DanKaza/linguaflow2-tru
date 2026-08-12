-- ============================================================================
-- LinguaFlow School — SETUP DATABASE TESTING
-- Struktur tabel diambil dari pemakaian kode (src/app, src/lib).
--
-- Cara pakai:
--   1. Buka https://supabase.com/dashboard → pilih project kamu → SQL Editor
--   2. Tempel SELURUH isi file ini → klik Run
--   3. Selesai! Semua tabel + trigger langsung aktif.
--
-- Catatan: tabel inti sengaja TANPA Row Level Security (RLS) supaya
-- pengembangan/testing frontend lancar tanpa hambatan policy. Untuk
-- produksi, backend harus menambahkan policy RLS terpisah.
-- ============================================================================

-- ── 1) TABEL INTI ──────────────────────────────────────────────────────────

-- Sekolah
create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  npsn text,
  admin_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Profil user (murid / guru / admin)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'murid' check (role in ('murid', 'guru', 'admin')),
  full_name text not null default 'User',
  email text,
  avatar_url text,
  school_id uuid references public.schools (id) on delete set null,
  class_code text,
  nis text,
  created_at timestamptz not null default now()
);

create index if not exists profiles_school_idx on public.profiles (school_id);
create index if not exists profiles_class_idx on public.profiles (class_code);

-- Kelas
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools (id) on delete cascade,
  name text not null,
  code text not null unique,
  teacher_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Tugas guru (flashcard / kuis)
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools (id) on delete cascade,
  teacher_id uuid references auth.users (id) on delete cascade,
  class_code text,
  title text not null,
  type text not null default 'flashcard' check (type in ('flashcard', 'kuis')),
  level text not null default 'N5',
  category text default '',
  target int not null default 10,
  duration int not null default 15,
  deadline date,
  created_at timestamptz not null default now()
);

-- Kuis guru
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools (id) on delete cascade,
  teacher_id uuid references auth.users (id) on delete cascade,
  title text not null,
  level text not null default 'N5',
  passing_grade int not null default 75,
  class_code text,
  published_at date,
  created_at timestamptz not null default now()
);

-- Soal kuis
create table if not exists public.quiz_words (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references public.quizzes (id) on delete cascade,
  kanji text,
  furigana text,
  arti text not null,
  level text default 'N5',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ── 2) TRIGGER: bikin profile otomatis saat user baru daftar ────────────────
-- Dipakai juga oleh admin saat membuat akun murid/guru (a/guru & a/murid).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, email, school_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'murid'),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1), 'User'),
    new.email,
    nullif(new.raw_user_meta_data->>'school_id', '')::uuid
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 3) TABEL PENGERJAAN KUIS (dari migrasi 001_quiz_attempts.sql) ───────────
-- Mencatat pengerjaan kuis murid — sumber data Laporan Sekolah & guru.
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

create index if not exists quiz_attempts_school_idx
  on public.quiz_attempts (school_id, submitted_at desc);
create index if not exists quiz_attempts_student_idx
  on public.quiz_attempts (student_id, submitted_at desc);

-- RLS khusus untuk quiz_attempts (sesuai migrasi asli di repo).
alter table public.quiz_attempts enable row level security;

drop policy if exists "Murid lihat attempt sendiri" on public.quiz_attempts;
drop policy if exists "Murid tambah attempt sendiri" on public.quiz_attempts;
drop policy if exists "Admin baca attempt sekolahnya" on public.quiz_attempts;
drop policy if exists "Guru baca attempt kelasnya" on public.quiz_attempts;

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
