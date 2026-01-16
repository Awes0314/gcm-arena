"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import Link from "next/link"

export default function TournamentDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Tournament detail error:", error)
  }, [error])

  return (
    <div className="container-wide section-spacing">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-6 w-6" />
            <CardTitle>エラーが発生しました</CardTitle>
          </div>
          <CardDescription>
            大会詳細の読み込み中に問題が発生しました
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {error.message || "予期しないエラーが発生しました。大会が存在しないか、アクセス権限がない可能性があります。"}
          </p>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button onClick={reset}>再試行</Button>
          <Button variant="outline" asChild>
            <Link href="/tournaments">大会一覧に戻る</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
