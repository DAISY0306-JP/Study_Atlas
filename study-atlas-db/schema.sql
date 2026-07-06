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
alter table public.study_logs add column if not exists weak_tags text[] default '{}';

create table if not exists public.mock_exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  exam_no integer,
  taken_at date not null,
  reading_score integer check (reading_score between 0 and 100),
  writing_score integer check (writing_score between 0 and 100),
  listening_score integer check (listening_score between 0 and 100),
  total_score integer generated always as (
    coalesce(reading_score, 0) + coalesce(writing_score, 0) + coalesce(listening_score, 0)
  ) stored,
  memo text,
  created_at timestamptz default now()
);

create table if not exists public.reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  period_type text not null check (period_type in ('weekly', 'monthly')),
  period_start date not null,
  good_points text,
  weak_points text,
  next_goal text,
  created_at timestamptz default now()
);

create table if not exists public.vocab_words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  word text not null,
  meaning text,
  is_weak boolean not null default false,
  review_count integer not null default 0,
  learned_at date not null default current_date,
  last_reviewed_at date,
  created_at timestamptz default now()
);

create table if not exists public.ai_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  subject_id uuid references public.subjects(id) on delete cascade,
  question text not null,
  answer text,
  created_at timestamptz default now()
);
