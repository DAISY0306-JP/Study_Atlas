# study-atlas-api

Study Atlas のバックエンドAPIです。

**現在デプロイ済みのフロントエンドはこのAPIを使っていません。**
`study_logs` の読み書きはSupabaseのRLSにより本人のみに制限されているため、
フロントから直接Supabase（`js/app.js` の `window.supabaseClient`）を呼び出しています。
このAPIは、将来サーバー側の処理（AI採点など）が必要になった際のために残しています。

## 初期機能

- `/health`
- `/study-logs` GET
- `/study-logs` POST
- `/study-logs/:id` DELETE

`/study-logs` 系は全てSupabase Authでのログインが必要です。
リクエストヘッダーに `Authorization: Bearer <access_token>` を付与してください
（`access_token` はフロントのSupabaseログインで取得できるセッショントークン）。
本人が作成したデータのみ読み書きできるようRLSで制限されています。

## 起動

```bash
npm install
cp .env.example .env
npm run dev
```
