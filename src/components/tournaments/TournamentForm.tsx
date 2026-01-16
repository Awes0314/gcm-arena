'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import type { GameType, SubmissionMethod, Song } from '@/lib/types/database'

interface TournamentFormProps {
  initialData?: {
    title: string
    description: string
    game_type: GameType
    submission_method: SubmissionMethod
    start_at: string
    end_at: string
    is_public: boolean
    rules: Record<string, any>
    song_ids: string[]
  }
  mode?: 'create' | 'edit'
}

export function TournamentForm({ initialData, mode = 'create' }: TournamentFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [songs, setSongs] = useState<Song[]>([])
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([])
  
  // Form state
  const [title, setTitle] = useState(initialData?.title || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [gameType, setGameType] = useState<GameType>(initialData?.game_type || 'ongeki')
  const [submissionMethod, setSubmissionMethod] = useState<SubmissionMethod>(
    initialData?.submission_method || 'both'
  )
  const [startAt, setStartAt] = useState(
    initialData?.start_at ? new Date(initialData.start_at).toISOString().slice(0, 16) : ''
  )
  const [endAt, setEndAt] = useState(
    initialData?.end_at ? new Date(initialData.end_at).toISOString().slice(0, 16) : ''
  )
  const [isPublic, setIsPublic] = useState(initialData?.is_public ?? true)
  const [rulesText, setRulesText] = useState(
    initialData?.rules ? JSON.stringify(initialData.rules, null, 2) : ''
  )
  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(
    new Set(initialData?.song_ids || [])
  )

  // Fetch songs on mount and when game type changes
  useEffect(() => {
    const fetchSongs = async () => {
      try {
        const response = await fetch(`/api/songs?game_type=${gameType}`)
        if (!response.ok) throw new Error('Failed to fetch songs')
        const data = await response.json()
        const songList = data.songs || []
        setSongs(songList)
        setFilteredSongs(songList)
      } catch (error) {
        console.error('Error fetching songs:', error)
        toast({
          title: 'エラー',
          description: '楽曲の取得に失敗しました',
          variant: 'destructive',
        })
      }
    }

    fetchSongs()
  }, [gameType, toast])

  const handleSongToggle = (songId: string) => {
    const newSelected = new Set(selectedSongIds)
    if (newSelected.has(songId)) {
      newSelected.delete(songId)
    } else {
      newSelected.add(songId)
    }
    setSelectedSongIds(newSelected)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!title.trim()) {
      toast({
        title: 'エラー',
        description: '大会名を入力してください',
        variant: 'destructive',
      })
      return
    }

    if (!startAt || !endAt) {
      toast({
        title: 'エラー',
        description: '開始日時と終了日時を入力してください',
        variant: 'destructive',
      })
      return
    }

    if (new Date(startAt) >= new Date(endAt)) {
      toast({
        title: 'エラー',
        description: '終了日時は開始日時より後に設定してください',
        variant: 'destructive',
      })
      return
    }

    if (selectedSongIds.size === 0) {
      toast({
        title: 'エラー',
        description: '少なくとも1つの楽曲を選択してください',
        variant: 'destructive',
      })
      return
    }

    let rules: Record<string, any> = {}
    if (rulesText.trim()) {
      try {
        rules = JSON.parse(rulesText)
      } catch (error) {
        toast({
          title: 'エラー',
          description: 'ルールのJSON形式が正しくありません',
          variant: 'destructive',
        })
        return
      }
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          game_type: gameType,
          submission_method: submissionMethod,
          start_at: new Date(startAt).toISOString(),
          end_at: new Date(endAt).toISOString(),
          is_public: isPublic,
          rules,
          song_ids: Array.from(selectedSongIds),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || '大会の作成に失敗しました')
      }

      const tournament = await response.json()

      toast({
        title: '成功',
        description: '大会を作成しました',
      })

      router.push(`/tournaments/${tournament.id}`)
    } catch (error) {
      console.error('Error creating tournament:', error)
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : '大会の作成に失敗しました',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
          <CardDescription>大会の基本的な情報を入力してください</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">大会名 *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: 第1回 オンゲキ腕試し大会"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">説明</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="大会の説明を入力してください"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="game_type">ゲーム種別 *</Label>
              <Select value={gameType} onValueChange={(value) => setGameType(value as GameType)}>
                <SelectTrigger id="game_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ongeki">オンゲキ</SelectItem>
                  <SelectItem value="chunithm">CHUNITHM</SelectItem>
                  <SelectItem value="maimai">maimai</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="submission_method">提出方式 *</Label>
              <Select
                value={submissionMethod}
                onValueChange={(value) => setSubmissionMethod(value as SubmissionMethod)}
              >
                <SelectTrigger id="submission_method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bookmarklet">ブックマークレットのみ</SelectItem>
                  <SelectItem value="image">画像提出のみ</SelectItem>
                  <SelectItem value="both">両方</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_at">開始日時 *</Label>
              <Input
                id="start_at"
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_at">終了日時 *</Label>
              <Input
                id="end_at"
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_public"
              checked={isPublic}
              onCheckedChange={(checked) => setIsPublic(checked as boolean)}
            />
            <Label htmlFor="is_public" className="cursor-pointer">
              公開大会にする
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rules">ルール（JSON形式）</Label>
            <Textarea
              id="rules"
              value={rulesText}
              onChange={(e) => setRulesText(e.target.value)}
              placeholder='{"scoring": "total", "description": "全楽曲の合計スコアで競います"}'
              rows={4}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              JSON形式でルールを記述してください（オプション）
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>対象楽曲</CardTitle>
          <CardDescription>
            大会の対象楽曲を選択してください（{selectedSongIds.size}曲選択中）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredSongs.length === 0 ? (
              <p className="text-sm text-muted-foreground">楽曲が見つかりません</p>
            ) : (
              filteredSongs.map((song) => (
                <div key={song.id} className="flex items-center space-x-2 p-2 hover:bg-accent rounded">
                  <Checkbox
                    id={`song-${song.id}`}
                    checked={selectedSongIds.has(song.id)}
                    onCheckedChange={() => handleSongToggle(song.id)}
                  />
                  <Label htmlFor={`song-${song.id}`} className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{song.title}</span>
                      <span className="text-sm text-muted-foreground">
                        {song.difficulty} Lv.{song.level}
                      </span>
                    </div>
                    {song.artist && (
                      <div className="text-xs text-muted-foreground">{song.artist}</div>
                    )}
                  </Label>
                </div>
              ))
            )}
          </div>
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
          {isLoading ? '作成中...' : mode === 'create' ? '大会を作成' : '更新'}
        </Button>
      </div>
    </form>
  )
}
