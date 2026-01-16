# GitHub Actions セットアップガイド

このガイドでは、GCM Arena プラットフォームの CI/CD パイプラインをセットアップする手順を説明します。

## 前提条件

- GitHub リポジトリが作成されている
- Vercel アカウントが作成されている
- Supabase プロジェクトが作成されている

## セットアップ手順

### ステップ 1: GitHub Secrets の設定

#### 1.1 GitHub リポジトリの Settings を開く

1. GitHub リポジトリにアクセス
2. "Settings" タブをクリック
3. 左サイドバーから "Secrets and variables" > "Actions" を選択

#### 1.2 Supabase Secrets の追加

**SUPABASE_URL の追加:**

1. "New repository secret" をクリック
2. Name: `SUPABASE_URL`
3. Secret: Supabase プロジェクトの URL
   - Supabase Dashboard > Settings > API > Project URL
   - 例: `https://xxxxxxxxxxxxx.supabase.co`
4. "Add secret" をクリック

**SUPABASE_ANON_KEY の追加:**

1. "New repository secret" をクリック
2. Name: `SUPABASE_ANON_KEY`
3. Secret: Supabase の Anon Key
   - Supabase Dashboard > Settings > API > Project API keys > anon public
4. "Add secret" をクリック

#### 1.3 Vercel Secrets の追加

**VERCEL_TOKEN の作成と追加:**

1. https://vercel.com/account/tokens にアクセス
2. "Create Token" をクリック
3. Token Name: `GitHub Actions`
4. Scope: "Full Account" を選択
5. Expiration: "No Expiration" または適切な期限を設定
6. "Create" をクリック
7. 表示されたトークンをコピー
8. GitHub に戻り、"New repository secret" をクリック
9. Name: `VERCEL_TOKEN`
10. Secret: コピーしたトークンをペースト
11. "Add secret" をクリック

**VERCEL_ORG_ID と VERCEL_PROJECT_ID の取得:**

ローカル環境で以下を実行:

```bash
# Vercel CLI のインストール（未インストールの場合）
npm install -g vercel

# プロジェクトディレクトリに移動
cd /path/to/gcm-arena-platform

# Vercel にログイン
vercel login

# プロジェクトをリンク
vercel link

# .vercel/project.json が作成される
cat .vercel/project.json
```

出力例:
```json
{
  "orgId": "team_xxxxxxxxxxxxx",
  "projectId": "prj_xxxxxxxxxxxxx"
}
```

**VERCEL_ORG_ID の追加:**

1. GitHub に戻り、"New repository secret" をクリック
2. Name: `VERCEL_ORG_ID`
3. Secret: `.vercel/project.json` の `orgId` の値
4. "Add secret" をクリック

**VERCEL_PROJECT_ID の追加:**

1. "New repository secret" をクリック
2. Name: `VERCEL_PROJECT_ID`
3. Secret: `.vercel/project.json` の `projectId` の値
4. "Add secret" をクリック

#### 1.4 Secrets の確認

すべての Secrets が追加されたことを確認:

- ✅ SUPABASE_URL
- ✅ SUPABASE_ANON_KEY
- ✅ VERCEL_TOKEN
- ✅ VERCEL_ORG_ID
- ✅ VERCEL_PROJECT_ID

### ステップ 2: ブランチ保護ルールの設定

#### 2.1 main ブランチの保護

1. GitHub リポジトリの "Settings" > "Branches" に移動
2. "Add branch protection rule" をクリック
3. Branch name pattern: `main`
4. 以下を有効化:

**Protect matching branches:**
- ✅ Require a pull request before merging
  - ✅ Require approvals: 1
  - ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Require status checks to pass before merging
  - ✅ Require branches to be up to date before merging
  - Status checks: `test` を追加
- ✅ Require conversation resolution before merging
- ✅ Do not allow bypassing the above settings

5. "Create" をクリック

#### 2.2 develop ブランチの保護（オプション）

同様の手順で develop ブランチも保護することを推奨します。

### ステップ 3: Vercel プロジェクトの設定

#### 3.1 Vercel プロジェクトの作成

1. https://vercel.com にログイン
2. "Add New..." > "Project" をクリック
3. GitHub リポジトリを選択
4. "Import" をクリック

