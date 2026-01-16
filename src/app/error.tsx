"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Global error:", error)
  }, [error])

  return (
    <html lang="ja">
      <body className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-6 w-6" />
              <CardTitle>予期しないエラーが発生しました</CardTitle>
            </div>
            <CardDescription>
              アプリケーションの実行中に問題が発生しました
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {error.message || "システムエラーが発生しました。しばらくしてから再度お試しください。"}
            </p>
            {error.digest && (
              <p className="text-xs text-muted-foreground font-mono">
                エラーID: {error.digest}
              </p>
            )}
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button onClick={reset}>再試行</Button>
            <Button variant="outline" onClick={() => window.location.href = "/"}>
              ホームに戻る
            </Button>
          </CardFooter>
        </Card>
      </body>
    </html>
  )
}
