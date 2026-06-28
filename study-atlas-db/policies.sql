-- RLSを使う場合の方針メモ
-- 本番では user_id = auth.uid() の制限を入れる

alter table public.subjects enable row level security;
alter table public.materials enable row level security;
alter table public.skills enable row level security;
alter table public.study_logs enable row level security;
alter table public.ai_notes enable row level security;

-- 例：ログインユーザー本人のみ
-- create policy "Users can read own study logs"
-- on public.study_logs for select
-- using (auth.uid() = user_id);
