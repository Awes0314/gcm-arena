# GitHub Actions Workflows

このディレクトリには、GCM Arena プラットフォームの CI/CD パイプラインを定義する GitHub Actions ワークフローが含まれています。

## ワークフロー一覧

### 1. Test Workflow (`test.yml`)

**トリガー条件:**
- すべてのブランチへの push
- main および develop ブランチへの pull request

**実行内容:**
1. コードのチェックアウト
2. Node.js 環境のセットアップ
3. 依存関係のインストール
4. ESLint によるコード品質チェック
5. ユニットテストの実行
6. プロパティベーステストの実行
7. カバレッジレポートの生成
8. アプリケーションのビルド

**環境変数:**
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase プロジェクト URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase Anon Key
- `SUPABASE_SCHEMA`: dev（テスト環境）
- `NEXT_PUBLIC_SUPABASE_SCHEMA`: dev（テスト環境）

### 2. Deploy Workflow (`deploy.yml`)

**トリガー条件:**
- main ブランチへの push（本番デプロイ）
- develop および feature ブランチへの push（プレビューデプロイ）

**実行内容:**
1. コードのチェックアウト
2. Node.js 環境のセットアップ
3. 依存関係のインストール
4. テストの実行（デプロイ前の検証）
5. Vercel CLI のインストール
6. Vercel 環境情報の取得
7. プロジェクトのビルド
8. Vercel へのデプロイ
9. デプロイ結果のサマリー表示
10. PR へのコメント（プレビューデプロイの場合）

**デプロイ環境:**
- **main ブランチ**: 本番環境（Production）
- **その他のブランチ**: プレビュー環境（Preview）

## 必要な Secrets

GitHub リポジトリの Settings > Secrets and variables > Actions で以下の Secrets を設定してください：

### Supabase 関連

| Secret 名 | 説明 | 取得方法 |
|-----------|------|----------|
| `SUPABASE_URL` | Supabase プロジェクト URL | Supabase Dashboard > Settings > API |
| `SUPABASE_ANON_KEY` | Supabase Anon Key | Supabase Dashboard > Settings > API |

### Vercel 関連

| Secret 名 | 説明 | 取得方法 |
|-----------|------|----------|
| `VERCEL_TOKEN` | Vercel API トークン | Vercel Dashboard > Settings > Tokens |
| `VERCEL_ORG_ID` | Vercel Organization ID | `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | Vercel Project ID | `.vercel/project.json` |

### オプション

| Secret 名 | 説明 | 用途 |
|-----------|------|------|
| `CODECOV_TOKEN` | Codecov トークン | カバレッジレポートのアップロード |

## Vercel Secrets の取得方法

### 1. Vercel Token の作成

1. https://vercel.com/account/tokens にアクセス
2. "Create Token" をクリック
3. トークン名を入力（例: "GitHub Actions"）
4. Scope を選択（Full Account 推奨）
5. "Create" をクリック
6. 表示されたトークンをコピー

### 2. Organization ID と Project ID の取得

```bash
# Vercel CLI をインストール
npm install -g vercel

# プロジェクトにリンク
vercel link

# .vercel/project.json が作成される
cat .vercel/project.json
```

`.vercel/project.json` の内容例:
```json
{
  "orgId": "team_xxxxxxxxxxxxx",
  "projectId": "prj_xxxxxxxxxxxxx"
}
```

## ワークフローの動作確認

### テストワークフローの確認

1. GitHub リポジトリの "Actions" タブを開く
2. "Test" ワークフローを選択
3. 最新の実行結果を確認

### デプロイワークフローの確認

1. GitHub リポジトリの "Actions" タブを開く
2. "Deploy to Vercel" ワークフローを選択
3. 最新の実行結果を確認
4. デプロイ URL を確認

## ブランチ戦略

### main ブランチ

- **用途**: 本番環境
- **保護**: 必須
- **デプロイ**: 自動（main へのマージ時）
- **環境変数**: `SUPABASE_SCHEMA=public`

### develop ブランチ

- **用途**: 開発環境
- **保護**: 推奨
- **デプロイ**: 自動（プレビュー環境）
- **環境変数**: `SUPABASE_SCHEMA=dev`

### feature ブランチ

- **用途**: 機能開発
- **命名規則**: `feature/機能名`
- **デプロイ**: 自動（プレビュー環境）
- **環境変数**: `SUPABASE_SCHEMA=dev`

## ブランチ保護ルール

main ブランチには以下の保護ルールを設定することを推奨します：

1. **Settings > Branches > Branch protection rules** に移動
2. "Add rule" をクリック
3. Branch name pattern: `main`
4. 以下を有効化:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
     - Required checks: `test`
   - ✅ Require branches to be up to date before merging
   - ✅ Do not allow bypassing the above settings

## トラブルシューティング

### テストが失敗する

**原因**: 環境変数が設定されていない、またはテストコードにエラーがある

**解決方法**:
1. GitHub Secrets が正しく設定されているか確認
2. ローカルで `npm run test:unit` を実行して確認
3. エラーログを確認して修正

### デプロイが失敗する

**原因**: Vercel の設定が正しくない、またはビルドエラー

**解決方法**:
1. Vercel Secrets が正しく設定されているか確認
2. ローカルで `npm run build` を実行して確認
3. Vercel Dashboard でログを確認

### プレビューデプロイが作成されない

**原因**: ワークフローのトリガー条件に合致していない

**解決方法**:
1. ブランチ名が正しいか確認
2. GitHub Actions のログを確認
3. ワークフローファイルのトリガー条件を確認

## カスタマイズ

### テストのタイムアウトを変更

`test.yml` の `timeout-minutes` を追加:

```yaml
jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    timeout-minutes: 30  # 30分でタイムアウト
```

### 特定のブランチのみデプロイ

`deploy.yml` のトリガー条件を変更:

```yaml
on:
  push:
    branches:
      - main
      - develop
      # feature ブランチを除外
```

### 通知の追加

Slack や Discord への通知を追加する場合:

```yaml
- name: Notify Slack
  if: always()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## ベストプラクティス

1. **Secrets の管理**
   - Secrets は絶対にコードにコミットしない
   - 定期的にトークンをローテーション
   - 最小権限の原則に従う

2. **テストの実行**
   - すべての PR でテストを実行
   - テストが失敗したらマージしない
   - カバレッジを維持

3. **デプロイの管理**
   - main ブランチへのマージは慎重に
   - プレビュー環境で動作確認
   - ロールバック手順を準備

4. **モニタリング**
   - GitHub Actions のログを定期的に確認
   - デプロイの成功率を監視
   - エラーが発生したら即座に対応

## 参考資料

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [Vercel GitHub Integration](https://vercel.com/docs/git/vercel-for-github)
