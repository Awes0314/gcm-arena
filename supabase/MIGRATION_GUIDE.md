# Public Schema Migration Guide

このドキュメントは、開発環境（dev スキーマ）から本番環境（public スキーマ）へのマイグレーション手順を説明します。

## 概要

GCM Arena プラットフォームは、スキーマベースの環境分離を使用しています：

- **dev スキーマ**: 開発環境用
- **public スキーマ**: 本番環境用

両スキーマは同じテーブル構造、RLS ポリシー、関数を持ちますが、データは完全に分離されています。

## マイグレーションファイル

以下のマイグレーションファイルを順番に実行してください：

1. `00014_create_public_schema.sql` - テーブル、型、インデックスの作成
2. `00015_public_rls_policies.sql` - RLS ポリシーの設定
3. `00016_public_functions_and_views.sql` - 関数とビューの作成
4. `00017_public_permissions.sql` - 権限の付与

## マイグレーション手順

### 方法 1: Supabase ダッシュボード（推奨）

1. **Supabase ダッシュボードにアクセス**
   - https://supabase.com にログイン
   - 本番プロジェクトを選択

2. **SQL Editor を開く**
   - 左サイドバーから "SQL Editor" を選択
   - "New query" をクリック

3. **マイグレーションを実行**
   
   各マイグレーションファイルの内容を順番にコピー＆ペーストして実行：

   ```sql
   -- 1. テーブル作成
   -- 00014_create_public_schema.sql の内容をペースト
   -- "Run" をクリック
   
   -- 2. RLS ポリシー
   -- 00015_public_rls_policies.sql の内容をペースト
   -- "Run" をクリック
   
   -- 3. 関数とビュー
   -- 00016_public_functions_and_views.sql の内容をペースト
   -- "Run" をクリック
   
   -- 4. 権限設定
   -- 00017_public_permissions.sql の内容をペースト
   -- "Run" をクリック
   ```

4. **実行結果を確認**
   - エラーがないことを確認
   - "Success. No rows returned" が表示されれば成功

### 方法 2: Supabase CLI

```bash
# 1. Supabase CLI のインストール（未インストールの場合）
npm install -g supabase

# 2. プロジェクトにリンク
supabase link --project-ref your-project-ref

# 3. マイグレーションの実行
supabase db push

# または、特定のマイグレーションのみ実行
supabase db push --include-all
```

### 方法 3: psql コマンドライン

```bash
# 1. Supabase データベースに接続
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# 2. マイグレーションファイルを実行
\i supabase/migrations/00014_create_public_schema.sql
\i supabase/migrations/00015_public_rls_policies.sql
\i supabase/migrations/00016_public_functions_and_views.sql
\i supabase/migrations/00017_public_permissions.sql

# 3. 接続を終了
\q
```

## マイグレーション後の確認

### 1. テーブルの確認

```sql
-- public スキーマのテーブル一覧を表示
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 期待される結果:
-- notifications
-- participants
-- profiles
-- scores
-- songs
-- tournament_songs
-- tournaments
```

### 2. RLS ポリシーの確認

```sql
-- RLS が有効になっているか確認
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- すべてのテーブルで rowsecurity = true であることを確認
```

### 3. 関数の確認

```sql
-- public スキーマの関数一覧を表示
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- 期待される関数:
-- calculate_ranking
-- check_active_tournament_limit
-- get_participant_count
-- get_score_count
-- has_active_tournament
-- update_updated_at_column
```

### 4. ビューの確認

```sql
-- public スキーマのビュー一覧を表示
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- 期待されるビュー:
-- tournaments_with_status
```

## データマイグレーション（オプション）

開発環境のデータを本番環境に移行する場合：

### 楽曲データのコピー

```sql
-- dev スキーマから public スキーマに楽曲データをコピー
INSERT INTO public.songs (id, game_type, title, artist, difficulty, level, created_at, updated_at)
SELECT id, game_type, title, artist, difficulty, level, created_at, updated_at
FROM dev.songs
ON CONFLICT (game_type, title, difficulty) DO NOTHING;
```

### ユーザーデータの移行

**注意**: ユーザーデータ（profiles）は auth.users に紐づいているため、
本番環境では新規にユーザー登録を行う必要があります。

開発環境のデータを本番環境に移行することは推奨されません。

## 環境変数の更新

マイグレーション後、アプリケーションの環境変数を更新してください：

### ローカル開発環境（.env.local）

```bash
# 開発環境は dev スキーマを使用
SUPABASE_SCHEMA=dev
NEXT_PUBLIC_SUPABASE_SCHEMA=dev
```

### Vercel 本番環境

```bash
# 本番環境は public スキーマを使用
SUPABASE_SCHEMA=public
NEXT_PUBLIC_SUPABASE_SCHEMA=public
```

Vercel ダッシュボードで環境変数を設定：
1. Settings > Environment Variables
2. `SUPABASE_SCHEMA` と `NEXT_PUBLIC_SUPABASE_SCHEMA` を `public` に設定
3. Environment: Production のみにチェック

## トラブルシューティング

### エラー: "permission denied for schema public"

**原因**: 権限が正しく設定されていない

**解決方法**:
```sql
-- 00017_public_permissions.sql を再実行
\i supabase/migrations/00017_public_permissions.sql
```

### エラー: "relation already exists"

**原因**: テーブルが既に存在する

**解決方法**:
```sql
-- 既存のテーブルを削除（注意: データも削除されます）
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- マイグレーションを再実行
```

### エラー: "function does not exist"

**原因**: 関数が作成されていない

**解決方法**:
```sql
-- 00016_public_functions_and_views.sql を再実行
\i supabase/migrations/00016_public_functions_and_views.sql
```

### RLS ポリシーが機能しない

**確認事項**:
1. RLS が有効になっているか確認
2. ポリシーが正しく作成されているか確認
3. auth.uid() が正しく取得できているか確認

```sql
-- RLS の状態を確認
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- ポリシーの一覧を確認
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

## ロールバック

問題が発生した場合のロールバック手順：

```sql
-- public スキーマのすべてのオブジェクトを削除
DROP SCHEMA public CASCADE;

-- public スキーマを再作成
CREATE SCHEMA public;

-- デフォルト権限を復元
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

## 次のステップ

マイグレーション完了後：

1. [DEPLOYMENT.md](../DEPLOYMENT.md) を参照してデプロイを実行
2. 本番環境で基本機能をテスト
3. 楽曲データをインポート（`npm run import-songs`）
4. 監視とログを設定

## 参考資料

- [Supabase Schema Management](https://supabase.com/docs/guides/database/schema)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Functions](https://supabase.com/docs/guides/database/functions)
