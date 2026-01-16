# デザインシステム

## 概要

GCM Arenaは、shadcn/uiをベースとした一貫性のあるデザインシステムを採用しています。

## コンポーネントライブラリ

### shadcn/ui

- **Button**: アクション用のボタンコンポーネント
- **Card**: コンテンツをグループ化するカードコンポーネント
- **Input**: フォーム入力用のコンポーネント
- **Label**: フォームラベル
- **Select**: ドロップダウン選択
- **Badge**: ステータスやタグ表示
- **DropdownMenu**: メニュー表示
- **Avatar**: ユーザーアバター
- **Separator**: セクション区切り
- **Toast**: 通知表示

## レスポンシブデザイン

### ブレークポイント

Tailwind CSSのデフォルトブレークポイントを使用：

- **sm**: 640px（スマートフォン横向き）
- **md**: 768px（タブレット縦向き）
- **lg**: 1024px（タブレット横向き、小型ノートPC）
- **xl**: 1280px（デスクトップ）
- **2xl**: 1536px（大型デスクトップ）

### デバイス対応

#### スマートフォン（〜767px）
- シングルカラムレイアウト
- ハンバーガーメニュー
- タッチ操作に最適化されたボタンサイズ
- フルスクリーン幅のコンテンツ

#### タブレット（768px〜1023px）
- 2カラムレイアウト（一部）
- ナビゲーションバーの表示
- 適度な余白とパディング

#### PC（1024px〜）
- マルチカラムレイアウト
- フルナビゲーション表示
- 最大幅制限（container）
- ホバーエフェクト

## レイアウトコンポーネント

### Header
- レスポンシブナビゲーション
- モバイル: ハンバーガーメニュー
- デスクトップ: 横並びナビゲーション

### Footer
- グリッドレイアウト
- モバイル: 1カラム
- タブレット: 2カラム
- デスクトップ: 4カラム

### Container
- 最大幅制限
- レスポンシブパディング
- 中央揃え

## カラーシステム

### ライトモード
- Background: White
- Foreground: Dark Gray
- Primary: Black
- Secondary: Light Gray
- Muted: Very Light Gray

### ダークモード
- Background: Very Dark Gray
- Foreground: White
- Primary: White
- Secondary: Dark Gray
- Muted: Medium Gray

## タイポグラフィ

### 見出し
- h1: text-3xl sm:text-4xl md:text-5xl lg:text-6xl
- h2: text-2xl sm:text-3xl md:text-4xl
- h3: text-xl sm:text-2xl

### 本文
- 通常: text-base
- 小: text-sm
- 極小: text-xs

## スペーシング

### パディング
- モバイル: px-4 py-8
- タブレット: px-6 py-12
- デスクトップ: px-8 py-16

### マージン
- 小: gap-2 space-y-2
- 中: gap-4 space-y-4
- 大: gap-6 space-y-6
- 特大: gap-8 space-y-8

## 使用例

### レスポンシブグリッド

```tsx
<div className="grid gap-6 lg:grid-cols-3 lg:gap-12">
  {/* コンテンツ */}
</div>
```

### レスポンシブテキスト

```tsx
<h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
  タイトル
</h1>
```

### レスポンシブボタングループ

```tsx
<div className="flex flex-col gap-2 min-[400px]:flex-row">
  <Button>ボタン1</Button>
  <Button>ボタン2</Button>
</div>
```

## アクセシビリティ

- セマンティックHTML
- キーボードナビゲーション対応
- スクリーンリーダー対応（sr-only）
- 適切なコントラスト比
- フォーカス表示

## パフォーマンス

- CSS-in-JSではなくTailwind CSS使用
- 最小限のJavaScript
- 静的生成（SSG）の活用
- 画像最適化（Next.js Image）
