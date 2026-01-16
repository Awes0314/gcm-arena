# Supabase データベースセットアップガイド

このガイドでは、GCM Arena プラットフォームのデータベーススキーマを Supabase に適用する手順を説明します。

## 前提条件

- Supabase プロジェクトが作成済み
- Supabase Dashboard へのアクセス権限
- `.env.local` ファイルに Supabase の接続情報が設定済み

## セットアップ手順

### ステップ 1: Supabase Dashboard にアクセス

1. [Supabase Dashboard](https://app.supabase.com) にログイン
2. プロジェクトを選択
3. 左サイドバーから「SQL Editor」を選択

### ステップ 2: マイグレーションの適用

以下のマイグレーションファイルを順番に実行してください：

#### 2.1. スキーマとテーブルの作成

1. SQL Editor で「New query」をクリック
2. `supabase/migrations/00001_create_dev_schema.sql` の内容をコピー＆ペースト
3. 「Run」をクリックして実行
4. 成功メッセージを確認

**作成されるもの:**
- `dev` スキーマ
- Enum 型（game_type, tournament_status, submission_method, difficulty, score_status）
- テーブル（profiles, songs, tournaments, tournament_songs, participants, scores, notifications）
- インデックス
- トリガー（updated_at 自動更新）

#### 2.2. RLS ポリシーの実装

1. SQL Editor で「New query」をクリック
2. `supabase/migrations/00002_create_rls_policies.sql` の内容をコピー＆ペースト
3. 「Run」をクリックして実行
4. 成功メッセージを確認

**作成されるもの:**
- 全テーブルの RLS 有効化
- 各テーブルのアクセス制御ポリシー
  - profiles: 全員閲覧可、自分のみ更新可
  - tournaments: 公開/非公開の閲覧制御
  - participants: 参加者のみ閲覧可
  - scores: 参加者と開催者のみ閲覧可
  - notifications: 自分のみ閲覧・更新可

#### 2.3. 関数とビューの作成

1. SQL Editor で「New query」をクリック
2. `supabase/migrations/00003_create_functions_and_views.sql` の内容をコピー＆ペースト
3. 「Run」をクリックして実行
4. 成功メッセージを確認

**作成されるもの:**
- `calculate_ranking` 関数: ランキング計算
- `tournaments_with_status` ビュー: ステータス付き大会一覧
- `has_active_tournament` 関数: アクティブ大会チェック
- `get_participant_count` 関数: 参加者数取得
- `get_score_count` 関数: スコア数取得
- トリガー: アクティブ大会制限の強制

#### 2.4. スキーマ権限の付与（重要！）

1. SQL Editor で「New query」をクリック
2. `supabase/migrations/00004_grant_schema_permissions.sql` の内容をコピー＆ペースト
3. 「Run」をクリックして実行
4. 成功メッセージを確認

**付与される権限:**
- `anon` ロール: dev スキーマへの USAGE 権限、テーブルの SELECT 権限
- `authenticated` ロール: dev スキーマへの USAGE 権限、テーブルの SELECT/INSERT/UPDATE/DELETE 権限
- 関数の EXECUTE 権限
- 将来作成されるテーブルへのデフォルト権限

**注意:** この手順を省略すると、"permission denied for schema dev" エラーが発生します。

### ステップ 3: スキーマの公開設定

**注意:** この手順は、マイグレーション 00004 を実行した後は不要になる可能性があります。
権限が正しく設定されていれば、スキーマを明示的に公開する必要はありません。

dev スキーマを API 経由でアクセス可能にするため、以下の設定を行います：

1. Supabase Dashboard で「Settings」→「API」を選択
2. 「Exposed schemas」セクションを探す
3. `dev` スキーマを追加（デフォルトは `public` のみ）

**注意:** この設定により、`dev` スキーマが API 経由でアクセス可能になります。

### ステップ 4: 動作確認

#### 4.1. テーブルの確認

1. Supabase Dashboard で「Table Editor」を選択
2. スキーマドロップダウンから「dev」を選択
3. 以下のテーブルが表示されることを確認：
   - profiles
   - songs
   - tournaments
   - tournament_songs
   - participants
   - scores
   - notifications

#### 4.2. RLS ポリシーの確認

1. 各テーブルを選択
2. 「Policies」タブをクリック
3. ポリシーが設定されていることを確認

#### 4.3. 関数の確認

1. SQL Editor で以下のクエリを実行：

```sql
-- 関数の存在確認
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'dev'
ORDER BY routine_name;

-- ビューの存在確認
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'dev';
```

期待される結果：
- 関数: calculate_ranking, has_active_tournament, get_participant_count, get_score_count
- ビュー: tournaments_with_status

### ステップ 5: テストユーザーの作成（オプション）

プロパティベーステストを実行する場合、テストユーザーを作成します：

1. Supabase Dashboard で「Authentication」→「Users」を選択
2. 「Add user」をクリック
3. テストユーザーを作成（例：test-user-a@example.com）
4. 必要に応じて複数のユーザーを作成

## トラブルシューティング

### エラー: "schema dev does not exist"

**原因:** dev スキーマが作成されていない

**解決策:** 
1. マイグレーション 00001 を再実行
2. 実行時のエラーメッセージを確認

### エラー: "permission denied for schema dev"

**原因:** dev スキーマへのアクセス権限が付与されていない

**解決策:**
1. マイグレーション 00004 (`00004_grant_schema_permissions.sql`) を実行
2. anon および authenticated ロールに USAGE 権限が付与されていることを確認
3. 以下のクエリで権限を確認：

```sql
-- スキーマの権限を確認
SELECT 
  nspname as schema_name,
  nspacl as permissions
FROM pg_namespace
WHERE nspname = 'dev';

-- テーブルの権限を確認
SELECT 
  schemaname,
  tablename,
  tableowner,
  has_table_privilege('anon', schemaname || '.' || tablename, 'SELECT') as anon_select
FROM pg_tables
WHERE schemaname = 'dev';
```

### エラー: "infinite recursion detected in policy for relation"

**原因:** RLS ポリシー間で循環参照が発生している

**解決策:**
1. マイグレーション 00002 の最新版を使用していることを確認
2. 既存のポリシーを削除して再作成：

```sql
-- 既存のポリシーを削除
DROP POLICY IF EXISTS "tournament_songs_select_policy" ON dev.tournament_songs;
DROP POLICY IF EXISTS "participants_select_policy" ON dev.participants;

-- 新しいポリシーを作成（マイグレーション 00002 から）
-- tournament_songs_select_policy と participants_select_policy を再作成
```

3. ポリシーが正しく作成されたことを確認：

```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'dev'
ORDER BY tablename, policyname;
```

### エラー: "relation dev.profiles does not exist"

**原因:** テーブルが作成されていない、またはスキーマが間違っている

**解決策:**
1. マイグレーション 00001 が正常に完了したか確認
2. `.env.local` の `SUPABASE_SCHEMA` が `dev` に設定されているか確認

### テストが失敗する: "Invalid schema: dev"

**原因:** dev スキーマが API 経由で公開されていない

**解決策:**
1. Supabase Dashboard → Settings → API
2. Exposed schemas に `dev` を追加
3. プロジェクトを再起動（必要に応じて）

## 次のステップ

データベースのセットアップが完了したら：

1. **テストの実行:**
   ```bash
   npm test -- --run rls-policies.property.test.ts
   npm test -- --run database-functions.test.ts
   ```

2. **認証システムの実装:**
   - タスク 3: 認証システムの実装に進む
   - Supabase Auth の統合
   - セッション管理の実装

3. **プロフィール管理の実装:**
   - タスク 5: プロフィール管理機能の実装
   - プロフィール表示・編集機能

## 参考資料

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security (RLS)](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Functions](https://supabase.com/docs/guides/database/functions)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## サポート

問題が発生した場合：

1. Supabase Dashboard のログを確認
2. SQL Editor でエラーメッセージを確認
3. プロジェクトの README.md を参照
4. Supabase コミュニティフォーラムで質問
