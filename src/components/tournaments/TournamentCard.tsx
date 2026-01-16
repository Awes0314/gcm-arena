'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tournament, GameType, TournamentStatus } from '@/lib/types/database'
import { Calendar, Users, Crown, UserCheck, Upload, Music } from 'lucide-react'

interface Song {
  id: string
  title: string
  difficulty: string
  level: number
}

interface TournamentCardProps {
  tournament: Tournament & {
    status: TournamentStatus
    organizer_id: string
    organizer_name: string
    participant_count: number
    is_organizer?: boolean
    is_participating?: boolean
    songs?: Song[]
  }
  currentUserId?: string | null
}

const gameTypeLabels: Record<GameType, string> = {
  ongeki: 'オンゲキ',
  chunithm: 'CHUNITHM',
  maimai: 'maimai'
}

const statusLabels: Record<TournamentStatus, string> = {
  upcoming: '開催前',
  active: '開催中',
  ended: '終了'
}

const statusVariants: Record<TournamentStatus, 'default' | 'secondary' | 'outline'> = {
  upcoming: 'outline',
  active: 'default',
  ended: 'secondary'
}

export function TournamentCard({ tournament, currentUserId }: TournamentCardProps) {
  const startDate = new Date(tournament.start_at).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  
  const endDate = new Date(tournament.end_at).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <Card className={`hover:shadow-lg transition-shadow flex flex-col h-full ${
      tournament.is_organizer ? 'border-amber-500 border-2' : 
      tournament.is_participating ? 'border-blue-500 border-2' : ''
    }`}>
      <CardHeader className="flex-shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl flex items-center gap-2 flex-wrap">
              <span className="truncate">{tournament.title}</span>
              {tournament.is_organizer && (
                <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 flex-shrink-0">
                  <Crown className="h-3 w-3 mr-1" />
                  開催者
                </Badge>
              )}
              {tournament.is_participating && !tournament.is_organizer && (
                <Badge variant="default" className="bg-blue-500 hover:bg-blue-600 flex-shrink-0">
                  <UserCheck className="h-3 w-3 mr-1" />
                  参加中
                </Badge>
              )}
            </CardTitle>
          </div>
          <Badge variant={statusVariants[tournament.status]} className="flex-shrink-0">
            {statusLabels[tournament.status]}
          </Badge>
        </div>
        <CardDescription>
          <Badge variant="outline" className="mr-2">
            {gameTypeLabels[tournament.game_type]}
          </Badge>
          開催者: {' '}
          <Link 
            href={tournament.organizer_id === currentUserId ? '/my' : `/users/${tournament.organizer_id}`}
            className="hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {tournament.organizer_name}
          </Link>
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-grow flex flex-col">
        {tournament.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {tournament.description}
          </p>
        )}
        
        <div className="space-y-2 text-sm mb-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{startDate} 〜 {endDate}</span>
          </div>
          
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4 flex-shrink-0" />
            <span>{tournament.participant_count}人参加</span>
          </div>
        </div>

        {/* 楽曲情報 */}
        {tournament.songs && tournament.songs.length > 0 && (
          <div className="mt-auto">
            <div className="flex items-center gap-2 text-sm font-semibold mb-2">
              <Music className="h-4 w-4" />
              <span>対象楽曲</span>
            </div>
            <div className="space-y-1">
              {tournament.songs.map((song) => (
                <div key={song.id} className="text-xs text-muted-foreground flex items-center gap-2">
                  <Badge variant="outline" className="text-xs px-1.5 py-0">
                    {song.difficulty} {song.level}
                  </Badge>
                  <span className="truncate">{song.title}</span>
                </div>
              ))}
              {tournament.songs.length === 3 && (
                <p className="text-xs text-muted-foreground italic">他にも楽曲があります</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex gap-2 flex-shrink-0 mt-auto">
        {tournament.is_organizer && (
          <Button asChild variant="outline" className="flex-1">
            <Link href={`/my/tournaments/${tournament.id}/manage`}>
              管理画面
            </Link>
          </Button>
        )}
        {tournament.is_participating && !tournament.is_organizer && (
          <Button asChild variant="outline" className="flex-1">
            <Link href={`/submit/${tournament.id}`}>
              <Upload className="h-4 w-4 mr-2" />
              スコア提出
            </Link>
          </Button>
        )}
        <Button asChild className={tournament.is_organizer || tournament.is_participating ? 'flex-1' : 'w-full'}>
          <Link href={`/tournaments/${tournament.id}`}>
            詳細を見る
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
