# GCM Arena Platform - Deployment Guide

このドキュメントは、GCM Arena プラットフォームを本番環境にデプロイするための手順を説明します。

## 目次

1. [環境変数の設定](#環境変数の設定)
2. [Supabase 本番環境のセットアップ](#supabase-本番環境のセットアップ)
3. [Vercel へのデプロイ](#vercel-へのデプロイ)
4. [CI/CD パイプライン](#cicd-パイプライン)
5. [デプロイ後の確認](#デプロイ後の確認)

---

## 環境変数の設定

### 必要な環境変数

本番環境では以下の環境変数を設定する必要があります：

#### Supabase 接続情報

```bash
# Supabase プロジェクト URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Supabase Anon Key（公開可能なキー）
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# データベーススキーマ（本番環境では "public" を使用）
SUPABASE_SCHEMA=public
NEXT_PUBLIC_SUPABASE_SCHEMA=public
```

### Vercel での環境変数設定手順

1. **Vercel ダッシュボードにアクセス**
   - https://vercel.com にログイン
   - プロジェクトを選択

2. **Settings > Environment Variables に移動**

3. **各環境変数を追加**
   - Variable Name: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: Supabase プロジェクトの URL
   - Environment: Production, Preview, Development すべてにチェック

4. **同様に他の環境変数も追加**
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SCHEMA`
   - `NEXT_PUBLIC_SUPABASE_SCHEMA`

### 環境別の設定

#### 開発環境（Development）
```bash
SUPABASE_SCHEMA=dev
NEXT_PUBLIC_SUPABASE_SCHEMA=dev
```

#### プレビュー環境（Preview）
```bash
SUPABASE_SCHEMA=dev
NEXT_PUBLIC_SUPABASE_SCHEMA=dev
```

#### 本番環境（Production）
```bash
SUPABASE_SCHEMA=public
NEXT_PUBLIC_SUPABASE_SCHEMA=public
```

---

## Supabase 本番環境のセットアップ

### 1. Supabase プロジェクトの作成

1. https://supabase.com にアクセス
2. 新しいプロジェクトを作成
3. プロジェクト名、データベースパスワードを設定
4. リージョンを選択（推奨: Tokyo）

### 2. データベーススキーマのマイグレーション

本番環境では `public` スキーマを使用します。

#### マイグレーションファイルの実行

Supabase ダッシュボードの SQL Editor で以下のマイグレーションを順番に実行：

1. `supabase/migrations/00014_create_public_schema.sql`
2. `supabase/migrations/00015_public_rls_policies.sql`
3. `supabase/migrations/00016_public_functions_and_views.sql`
4. `supabase/migrations/00017_public_permissions.sql`

または、Supabase CLI を使用：

```bash
# Supabase CLI のインストール
npm install -g supabase

# プロジェクトにリンク
supabase link --project-ref your-project-ref

# マイグレーションの実行
supabase db push
```

### 3. Storage バケットの設定

1. Supabase ダッシュボードで Storage に移動
2. `supabase/setup-storage-bucket.sql` の内容を SQL Editor で実行
3. または、UI から手動で設定：
   - バケット名: `score-images`
   - Public: No
   - File size limit: 5MB
   - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`

### 4. 楽曲データのインポート

```bash
# 本番環境の環境変数を設定
export SUPABASE_SCHEMA=public
export NEXT_PUBLIC_SUPABASE_SCHEMA=public

# 楽曲データをインポート
npm run import-songs
```

---

## Vercel へのデプロイ

### 初回デプロイ

1. **GitHub リポジトリと連携**
   - Vercel ダッシュボードで "New Project" をクリック
   - GitHub リポジトリを選択
   - Import をクリック

2. **プロジェクト設定**
   - Framework Preset: Next.js
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`

3. **環境変数を設定**
   - 上記の「環境変数の設定」セクションを参照

4. **Deploy をクリック**

### 継続的デプロイ

GitHub Actions により自動的にデプロイされます：

- **main ブランチ**: 本番環境に自動デプロイ
- **feature ブランチ**: プレビュー環境に自動デプロイ

---

## CI/CD パイプライン

### GitHub Actions ワークフロー

プロジェクトには以下のワークフローが設定されています：

#### 1. テスト実行（`.github/workflows/test.yml`）

すべてのプッシュとプルリクエストで実行：
- ユニットテストの実行
- プロパティベーステストの実行
- コードカバレッジの確認

#### 2. デプロイ（`.github/workflows/deploy.yml`）

main ブランチへのマージ時に実行：
- テストの実行
- Vercel への自動デプロイ

### ワークフローの確認

GitHub リポジトリの "Actions" タブで実行状況を確認できます。

---

## デプロイ後の確認

### 1. 基本機能の確認

- [ ] トップページが表示される
- [ ] ユーザー登録ができる
- [ ] ログインができる
- [ ] 大会一覧が表示される

### 2. 認証機能の確認

- [ ] 新規ユーザー登録
- [ ] ログイン/ログアウト
- [ ] プロフィール編集

### 3. 大会機能の確認

- [ ] 大会作成
- [ ] 大会一覧表示
- [ ] 大会詳細表示
- [ ] 大会への参加/離脱

### 4. スコア提出の確認

- [ ] 手動スコア提出
- [ ] 画像アップロード
- [ ] ランキング表示

### 5. 通知機能の確認

- [ ] 通知の受信
- [ ] 通知の既読マーク

### 6. Cron ジョブの確認

Vercel ダッシュボードで Cron ジョブが正しく設定されているか確認：

- [ ] `tournament-notifications`: 毎時実行
- [ ] `cleanup-images`: 毎日実行

---

## トラブルシューティング

### データベース接続エラー

**症状**: "Failed to connect to database"

**解決方法**:
1. 環境変数が正しく設定されているか確認
2. Supabase プロジェクトが起動しているか確認
3. RLS ポリシーが正しく設定されているか確認

### ビルドエラー

**症状**: Vercel でのビルドが失敗する

**解決方法**:
1. ローカルで `npm run build` を実行して確認
2. 依存関係が正しくインストールされているか確認
3. TypeScript のエラーがないか確認

### 環境変数が反映されない

**症状**: 環境変数の変更が反映されない

**解決方法**:
1. Vercel で環境変数を変更後、再デプロイが必要
2. Settings > Environment Variables で変更を保存
3. Deployments タブから "Redeploy" を実行

---

## セキュリティチェックリスト

デプロイ前に以下を確認してください：

- [ ] すべての環境変数が正しく設定されている
- [ ] RLS ポリシーが有効になっている
- [ ] API エンドポイントに適切な認証が実装されている
- [ ] レート制限が設定されている
- [ ] CSRF 保護が有効になっている
- [ ] 入力サニタイゼーションが実装されている
- [ ] Storage バケットのアクセス権限が適切に設定されている

---

## ロールバック手順

問題が発生した場合のロールバック手順：

### Vercel でのロールバック

1. Vercel ダッシュボードの Deployments タブに移動
2. 以前の正常なデプロイメントを選択
3. "Promote to Production" をクリック

### データベースのロールバック

```bash
# Supabase CLI を使用
supabase db reset

# または、特定のマイグレーションまで戻す
supabase db reset --version <migration-version>
```

---

## サポート

問題が発生した場合は、以下を確認してください：

1. [Supabase ドキュメント](https://supabase.com/docs)
2. [Next.js ドキュメント](https://nextjs.org/docs)
3. [Vercel ドキュメント](https://vercel.com/docs)

---

## 更新履歴

- 2026-01-16: 初版作成
