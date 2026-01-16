'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

interface TournamentActionsProps {
  tournamentId: string
  isOrganizer: boolean
  isParticipant: boolean
  isAuthenticated: boolean
}

export function TournamentActions({
  tournamentId,
  isOrganizer,
  isParticipant,
  isAuthenticated,
}: TournamentActionsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const handleJoin = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/join`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        toast({
          title: 'エラー',
          description: data.error?.message || '参加に失敗しました',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: '参加しました',
        description: '大会に参加しました',
      })

      router.refresh()
    } catch (error) {
      console.error('Join error:', error)
      toast({
        title: 'エラー',
        description: 'システムエラーが発生しました',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleLeave = async () => {
    if (!confirm('本当に大会から離脱しますか？')) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/leave`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        toast({
          title: 'エラー',
          description: data.error?.message || '離脱に失敗しました',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: '離脱しました',
        description: '大会から離脱しました',
      })

      router.refresh()
    } catch (error) {
      console.error('Leave error:', error)
      toast({
        title: 'エラー',
        description: 'システムエラーが発生しました',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {isOrganizer ? (
        <Button asChild>
          <Link href={`/my/tournaments/${tournamentId}/manage`}>
            大会を管理
          </Link>
        </Button>
      ) : isParticipant ? (
        <>
          <Button asChild>
            <Link href={`/submit/${tournamentId}`}>
              スコアを提出
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleLeave}
            disabled={isLoading}
          >
            {isLoading ? '処理中...' : '大会から離脱'}
          </Button>
        </>
      ) : (
        <Button
          type="button"
          onClick={handleJoin}
          disabled={isLoading}
        >
          {isLoading ? '処理中...' : '大会に参加'}
        </Button>
      )}
      <Button asChild variant="outline">
        <Link href={`/tournaments/${tournamentId}/ranking`}>
          ランキングを見る
        </Link>
      </Button>
    </div>
  )
}
