import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { FileQuestion } from "lucide-react"
import Link from "next/link"

export default function NotFound() {
  return (
    <div className="container-wide section-spacing flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileQuestion className="h-6 w-6" />
            <CardTitle>ページが見つかりません</CardTitle>
          </div>
          <CardDescription>
            お探しのページは存在しないか、移動した可能性があります
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            URLが正しいかご確認ください。削除された大会やプロフィールにアクセスしようとしている可能性があります。
          </p>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button asChild>
            <Link href="/">ホームに戻る</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/tournaments">大会一覧を見る</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
