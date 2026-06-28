-- 初期データ例：韓国語専用スタート
-- user_id を使う場合は、実際のユーザーIDに置き換える

insert into public.subjects (name, color)
values ('韓国語', '#7c3aed')
on conflict do nothing;

-- subject_id はSupabase画面で確認して差し替え推奨
