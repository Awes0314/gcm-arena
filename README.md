# GCM Arena プラットフォーム

音楽ゲーム（オンゲキ、CHUNITHM、maimai）を対象とした非公式のカスタム大会プラットフォーム。

## 技術スタック

- **フロントエンド**: Next.js 15 (App Router), React 19, TypeScript
- **UIコンポーネント**: shadcn/ui
- **スタイリング**: Tailwind CSS
- **バックエンド**: Supabase (PostgreSQL, Auth, Storage)
- **テスト**: Vitest, fast-check (Property-Based Testing)
- **デプロイ**: Vercel

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local` ファイルを作成し、Supabase の接続情報を設定してください：

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SCHEMA=dev
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## スクリプト

- `npm run dev` - 開発サーバーを起動
- `npm run build` - 本番用ビルド
- `npm run start` - 本番サーバーを起動
- `npm run lint` - ESLint でコードをチェック
- `npm test` - テストを実行（watch モード）
- `npm run test:unit` - ユニットテストを実行
- `npm run test:property` - プロパティベーステストを実行
- `npm run test:coverage` - カバレッジレポートを生成

## プロジェクト構造

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # ルートレイアウト
│   ├── page.tsx           # トップページ
│   └── globals.css        # グローバルスタイル
├── components/
│   ├── ui/                # shadcn/ui コンポーネント
│   └── layout/            # レイアウトコンポーネント
├── lib/
│   ├── supabase/         # Supabase クライアント
│   ├── types/            # 型定義
│   └── utils/            # ユーティリティ関数
└── hooks/                # カスタムフック
```

## デザインシステム

本プロジェクトは、shadcn/uiをベースとした一貫性のあるデザインシステムを採用しています。

### レスポンシブ対応

- **スマートフォン**: 〜767px
- **タブレット**: 768px〜1023px
- **PC**: 1024px〜

詳細は [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) を参照してください。

## デプロイ

### 本番環境へのデプロイ

詳細なデプロイ手順は [DEPLOYMENT.md](DEPLOYMENT.md) を参照してください。

#### クイックスタート

1. **環境変数の設定**
   - Vercel ダッシュボードで環境変数を設定
   - 本番環境では `SUPABASE_SCHEMA=public` を使用

2. **データベースのマイグレーション**
   - `supabase/migrations/00014_*.sql` から `00017_*.sql` を実行
   - 詳細は [supabase/MIGRATION_GUIDE.md](supabase/MIGRATION_GUIDE.md) を参照

3. **CI/CD の設定**
   - GitHub Actions のセットアップ
   - 詳細は [.github/SETUP_GUIDE.md](.github/SETUP_GUIDE.md) を参照

### 継続的デプロイ

- **main ブランチ**: 本番環境に自動デプロイ
- **feature ブランチ**: プレビュー環境に自動デプロイ

GitHub Actions により、すべてのプッシュで自動的にテストとデプロイが実行されます。

## ドキュメント

- [デプロイガイド](DEPLOYMENT.md) - 本番環境へのデプロイ手順
- [マイグレーションガイド](supabase/MIGRATION_GUIDE.md) - データベースマイグレーション
- [CI/CD セットアップ](.github/SETUP_GUIDE.md) - GitHub Actions の設定
- [デザインシステム](docs/DESIGN_SYSTEM.md) - UI/UX ガイドライン
- [セキュリティ](docs/SECURITY.md) - セキュリティ対策
- [パフォーマンス最適化](docs/PERFORMANCE_OPTIMIZATIONS.md) - パフォーマンス改善

## 注意事項

本サービスは SEGA とは一切関係のない非公式サービスです。

## ライセンス

Private
# test