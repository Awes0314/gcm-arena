# GCM Arena ブックマークレット

## 概要

GCM Arena ブックマークレットは、公式ゲームサイト（ONGEKI、CHUNITHM、maimai）からスコア情報を自動的に抽出し、GCM Arena プラットフォームに送信するためのツールです。

## ファイル構成

- `gcm-arena-bookmarklet.js` - ブックマークレット本体のスクリプト
- `install.html` - ユーザー向けインストールガイドページ
- `README.md` - このファイル（開発者向けドキュメント）

## 機能

### 対応ゲーム

1. **オンゲキ (ONGEKI)**
   - スコア抽出
   - 楽曲タイトル抽出
   - 難易度抽出

2. **CHUNITHM**
   - スコア抽出
   - 楽曲タイトル抽出
   - 難易度抽出

3. **maimai**
   - スコア抽出（パーセンテージから変換）
   - 楽曲タイトル抽出
   - 難易度抽出

### セキュリティ機能

- **認証**: 既存のログインセッション（Cookie）を使用
- **CORS対応**: API側でCORS設定を実装
- **停止機能**: 環境変数 `BOOKMARKLET_ENABLED` で即座に無効化可能

## API エンドポイント

### POST /api/bookmarklet/submit

スコアデータを受信して保存します。

**リクエスト:**
```json
{
  "tournament_id": "uuid",
  "song_id": "uuid",
  "score": 1005432,
  "game_type": "ongeki",
  "song_title": "楽曲名",
  "difficulty": "MASTER"
}
```

**レスポンス（成功）:**
```json
{
  "success": true,
  "message": "スコアを提出しました",
  "score": {
    "id": "uuid",
    "score": 1005432,
    ...
  }
}
```

**レスポンス（エラー）:**
```json
{
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "認証が必要です"
  }
}
```

## 開発者向け情報

### DOM セレクタ

各ゲームサイトのDOM構造に依存しています。公式サイトの更新により動作しなくなる可能性があります。

**ONGEKI:**
- スコア: `.score-value`
- タイトル: `.music-title`
- 難易度: `.difficulty`

**CHUNITHM:**
- スコア: `.play_musicdata_score_text`
- タイトル: `.play_musicdata_title`
- 難易度: `.play_track_result img[alt]`

**maimai:**
- スコア: `.playlog_achievement_txt`
- タイトル: `.playlog_music_title`
- 難易度: `.playlog_diff`

### 環境変数

```bash
# ブックマークレット機能を無効化
BOOKMARKLET_ENABLED=false
```

### テスト

ユニットテストは `src/lib/bookmarklet/__tests__/bookmarklet.test.ts` にあります。

```bash
npm test -- src/lib/bookmarklet/__tests__/bookmarklet.test.ts --run
```

## デプロイ手順

1. **スクリプトの配置**
   - `public/bookmarklet/` ディレクトリにファイルを配置
   - Next.js が自動的に静的ファイルとして配信

2. **ドメインの設定**
   - `gcm-arena-bookmarklet.js` 内の `API_BASE_URL` を本番ドメインに変更
   - `install.html` 内のスクリプトURLを本番ドメインに変更

3. **インストールページの公開**
   - `/bookmarklet/install.html` にアクセス可能にする
   - ユーザーにこのページを案内

## トラブルシューティング

### 「スコア情報が見つかりません」エラー

**原因:** 公式サイトのDOM構造が変更された

**対応:**
1. ブラウザの開発者ツールで現在のDOM構造を確認
2. `gcm-arena-bookmarklet.js` のセレクタを更新
3. テストを実行して動作確認
4. 再デプロイ

### 「認証が必要です」エラー

**原因:** ユーザーがログインしていない、またはセッションが期限切れ

**対応:**
- ユーザーに GCM Arena へのログインを促す
- セッション管理の確認

### 「この楽曲は大会の対象ではありません」エラー

**原因:** 楽曲タイトルまたは難易度の照合に失敗

**対応:**
1. 楽曲データベースに該当楽曲が存在するか確認
2. タイトルの表記揺れを確認（全角/半角、スペースなど）
3. 難易度の表記を確認

## 緊急停止手順

公式サイトの構造変更や問題発生時に即座に停止できます：

1. **環境変数で停止:**
   ```bash
   BOOKMARKLET_ENABLED=false
   ```

2. **再デプロイ:**
   - Vercel などのプラットフォームで環境変数を更新
   - 自動的に再デプロイされる

3. **ユーザーへの通知:**
   - ブックマークレット実行時に「機能は現在停止中です」と表示される

## セキュリティ考慮事項

1. **XSS対策**: ユーザー入力は適切にサニタイズ
2. **CSRF対策**: Next.js の組み込み保護を使用
3. **認証**: 既存のセッションCookieを使用（HTTPOnly）
4. **レート制限**: API側で実装を推奨

## ライセンスと免責事項

- このツールは非公式です
- SEGA とは一切関係ありません
- 使用は自己責任でお願いします
- 公式サイトの利用規約を遵守してください

## 更新履歴

- 2024-01: 初版リリース
  - ONGEKI、CHUNITHM、maimai 対応
  - 基本的なスコア抽出機能
  - エラーハンドリング
  - 停止機能
