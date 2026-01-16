'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { Check, X, CheckCheck } from 'lucide-react'

interface PendingSubmission {
  id: string
  tournament_id: string
  user_id: string
  song_id: string
  score: number
  status: string
  image_url: string | null
  submitted_via: string
  submitted_at: string
  profiles: {
    id: string
    display_name: string | null
  } | null
  songs: {
    id: string
    title: string
    difficulty: string
    level: number
  } | null
}

interface PendingSubmissionsListProps {
  submissions: PendingSubmission[]
  tournamentId: string
}

export function PendingSubmissionsList({ submissions, tournamentId }: PendingSubmissionsListProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({})
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<string>>(new Set())
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)

  const handleApprove = async (submissionId: string) => {
    const scoreValue = parseInt(scoreInputs[submissionId] || '0', 10)

    if (isNaN(scoreValue) || scoreValue < 0) {
      toast({
        title: 'エラー',
        description: '有効なスコアを入力してください',
        variant: 'destructive',
      })
      return
    }

    if (scoreValue > 1010000) {
      toast({
        title: 'エラー',
        description: 'スコアが範囲外です（最大: 1,010,000）',
        variant: 'destructive',
      })
      return
    }

    setProcessingId(submissionId)

    try {
      const response = await fetch(`/api/scores/${submissionId}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          score: scoreValue,
          status: 'approved',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'スコアの承認に失敗しました')
      }

      toast({
        title: '成功',
        description: 'スコアを承認しました',
      })

      router.refresh()
    } catch (error) {
      console.error('Error approving score:', error)
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'スコアの承認に失敗しました',
        variant: 'destructive',
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (submissionId: string) => {
    if (!confirm('この提出を却下しますか？')) {
      return
    }

    setProcessingId(submissionId)

    try {
      const response = await fetch(`/api/scores/${submissionId}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'rejected',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'スコアの却下に失敗しました')
      }

      toast({
        title: '成功',
        description: 'スコアを却下しました',
      })

      router.refresh()
    } catch (error) {
      console.error('Error rejecting score:', error)
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'スコアの却下に失敗しました',
        variant: 'destructive',
      })
    } finally {
      setProcessingId(null)
    }
  }

  const toggleSelection = (submissionId: string) => {
    const newSelection = new Set(selectedSubmissions)
    if (newSelection.has(submissionId)) {
      newSelection.delete(submissionId)
    } else {
      newSelection.add(submissionId)
    }
    setSelectedSubmissions(newSelection)
  }

  const toggleSelectAll = () => {
    if (selectedSubmissions.size === submissions.length) {
      setSelectedSubmissions(new Set())
    } else {
      setSelectedSubmissions(new Set(submissions.map(s => s.id)))
    }
  }

  const handleBulkApprove = async () => {
    if (selectedSubmissions.size === 0) {
      toast({
        title: 'エラー',
        description: '承認する提出を選択してください',
        variant: 'destructive',
      })
      return
    }

    // Check if all selected submissions have scores
    const missingScores = Array.from(selectedSubmissions).filter(
      id => !scoreInputs[id] || parseInt(scoreInputs[id]) < 0
    )

    if (missingScores.length > 0) {
      toast({
        title: 'エラー',
        description: '選択した全ての提出にスコアを入力してください',
        variant: 'destructive',
      })
      return
    }

    if (!confirm(`${selectedSubmissions.size}件の提出を一括承認しますか？`)) {
      return
    }

    setIsBulkProcessing(true)

    try {
      let successCount = 0
      let errorCount = 0

      for (const submissionId of selectedSubmissions) {
        const scoreValue = parseInt(scoreInputs[submissionId], 10)

        try {
          const response = await fetch(`/api/scores/${submissionId}/approve`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              score: scoreValue,
              status: 'approved',
            }),
          })

          if (response.ok) {
            successCount++
          } else {
            errorCount++
          }
        } catch (error) {
          errorCount++
        }
      }

      toast({
        title: '一括承認完了',
        description: `成功: ${successCount}件、失敗: ${errorCount}件`,
      })

      setSelectedSubmissions(new Set())
      router.refresh()
    } catch (error) {
      console.error('Error in bulk approve:', error)
      toast({
        title: 'エラー',
        description: '一括承認に失敗しました',
        variant: 'destructive',
      })
    } finally {
      setIsBulkProcessing(false)
    }
  }

  if (submissions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          保留中の提出はありません
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Bulk actions */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Checkbox
                checked={selectedSubmissions.size === submissions.length}
                onCheckedChange={toggleSelectAll}
                disabled={isBulkProcessing}
              />
              <span className="text-sm text-muted-foreground">
                {selectedSubmissions.size > 0
                  ? `${selectedSubmissions.size}件選択中`
                  : '全て選択'}
              </span>
            </div>
            {selectedSubmissions.size > 0 && (
              <Button
                onClick={handleBulkApprove}
                disabled={isBulkProcessing}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                {isBulkProcessing ? '処理中...' : `${selectedSubmissions.size}件を一括承認`}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Individual submissions */}
      {submissions.map((submission) => (
        <Card key={submission.id}>
          <CardHeader>
            <CardTitle className="text-lg flex items-start space-x-3">
              <Checkbox
                checked={selectedSubmissions.has(submission.id)}
                onCheckedChange={() => toggleSelection(submission.id)}
                disabled={processingId === submission.id || isBulkProcessing}
                className="mt-1"
              />
              <div className="flex-1">
                <div>{submission.profiles?.display_name || '名無し'} - {submission.songs?.title}</div>
                <p className="text-sm font-normal text-muted-foreground mt-1">
                  {submission.songs?.difficulty} Lv.{submission.songs?.level} • 
                  提出日時: {new Date(submission.submitted_at).toLocaleString('ja-JP')}
                </p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Image preview */}
            {submission.image_url && (
              <div className="relative rounded-lg overflow-hidden bg-muted w-full" style={{ minHeight: '200px' }}>
                <Image
                  src={submission.image_url}
                  alt="スコア画像"
                  width={800}
                  height={600}
                  className="w-full h-auto max-h-96 object-contain"
                  style={{ width: '100%', height: 'auto' }}
                  loading="lazy"
                />
              </div>
            )}

            {/* Score input and actions */}
            <div className="flex items-end space-x-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor={`score-${submission.id}`}>スコア</Label>
                <Input
                  id={`score-${submission.id}`}
                  type="number"
                  min="0"
                  max="1010000"
                  value={scoreInputs[submission.id] || ''}
                  onChange={(e) =>
                    setScoreInputs((prev) => ({
                      ...prev,
                      [submission.id]: e.target.value,
                    }))
                  }
                  placeholder="例: 1005000"
                  disabled={processingId === submission.id || isBulkProcessing}
                />
              </div>
              <Button
                onClick={() => handleApprove(submission.id)}
                disabled={processingId === submission.id || isBulkProcessing}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4 mr-2" />
                承認
              </Button>
              <Button
                onClick={() => handleReject(submission.id)}
                disabled={processingId === submission.id || isBulkProcessing}
                variant="destructive"
              >
                <X className="h-4 w-4 mr-2" />
                却下
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
