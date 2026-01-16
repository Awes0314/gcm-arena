'use client'

import { useState } from 'react'
import { TournamentCard } from './TournamentCard'
import { Tournament, GameType, TournamentStatus } from '@/lib/types/database'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Crown, UserCheck } from 'lucide-react'

interface TournamentListProps {
  tournaments: (Tournament & {
    status: TournamentStatus
    organizer_id: string
    organizer_name: string
    participant_count: number
    is_organizer?: boolean
    is_participating?: boolean
    songs?: Array<{
      id: string
      title: string
      difficulty: string
      level: number
    }>
  })[]
  currentUserId?: string | null
}

const gameTypeLabels: Record<GameType | 'all', string> = {
  all: 'すべて',
  ongeki: 'オンゲキ',
  chunithm: 'CHUNITHM',
  maimai: 'maimai'
}

const statusLabels: Record<TournamentStatus | 'all', string> = {
  all: 'すべて',
  upcoming: '開催前',
  active: '開催中',
  ended: '終了'
}

const relationshipLabels: Record<'all' | 'organizing' | 'participating' | 'other', string> = {
  all: 'すべて',
  organizing: '開催中',
  participating: '参加中',
  other: 'その他'
}

export function TournamentList({ tournaments, currentUserId }: TournamentListProps) {
  const [gameTypeFilter, setGameTypeFilter] = useState<GameType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<TournamentStatus | 'all'>('all')
  const [relationshipFilter, setRelationshipFilter] = useState<'all' | 'organizing' | 'participating' | 'other'>('all')

  const filteredTournaments = tournaments.filter((tournament) => {
    const matchesGameType = gameTypeFilter === 'all' || tournament.game_type === gameTypeFilter
    const matchesStatus = statusFilter === 'all' || tournament.status === statusFilter
    
    let matchesRelationship = true
    if (relationshipFilter === 'organizing') {
      matchesRelationship = tournament.is_organizer === true
    } else if (relationshipFilter === 'participating') {
      matchesRelationship = tournament.is_participating === true && !tournament.is_organizer
    } else if (relationshipFilter === 'other') {
      matchesRelationship = !tournament.is_organizer && !tournament.is_participating
    }
    
    return matchesGameType && matchesStatus && matchesRelationship
  })

  // 統計情報を計算
  const stats = {
    organizing: tournaments.filter(t => t.is_organizer).length,
    participating: tournaments.filter(t => t.is_participating && !t.is_organizer).length,
    total: tournaments.length
  }

  return (
    <div className="space-y-6">
      {/* 統計情報 */}
      {currentUserId && (stats.organizing > 0 || stats.participating > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-amber-50 dark:bg-amber-950 border-2 border-amber-500 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <h3 className="font-semibold text-amber-900 dark:text-amber-100">開催中の大会</h3>
            </div>
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{stats.organizing}</p>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-950 border-2 border-blue-500 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <UserCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">参加中の大会</h3>
            </div>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.participating}</p>
          </div>
        </div>
      )}

      {/* フィルター */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex-1 space-y-2">
          <Label htmlFor="game-type-filter">ゲーム種別</Label>
          <Select
            value={gameTypeFilter}
            onValueChange={(value) => setGameTypeFilter(value as GameType | 'all')}
          >
            <SelectTrigger id="game-type-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{gameTypeLabels.all}</SelectItem>
              <SelectItem value="ongeki">{gameTypeLabels.ongeki}</SelectItem>
              <SelectItem value="chunithm">{gameTypeLabels.chunithm}</SelectItem>
              <SelectItem value="maimai">{gameTypeLabels.maimai}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 space-y-2">
          <Label htmlFor="status-filter">ステータス</Label>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as TournamentStatus | 'all')}
          >
            <SelectTrigger id="status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{statusLabels.all}</SelectItem>
              <SelectItem value="upcoming">{statusLabels.upcoming}</SelectItem>
              <SelectItem value="active">{statusLabels.active}</SelectItem>
              <SelectItem value="ended">{statusLabels.ended}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {currentUserId && (
          <div className="flex-1 space-y-2">
            <Label htmlFor="relationship-filter">関係性</Label>
            <Select
              value={relationshipFilter}
              onValueChange={(value) => setRelationshipFilter(value as 'all' | 'organizing' | 'participating' | 'other')}
            >
              <SelectTrigger id="relationship-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{relationshipLabels.all}</SelectItem>
                <SelectItem value="organizing">{relationshipLabels.organizing}</SelectItem>
                <SelectItem value="participating">{relationshipLabels.participating}</SelectItem>
                <SelectItem value="other">{relationshipLabels.other}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* 大会一覧 */}
      {filteredTournaments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>該当する大会が見つかりませんでした</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTournaments.map((tournament) => (
            <TournamentCard 
              key={tournament.id} 
              tournament={tournament}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
