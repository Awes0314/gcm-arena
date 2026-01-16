import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function TermsPage() {
  return (
    <div className="container max-w-4xl py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">利用規約</h1>
        <p className="text-muted-foreground">
          最終更新日: 2026年1月16日
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>重要なお知らせ</CardTitle>
          <CardDescription>
            本サービスをご利用になる前に、必ずお読みください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="font-semibold text-yellow-900 dark:text-yellow-100">
              本サービスは非公式サービスです
            </p>
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-2">
              GCM Arenaは、株式会社セガ（以下「SEGA」）とは一切関係のない非公式のファンメイドサービスです。
              SEGAによる公式サポートや承認を受けておらず、SEGAとの提携関係もありません。
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>第1条（適用）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            本利用規約（以下「本規約」）は、GCM Arena（以下「本サービス」）の利用条件を定めるものです。
            ユーザーの皆様（以下「ユーザー」）には、本規約に従って本サービスをご利用いただきます。
          </p>
          <p className="text-sm">
            本サービスを利用することにより、ユーザーは本規約に同意したものとみなされます。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>第2条（サービスの内容）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            本サービスは、音楽ゲーム（オンゲキ、CHUNITHM、maimai）のプレイヤー向けに、
            カスタム大会の作成・参加・スコア提出・ランキング閲覧などの機能を提供する非公式プラットフォームです。
          </p>
          <p className="text-sm font-semibold">
            本サービスで提供される機能：
          </p>
          <ul className="list-disc list-inside text-sm space-y-1 ml-4">
            <li>大会の作成と管理</li>
            <li>大会への参加と離脱</li>
            <li>スコアの提出（手動入力、画像アップロード、ブックマークレット）</li>
            <li>ランキングの閲覧</li>
            <li>プロフィール管理</li>
            <li>通知機能</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>第3条（アカウント登録）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            ユーザーは、本サービスの利用にあたり、正確かつ最新の情報を提供する必要があります。
          </p>
          <p className="text-sm">
            ユーザーは、自己の責任においてアカウント情報（メールアドレス、パスワード等）を管理するものとし、
            これらの情報の漏洩や不正使用による損害について、運営者は一切の責任を負いません。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>第4条（禁止事項）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            ユーザーは、本サービスの利用にあたり、以下の行為を行ってはなりません。
          </p>
          <ul className="list-disc list-inside text-sm space-y-1 ml-4">
            <li>法令または公序良俗に違反する行為</li>
            <li>犯罪行為に関連する行為</li>
            <li>他のユーザーまたは第三者の権利を侵害する行為</li>
            <li>虚偽の情報を登録する行為</li>
            <li>不正なスコアを提出する行為</li>
            <li>本サービスの運営を妨害する行為</li>
            <li>本サービスのシステムに不正にアクセスする行為</li>
            <li>他のユーザーのアカウントを不正に使用する行為</li>
            <li>その他、運営者が不適切と判断する行為</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>第5条（知的財産権）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            本サービスで使用される楽曲名、ゲーム名、その他のゲームに関連するコンテンツの著作権および商標権は、
            SEGAまたはその他の権利者に帰属します。
          </p>
          <p className="text-sm">
            本サービスは、これらの権利を侵害する意図はなく、ファンコミュニティの活性化を目的とした
            非営利の情報共有プラットフォームとして運営されています。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>第6条（免責事項）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg space-y-2">
            <p className="font-semibold text-red-900 dark:text-red-100">
              重要な免責事項
            </p>
            <ul className="list-disc list-inside text-sm text-red-800 dark:text-red-200 space-y-1 ml-4">
              <li>
                本サービスは「現状有姿」で提供されます。運営者は、本サービスの正確性、完全性、
                有用性、安全性、継続性について、いかなる保証も行いません。
              </li>
              <li>
                本サービスの利用により生じた損害について、運営者は一切の責任を負いません。
              </li>
              <li>
                楽曲データやスコア情報の正確性について、運営者は保証しません。
              </li>
              <li>
                本サービスは予告なく変更、中断、終了する場合があります。
              </li>
              <li>
                ブックマークレット機能は、公式サイトの仕様変更により予告なく停止する場合があります。
              </li>
              <li>
                本サービスの利用により、ユーザーの公式ゲームアカウントに何らかの影響が生じた場合でも、
                運営者は一切の責任を負いません。
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>第7条（データの取り扱い）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            本サービスは、ユーザーが提出したスコアデータ、プロフィール情報、画像などを保存します。
          </p>
          <p className="text-sm">
            大会終了後、関連する画像データは自動的に削除されます。
          </p>
          <p className="text-sm">
            ユーザーは、自己の責任において適切なデータを提出するものとし、
            不適切なデータの提出により生じた問題について、運営者は責任を負いません。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>第8条（サービスの変更・終了）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            運営者は、ユーザーへの事前通知なく、本サービスの内容を変更、追加、削除することができます。
          </p>
          <p className="text-sm">
            運営者は、以下の場合、本サービスの全部または一部を停止または終了することができます。
          </p>
          <ul className="list-disc list-inside text-sm space-y-1 ml-4">
            <li>システムの保守、点検、修理を行う場合</li>
            <li>地震、火災、停電などの不可抗力により本サービスの提供が困難な場合</li>
            <li>その他、運営者が必要と判断した場合</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>第9条（利用規約の変更）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            運営者は、必要に応じて本規約を変更することができます。
          </p>
          <p className="text-sm">
            規約の変更は、本サービス上での通知により効力を生じるものとします。
            変更後も本サービスを継続して利用する場合、ユーザーは変更後の規約に同意したものとみなされます。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>第10条（準拠法・管轄裁判所）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            本規約の解釈にあたっては、日本法を準拠法とします。
          </p>
          <p className="text-sm">
            本サービスに関して紛争が生じた場合には、運営者の所在地を管轄する裁判所を
            専属的合意管轄裁判所とします。
          </p>
        </CardContent>
      </Card>

      <Separator className="my-8" />

      <div className="text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          本規約についてご不明な点がございましたら、お問い合わせください。
        </p>
        <p className="text-xs text-muted-foreground">
          © 2026 GCM Arena. 本サービスはSEGAとは一切関係のない非公式サービスです。
        </p>
      </div>
    </div>
  );
}
