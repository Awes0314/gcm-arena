import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-b from-background to-muted">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                GCM Arena
              </h1>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                音楽ゲーム大会プラットフォーム
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                <Badge variant="secondary">オンゲキ</Badge>
                <Badge variant="secondary">CHUNITHM</Badge>
                <Badge variant="secondary">maimai</Badge>
              </div>
            </div>
            <div className="flex flex-col gap-2 min-[400px]:flex-row">
              <Button size="lg" asChild>
                <Link href="/tournaments">大会を探す</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/tournaments/create">大会を作成</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-3 lg:gap-12">
            <Card>
              <CardHeader>
                <CardTitle>自由なルール設定</CardTitle>
                <CardDescription>
                  対象楽曲、期間、提出方式を自由に設定して大会を開催できます
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  ブックマークレットによる自動提出や、画像アップロードによる手動提出に対応しています。
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>リアルタイムランキング</CardTitle>
                <CardDescription>
                  スコア提出後、即座にランキングが更新されます
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  参加者のスコアをリアルタイムで確認し、競い合うことができます。
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>簡単な参加</CardTitle>
                <CardDescription>
                  気になる大会にワンクリックで参加できます
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  参加制限はなく、複数の大会に同時に参加することができます。
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                今すぐ始めよう
              </h2>
              <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl">
                アカウントを作成して、大会に参加しましょう
              </p>
            </div>
            <div className="flex flex-col gap-2 min-[400px]:flex-row">
              <Button size="lg" asChild>
                <Link href="/register">新規登録</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">ログイン</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="w-full py-8 border-t">
        <div className="container px-4 md:px-6">
          <p className="text-center text-sm text-muted-foreground">
            ※ 本サービスはSEGAとは一切関係のない非公式サービスです
          </p>
        </div>
      </section>
    </div>
  );
}
