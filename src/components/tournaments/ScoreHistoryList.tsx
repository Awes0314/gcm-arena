'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Pencil, Trash2, Save, X } from 'lucide-react'

interface Score {
  id: string
  tournament_id: string
  user_id: string
  song_id: string
  score: number
  status: string
  submitted_via: string
  submitted_at: string
  approved_at: string | null
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

interface ScoreHistoryListProps {
  scores: Score[]
  tournamentId: string
}

export function ScoreHistoryList({ scores, tournamentId }: ScoreHistoryListProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [processingId, setProcessingId] = useState<string | null>(null)

  const handleEdit = (score: Score) => {
    setEditingId(score.id)
    setEditValue(score.score.toString())
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditValue('')
  }

  const handleSaveEdit = async (scoreId: string) => {
    const newScore = parseInt(editValue, 10)

    if (isNaN(newScore) || newScore < 0 || newScore > 1010000) {
      toast({
        title: 'エラー',
        description: '有効なスコアを入力してください（0-1,010,000）',
        variant: 'destructive',
      })
      return
    }

    setProcessingId(scoreId)

    try {
      const response = await fetch(`/api/scores/${scoreId}/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          score: newScore,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'スコアの更新に失敗しました')
      }

      toast({
        title: '成功',
        description: 'スコアを更新しました',
      })

      setEditingId(null)
      setEditValue('')
      router.refresh()
    } catch (error) {
      console.error('Error updating score:', error)
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'スコアの更新に失敗しました',
        variant: 'destructive',
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleDelete = async (scoreId: string) => {
    if (!confirm('このスコアを削除しますか？この操作は取り消せません。')) {
      return
    }

    setProcessingId(scoreId)

    try {
      const response = await fetch(`/api/scores/${scoreId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'スコアの削除に失敗しました')
      }

      toast({
        title: '成功',
        description: 'スコアを削除しました',
      })

      router.refresh()
    } catch (error) {
      console.error('Error deleting score:', error)
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'スコアの削除に失敗しました',
        variant: 'destructive',
      })
    } finally {
      setProcessingId(null)
    }
  }

  if (scores.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          承認済みのスコアはまだありません
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {scores.map((score) => (
        <Card key={score.id}>
          <CardHeader>
            <CardTitle className="text-lg flex justify-between items-start">
              <div>
                <div>{score.profiles?.display_name || '名無し'} - {score.songs?.title}</div>
                <p className="text-sm font-normal text-muted-foreground mt-1">
                  {score.songs?.difficulty} Lv.{score.songs?.level} • 
                  提出: {new Date(score.submitted_at).toLocaleString('ja-JP')}
                  {score.approved_at && ` • 承認: ${new Date(score.approved_at).toLocaleString('ja-JP')}`}
                </p>
              </div>
              <span className="text-sm px-2 py-1 bg-muted rounded">
                {score.submitted_via === 'bookmarklet' ? 'ブックマークレット' : '画像'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editingId === score.id ? (
              <div className="flex items-end space-x-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor={`edit-score-${score.id}`}>スコア</Label>
                  <Input
                    id={`edit-score-${score.id}`}
                    type="number"
                    min="0"
                    max="1010000"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    disabled={processingId === score.id}
                  />
                </div>
                <Button
                  onClick={() => handleSaveEdit(score.id)}
                  disabled={processingId === score.id}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  保存
                </Button>
                <Button
                  onClick={handleCancelEdit}
                  disabled={processingId === score.id}
                  variant="outline"
                >
                  <X className="h-4 w-4 mr-2" />
                  キャンセル
                </Button>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <div className="text-3xl font-bold">
                  {score.score.toLocaleString()}
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleEdit(score)}
                    disabled={processingId === score.id}
                    variant="outline"
                    size="sm"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    編集
                  </Button>
                  <Button
                    onClick={() => handleDelete(score.id)}
                    disabled={processingId === score.id}
                    variant="destructive"
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    削除
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