#### 3.2 環境変数の設定

**Production 環境:**

1. Vercel Dashboard > Settings > Environment Variables
2. 以下の環境変数を追加:

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL | Production |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key | Production |
| `SUPABASE_SCHEMA` | `public` | Production |
| `NEXT_PUBLIC_SUPABASE_SCHEMA` | `public` | Production |

**Preview 環境:**

同様に Preview 環境用の環境変数を追加:

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL | Preview |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key | Preview |
| `SUPABASE_SCHEMA` | `dev` | Preview |
| `NEXT_PUBLIC_SUPABASE_SCHEMA` | `dev` | Preview |

#### 3.3 Git Integration の設定

1. Vercel Dashboard > Settings > Git
2. "Production Branch" を `main` に設定
3. "Automatically expose System Environment Variables" を有効化

### ステップ 4: 動作確認

#### 4.1 テストワークフローの確認

1. 新しいブランチを作成:
   ```bash
   git checkout -b feature/test-ci
   ```

2. 小さな変更をコミット:
   ```bash
   echo "# Test" >> README.md
   git add README.md
   git commit -m "test: CI/CD setup"
   git push origin feature/test-ci
   ```

3. GitHub の "Actions" タブで "Test" ワークフローが実行されることを確認

#### 4.2 デプロイワークフローの確認

1. Pull Request を作成:
   - GitHub で "Pull requests" > "New pull request"
   - base: `main`, compare: `feature/test-ci`
   - "Create pull request" をクリック

2. GitHub Actions が実行されることを確認:
   - ✅ Test ワークフローが成功
   - ✅ Deploy ワークフローが実行
   - ✅ PR にプレビュー URL がコメントされる

3. プレビュー URL にアクセスして動作確認

4. テストが成功したら PR をマージ:
   - "Merge pull request" をクリック
   - main ブランチへのデプロイが自動実行される

#### 4.3 本番デプロイの確認

1. GitHub の "Actions" タブで "Deploy to Vercel" ワークフローを確認
2. Vercel Dashboard で本番デプロイを確認
3. 本番 URL にアクセスして動作確認

### ステップ 5: Cron ジョブの設定

Vercel で Cron ジョブを有効化:

1. Vercel Dashboard > Settings > Cron Jobs
2. `vercel.json` の設定が反映されていることを確認:
   - `/api/cron/tournament-notifications` - 毎時実行
   - `/api/cron/cleanup-images` - 毎日実行

## トラブルシューティング

### ワークフローが実行されない

**確認事項:**
1. `.github/workflows/` ディレクトリが正しくコミットされているか
2. YAML ファイルの構文エラーがないか
3. ブランチ名がトリガー条件に合致しているか

**解決方法:**
```bash
# ワークフローファイルの確認
ls -la .github/workflows/

# YAML の構文チェック
yamllint .github/workflows/*.yml
```

### Secrets が見つからない

**エラーメッセージ:**
```
Error: Input required and not supplied: VERCEL_TOKEN
```

**解決方法:**
1. GitHub Settings > Secrets and variables > Actions で Secrets を確認
2. Secret 名が正確に一致しているか確認（大文字小文字を区別）
3. Secret を再作成

### Vercel デプロイが失敗する

**エラーメッセージ:**
```
Error: No Project Settings found for project
```

**解決方法:**
1. `VERCEL_ORG_ID` と `VERCEL_PROJECT_ID` が正しいか確認
2. Vercel プロジェクトが存在するか確認
3. Vercel Token の権限を確認

### テストが失敗する

**エラーメッセージ:**
```
Error: Cannot connect to Supabase
```

**解決方法:**
1. `SUPABASE_URL` と `SUPABASE_ANON_KEY` が正しいか確認
2. Supabase プロジェクトが起動しているか確認
3. ローカルでテストを実行して確認

## 次のステップ

セットアップが完了したら:

1. ✅ 開発ワークフローを確立
2. ✅ コードレビュープロセスを定義
3. ✅ デプロイ手順を文書化
4. ✅ モニタリングとアラートを設定

## 参考資料

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)

## サポート

問題が発生した場合は、以下を確認してください:

1. GitHub Actions のログ
2. Vercel のデプロイログ
3. このガイドのトラブルシューティングセクション
