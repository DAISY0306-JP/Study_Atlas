create extension if not exists "pgcrypto";

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  color text default '#7c3aed',
  created_at timestamptz default now()
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  subject_id uuid references public.subjects(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  subject_id uuid references public.subjects(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists public.study_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  subject_id uuid references public.subjects(id) on delete cascade,
  material_id uuid references public.materials(id) on delete set null,
  skill_id uuid references public.skills(id) on delete set null,
  studied_at date not null,
  duration_minutes integer not null check (duration_minutes >= 0),
  content text,
  understanding integer check (understanding between 1 and 5),
  needs_review boolean default false,
  memo text,
  created_at timestamptz default now()
);

-- 現状のフロントは教材/スキルを固定のテキスト選択肢として扱っており、
-- materials/skillsテーブルとの正規化はまだ使っていないため、
-- study_logsに直接テキストで持たせる列を用意する
alter table public.study_logs add column if not exists material text;
alter table public.study_logs add column if not exists skill text;

create table if not exists public.ai_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  subject_id uuid references public.subjects(id) on delete cascade,
  question text not null,
  answer text,
  created_at timestamptz default now()
);
