# RLS Policy Tests

このディレクトリには、Row Level Security (RLS) ポリシーのプロパティベーステストが含まれています。

## テストの実行前提条件

これらのテストは、実際の Supabase データベースに対して実行される統合テストです。以下の準備が必要です：

### 1. データベースのセットアップ

```bash
# Supabase SQL Editor で以下のマイグレーションを実行
# 1. supabase/migrations/00001_create_dev_schema.sql
# 2. supabase/migrations/00002_create_rls_policies.sql
```

### 2. テストユーザーの作成

RLS ポリシーのテストには、認証済みユーザーが必要です：

1. Supabase Dashboard → Authentication → Users
2. 「Add user」をクリック
3. テストユーザーを作成（例：test-user-a@example.com, test-user-b@example.com）
4. 各ユーザーの UUID をメモ

作成ユーザ
UID:5cd15d42-875f-47e5-ac6e-21ea984a9188
Email:test-user-a@example.com
Pass:testuser

UID:4684017f-8bbb-493d-b1f6-5c7f935d0565
Email:test-user-b@example.com
Pass:testuser

### 3. 環境変数の設定

`.env.local` ファイルが正しく設定されていることを確認：

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SCHEMA=dev
```

## テストの実行

```bash
# すべてのプロパティテストを実行
npm run test:property

# RLS ポリシーテストのみを実行
npm test -- rls-policies.property.test.ts
```

## テストの制限事項

### 認証が必要なテスト

以下のプロパティテストは、認証済みユーザーのアクセストークンが必要なため、
現在は手動テストの手順を出力するのみです：

- **Property 1**: プロフィール更新の所有権
- **Property 34**: 他人のデータ変更の防止

これらのテストを完全に自動化するには、以下のいずれかが必要です：

1. **Service Role Key**: テストユーザーを動的に作成・削除
2. **Test Fixtures**: 事前に作成されたテストユーザーの認証情報

### 手動テスト手順

#### Property 1: プロフィール更新の所有権

```typescript
// 1. ユーザー A としてログイン
const { data: { session } } = await supabase.auth.signInWithPassword({
  email: 'test-user-a@example.com',
  password: 'password'
})

// 2. 自分のプロフィールを更新（成功するはず）
const { error: updateOwnError } = await supabase
  .from('profiles')
  .update({ display_name: 'New Name' })
  .eq('id', session.user.id)

console.assert(updateOwnError === null, 'Should update own profile')

// 3. 他人のプロフィールを更新（失敗するはず）
const { error: updateOtherError } = await supabase
  .from('profiles')
  .update({ display_name: 'Hacked' })
  .eq('id', 'other-user-id')

console.assert(updateOtherError !== null, 'Should not update other profile')
```

#### Property 34: 他人のデータ変更の防止

```typescript
// 1. ユーザー B として大会を作成
const { data: tournament } = await supabaseB
  .from('tournaments')
  .insert({
    title: 'Test Tournament',
    game_type: 'ongeki',
    start_at: new Date().toISOString(),
    end_at: new Date(Date.now() + 86400000).toISOString(),
    organizer_id: userB.id
  })
  .select()
  .single()

// 2. ユーザー A として更新を試みる（失敗するはず）
const { error } = await supabaseA
  .from('tournaments')
  .update({ title: 'Hacked Tournament' })
  .eq('id', tournament.id)

console.assert(error !== null, 'Should not update other user tournament')
```

## 今後の改善

- [ ] Service Role Key を使用したテストユーザーの自動作成
- [ ] テストフィクスチャの整備
- [ ] E2E テストフレームワークとの統合
- [ ] CI/CD パイプラインでのテスト実行
