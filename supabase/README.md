# Supabase Database Migrations

このディレクトリには、GCM Arena プラットフォームのデータベーススキーマ定義が含まれています。

## マイグレーションの適用方法

### オプション 1: Supabase SQL Editor を使用

1. [Supabase Dashboard](https://app.supabase.com) にログイン
2. プロジェクトを選択
3. 左サイドバーから「SQL Editor」を選択
4. 「New query」をクリック
5. `migrations/` ディレクトリ内の SQL ファイルの内容をコピー＆ペースト
6. 「Run」をクリックして実行

### オプション 2: Supabase CLI を使用

```bash
# Supabase CLI をインストール（未インストールの場合）
npm install -g supabase

# プロジェクトにリンク
supabase link --project-ref <your-project-ref>

# マイグレーションを適用
supabase db push
```

## マイグレーションファイル

- `00001_create_dev_schema.sql` - dev スキーマと基本テーブルの作成
- `00002_create_rls_policies.sql` - 行レベルセキュリティポリシーの実装
- `00003_create_functions_and_views.sql` - データベース関数とビューの作成

## 環境変数

`.env.local` ファイルで `SUPABASE_SCHEMA` 環境変数を設定してください：

- 開発環境: `SUPABASE_SCHEMA=dev`
- 本番環境: `SUPABASE_SCHEMA=public`

## 注意事項

- マイグレーションは順番に実行してください
- 本番環境に適用する前に、必ず開発環境でテストしてください
- RLS ポリシーが正しく設定されていることを確認してください
