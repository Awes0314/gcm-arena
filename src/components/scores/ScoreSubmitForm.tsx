'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { ImageUpload } from './ImageUpload'
import type { Song, SubmissionMethod } from '@/lib/types/database'

interface ScoreSubmitFormProps {
  tournamentId: string
  tournamentSongs: Song[]
  submissionMethod: SubmissionMethod
  existingScores: Map<string, { song_id: string; score: number; submitted_at: string; status: string }>
}

export function ScoreSubmitForm({ tournamentId, tournamentSongs, submissionMethod, existingScores }: ScoreSubmitFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  
  // Form state
  const [selectedSongId, setSelectedSongId] = useState<string>('')
  const [score, setScore] = useState<string>('')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [submitMode, setSubmitMode] = useState<'manual' | 'image'>('manual')

  // Determine available submission modes based on tournament settings
  useEffect(() => {
    if (submissionMethod === 'bookmarklet') {
      setSubmitMode('manual')
    } else if (submissionMethod === 'image') {
      setSubmitMode('image')
    }
    // For 'both', default to 'manual' but allow switching
  }, [submissionMethod])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!selectedSongId) {
      toast({
        title: 'エラー',
        description: '楽曲を選択してください',
        variant: 'destructive',
      })
      return
    }

    // Validate based on submission mode
    if (submitMode === 'manual') {
      const scoreValue = parseInt(score, 10)
      if (isNaN(scoreValue) || scoreValue < 0) {
        toast({
          title: 'エラー',
          description: '有効なスコアを入力してください',
          variant: 'destructive',
        })
        return
      }

      // Score range validation (typical max score for rhythm games)
      if (scoreValue > 1010000) {
        toast({
          title: 'エラー',
          description: 'スコアが範囲外です（最大: 1,010,000）',
          variant: 'destructive',
        })
        return
      }
    } else if (submitMode === 'image') {
      if (!selectedImage) {
        toast({
          title: 'エラー',
          description: '画像を選択してください',
          variant: 'destructive',
        })
        return
      }
    }

    setIsLoading(true)

    try {
      if (submitMode === 'image') {
        // Handle image submission
        await handleImageSubmission()
      } else {
        // Handle manual submission
        await handleManualSubmission()
      }
    } catch (error) {
      console.error('Error submitting score:', error)
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'スコアの提出に失敗しました',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualSubmission = async () => {
    const scoreValue = parseInt(score, 10)

    const response = await fetch('/api/scores', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tournament_id: tournamentId,
        song_id: selectedSongId,
        score: scoreValue,
        submitted_via: 'manual',
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'スコアの提出に失敗しました')
    }

    toast({
      title: '成功',
      description: 'スコアを提出しました',
    })

    // Reset form
    setSelectedSongId('')
    setScore('')
    
    router.refresh()
  }

  const handleImageSubmission = async () => {
    if (!selectedImage) return

    const formData = new FormData()
    formData.append('tournament_id', tournamentId)
    formData.append('song_id', selectedSongId)
    formData.append('image', selectedImage)

    const response = await fetch('/api/scores/image', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || '画像の提出に失敗しました')
    }

    toast({
      title: '成功',
      description: '画像を提出しました。開催者の承認をお待ちください。',
    })

    // Reset form
    setSelectedSongId('')
    setSelectedImage(null)
    
    router.refresh()
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>スコア提出</CardTitle>
            <CardDescription>
              {submissionMethod === 'both' 
                ? '手動入力または画像提出を選択してください'
                : submissionMethod === 'image'
              ? 'リザルト画像を提出してください'
              : '楽曲とスコアを入力してください'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Submission mode selector (only for 'both') */}
          {submissionMethod === 'both' && (
            <div className="space-y-2">
              <Label>提出方法</Label>
              <div className="flex space-x-4">
                <Button
                  type="button"
                  variant={submitMode === 'manual' ? 'default' : 'outline'}
                  onClick={() => setSubmitMode('manual')}
                  disabled={isLoading}
                >
                  手動入力
                </Button>
                <Button
                  type="button"
                  variant={submitMode === 'image' ? 'default' : 'outline'}
                  onClick={() => setSubmitMode('image')}
                  disabled={isLoading}
                >
                  画像提出
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="song">楽曲 *</Label>
            <Select value={selectedSongId} onValueChange={setSelectedSongId}>
              <SelectTrigger id="song">
                <SelectValue placeholder="楽曲を選択してください" />
              </SelectTrigger>
              <SelectContent>
                {tournamentSongs.map((song) => (
                  <SelectItem key={song.id} value={song.id}>
                    {song.title} ({song.difficulty} Lv.{song.level})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedSongId && existingScores.has(selectedSongId) && (
              <div className="mt-2 p-3 bg-muted rounded-md">
                <p className="text-sm font-medium">現在のスコア</p>
                <p className="text-2xl font-bold text-primary">
                  {existingScores.get(selectedSongId)!.score.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  提出日時: {new Date(existingScores.get(selectedSongId)!.submitted_at).toLocaleString('ja-JP')}
                </p>
              </div>
            )}
          </div>

          {submitMode === 'manual' ? (
            <div className="space-y-2">
              <Label htmlFor="score">スコア *</Label>
              <Input
                id="score"
                type="number"
                min="0"
                max="1010000"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="例: 1005000"
                required
              />
              <p className="text-xs text-muted-foreground">
                0 〜 1,010,000 の範囲で入力してください
              </p>
            </div>
          ) : (
            <ImageUpload
              onImageSelect={setSelectedImage}
              onImageRemove={() => setSelectedImage(null)}
              selectedImage={selectedImage}
              disabled={isLoading}
            />
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          キャンセル
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? '提出中...' : submitMode === 'image' ? '画像を提出' : 'スコアを提出'}
        </Button>
      </div>
    </form>

    <ScoresList 
      tournamentSongs={tournamentSongs}
      existingScores={existingScores}
    />
  </>
  )
}

function ScoresList({ 
  tournamentSongs, 
  existingScores 
}: { 
  tournamentSongs: Song[]
  existingScores: Map<string, { song_id: string; score: number; submitted_at: string; status: string }>
}) {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>提出済みスコア一覧</CardTitle>
        <CardDescription>
          各楽曲に対する現在のスコア
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tournamentSongs.map((song) => {
            const existingScore = existingScores.get(song.id)
            return (
              <div
                key={song.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{song.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {song.difficulty} Lv.{song.level}
                  </p>
                </div>
                <div className="text-right ml-4">
                  {existingScore ? (
                    <>
                      <p className="text-lg font-bold font-mono">
                        {existingScore.score.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(existingScore.submitted_at).toLocaleDateString('ja-JP')}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">未提出</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
