-- RLS方針：本人のデータのみ読み書き可能にする

alter table public.subjects enable row level security;
alter table public.materials enable row level security;
alter table public.skills enable row level security;
alter table public.study_logs enable row level security;
alter table public.mock_exams enable row level security;
alter table public.ai_notes enable row level security;

create policy "subjects: owner select" on public.subjects
  for select using (auth.uid() = user_id);
create policy "subjects: owner insert" on public.subjects
  for insert with check (auth.uid() = user_id);
create policy "subjects: owner update" on public.subjects
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "subjects: owner delete" on public.subjects
  for delete using (auth.uid() = user_id);

create policy "materials: owner select" on public.materials
  for select using (auth.uid() = user_id);
create policy "materials: owner insert" on public.materials
  for insert with check (auth.uid() = user_id);
create policy "materials: owner update" on public.materials
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "materials: owner delete" on public.materials
  for delete using (auth.uid() = user_id);

create policy "skills: owner select" on public.skills
  for select using (auth.uid() = user_id);
create policy "skills: owner insert" on public.skills
  for insert with check (auth.uid() = user_id);
create policy "skills: owner update" on public.skills
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "skills: owner delete" on public.skills
  for delete using (auth.uid() = user_id);

create policy "study_logs: owner select" on public.study_logs
  for select using (auth.uid() = user_id);
create policy "study_logs: owner insert" on public.study_logs
  for insert with check (auth.uid() = user_id);
create policy "study_logs: owner update" on public.study_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "study_logs: owner delete" on public.study_logs
  for delete using (auth.uid() = user_id);

create policy "mock_exams: owner select" on public.mock_exams
  for select using (auth.uid() = user_id);
create policy "mock_exams: owner insert" on public.mock_exams
  for insert with check (auth.uid() = user_id);
create policy "mock_exams: owner update" on public.mock_exams
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "mock_exams: owner delete" on public.mock_exams
  for delete using (auth.uid() = user_id);

create policy "ai_notes: owner select" on public.ai_notes
  for select using (auth.uid() = user_id);
create policy "ai_notes: owner insert" on public.ai_notes
  for insert with check (auth.uid() = user_id);
create policy "ai_notes: owner update" on public.ai_notes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_notes: owner delete" on public.ai_notes
  for delete using (auth.uid() = user_id);
