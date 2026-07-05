# study-atlas-api

Study Atlas のバックエンドAPIです。

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
