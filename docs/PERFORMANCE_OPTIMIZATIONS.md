# パフォーマンス最適化ガイド

このドキュメントでは、GCM Arenaプラットフォームに実装されたパフォーマンス最適化について説明します。

## 1. 画像最適化

### Next.js Image コンポーネント

すべての画像表示に Next.js の `Image` コンポーネントを使用しています。

**利点:**
- 自動的な画像最適化（WebP/AVIF形式への変換）
- レスポンシブ画像の自動生成
- 遅延読み込み（lazy loading）のサポート
- CLS（Cumulative Layout Shift）の防止

**実装箇所:**
- `src/components/scores/ImageUpload.tsx` - プレビュー画像
- `src/components/tournaments/PendingSubmissionsList.tsx` - 提出画像

**設定:**
```typescript
// next.config.ts
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: '**.supabase.co',
      pathname: '/storage/v1/object/public/**',
    },
  ],
  formats: ['image/avif', 'image/webp'],
}
```

### 遅延読み込み

画像は viewport に入るまで読み込まれません。

```tsx
<Image
  src={imageUrl}
  alt="説明"
  width={800}
  height={600}
  loading="lazy" // 遅延読み込み
/>
```

## 2. データフェッチング最適化

### キャッシング戦略

#### ページレベルのキャッシング

```typescript
// 大会一覧ページ
export const revalidate = 60 // 60秒ごとに再検証

// 大会詳細ページ
export const revalidate = 30 // 30秒ごとに再検証
```

#### API レスポンスのキャッシング

```typescript
// Cache-Control ヘッダーの設定
response.headers.set(
  'Cache-Control',
  'public, s-maxage=60, stale-while-revalidate=120'
)
```

**キャッシュ戦略の説明:**
- `public`: CDN でキャッシュ可能
- `s-maxage=60`: CDN で60秒間キャッシュ
- `stale-while-revalidate=120`: 古いキャッシュを返しつつバックグラウンドで更新

### ページネーション

大会一覧ページにページネーションを実装し、一度に読み込むデータ量を制限しています。

**設定:**
- ページサイズ: 12件
- URL パラメータ: `?page=1`

**実装:**
```typescript
const PAGE_SIZE = 12
const { from, to } = getPaginationRange(currentPage, PAGE_SIZE)

const { data } = await supabase
  .from('tournaments_with_status')
  .select('*')
  .range(from, to)
```

**ユーティリティ:**
- `src/lib/utils/pagination.ts` - ページネーション計算
- `src/components/ui/pagination.tsx` - ページネーションUI

## 3. バンドルサイズ最適化

### 動的インポート

重いコンポーネントは動的にインポートし、必要な時だけ読み込みます。

**実装例:**

```typescript
// 大会作成フォーム
const TournamentForm = dynamic(
  () => import('@/components/tournaments/TournamentForm')
    .then(mod => ({ default: mod.TournamentForm })),
  {
    loading: () => <Skeleton />,
    ssr: false,
  }
)
```

**動的インポートされているコンポーネント:**
- `TournamentForm` - 大会作成フォーム
- `ScoreSubmitForm` - スコア提出フォーム
- `NotificationDropdown` - 通知ドロップダウン

### パッケージ最適化

Next.js の実験的機能を使用して、大きなパッケージを最適化しています。

```typescript
// next.config.ts
experimental: {
  optimizePackageImports: [
    'lucide-react',
    '@radix-ui/react-dropdown-menu',
    '@radix-ui/react-dialog',
    '@radix-ui/react-select',
    '@radix-ui/react-tabs',
    '@radix-ui/react-toast',
  ],
}
```

### Tree Shaking

未使用のコードは自動的に削除されます。Next.js のビルドプロセスが自動的に処理します。

### 本番環境の最適化

```typescript
// next.config.ts
compiler: {
  removeConsole: process.env.NODE_ENV === 'production' ? {
    exclude: ['error', 'warn'],
  } : false,
}
```

本番環境では `console.log` を自動的に削除します（`error` と `warn` は保持）。

## パフォーマンス測定

### Lighthouse スコア目標

- **Performance**: 90+
- **Accessibility**: 95+
- **Best Practices**: 95+
- **SEO**: 90+

### 測定方法

```bash
# 本番ビルド
npm run build

# ビルドサイズの確認
npm run build -- --profile

# Lighthouse の実行
npx lighthouse https://your-domain.com --view
```

## ベストプラクティス

### 画像

1. 適切なサイズの画像を使用する
2. `priority` プロップは above-the-fold の画像にのみ使用
3. `loading="lazy"` をデフォルトで使用

### データフェッチング

1. 必要なデータのみを取得する（`select` で列を指定）
2. ページネーションを使用する
3. 適切なキャッシュ戦略を設定する

### コンポーネント

1. 重いコンポーネントは動的インポート
2. クライアントコンポーネントは必要最小限に
3. Server Components を優先的に使用

### バンドル

1. 大きなライブラリは動的インポート
2. 未使用のコードを削除
3. コード分割を活用

## 今後の改善案

### 短期

- [ ] React Query の導入（クライアント側のキャッシング）
- [ ] Service Worker の実装（オフライン対応）
- [ ] 画像の事前読み込み（prefetch）

### 長期

- [ ] CDN の活用
- [ ] エッジキャッシング
- [ ] データベースクエリの最適化
- [ ] インデックスの追加

## 参考資料

- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)
- [Next.js Caching](https://nextjs.org/docs/app/building-your-application/caching)
- [Dynamic Imports](https://nextjs.org/docs/app/building-your-application/optimizing/lazy-loading)
- [Web Vitals](https://web.dev/vitals/)
