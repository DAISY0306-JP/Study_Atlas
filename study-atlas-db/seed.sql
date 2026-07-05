-- 初期データ例：韓国語専用スタート
-- user_id は必須になったため、Supabase画面の Authentication > Users で
-- 確認した自分のユーザーIDに置き換えてから実行すること

insert into public.subjects (user_id, name, color)
values ('00000000-0000-0000-0000-000000000000', '韓国語', '#7c3aed')
on conflict do nothing;

-- subject_id はSupabase画面で確認して差し替え推奨
