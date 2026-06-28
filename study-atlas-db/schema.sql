create extension if not exists "pgcrypto";

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text not null,
  color text default '#7c3aed',
  created_at timestamptz default now()
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  subject_id uuid references public.subjects(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  subject_id uuid references public.subjects(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists public.study_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
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

create table if not exists public.ai_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  subject_id uuid references public.subjects(id) on delete cascade,
  question text not null,
  answer text,
  created_at timestamptz default now()
);
