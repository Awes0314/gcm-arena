'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { UserX, ExternalLink } from 'lucide-react'

interface Participant {
  id: string
  tournament_id: string
  user_id: string
  joined_at: string
  profiles: {
    id: string
    display_name: string | null
  } | null
  submissionCount: number
}

interface ParticipantManagementProps {
  participants: Participant[]
  tournamentId: string
}

export function ParticipantManagement({ participants, tournamentId }: ParticipantManagementProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [processingId, setProcessingId] = useState<string | null>(null)

  const handleBanParticipant = async (participant: Participant) => {
    const displayName = participant.profiles?.display_name || '名無し'
    
    if (!confirm(`${displayName} を大会から除外しますか？\n\nこの参加者の全てのスコアも削除されます。この操作は取り消せません。`)) {
      return
    }

    setProcessingId(participant.id)

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/participants/${participant.user_id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || '参加者の除外に失敗しました')
      }

      toast({
        title: '成功',
        description: `${displayName} を大会から除外しました`,
      })

      router.refresh()
    } catch (error) {
      console.error('Error banning participant:', error)
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : '参加者の除外に失敗しました',
        variant: 'destructive',
      })
    } finally {
      setProcessingId(null)
    }
  }

  if (participants.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          参加者はまだいません
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {participants.map((participant) => (
          <Card key={participant.id}>
            <CardHeader>
              <CardTitle className="text-lg flex justify-between items-start">
                <div className="flex-1">
                  {participant.profiles?.display_name || '名無し'}
                </div>
                <Link 
                  href={`/users/${participant.user_id}`}
                  target="_blank"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">参加日時</span>
                  <span>{new Date(participant.joined_at).toLocaleDateString('ja-JP')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">提出数</span>
                  <span className="font-semibold">{participant.submissionCount}</span>
                </div>
              </div>

              <Button
                onClick={() => handleBanParticipant(participant)}
                disabled={processingId === participant.id}
                variant="destructive"
                size="sm"
                className="w-full"
              >
                <UserX className="h-4 w-4 mr-2" />
                大会から除外
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
