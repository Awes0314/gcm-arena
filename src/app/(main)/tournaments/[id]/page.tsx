import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Users, Music, FileText, Trophy } from 'lucide-react'
import { GameType, TournamentStatus } from '@/lib/types/database'
import Link from 'next/link'
import { TournamentActions } from '@/components/tournaments/TournamentActions'

export const dynamic = 'force-dynamic'
export const revalidate = 30 // Revalidate every 30 seconds

interface TournamentDetailPageProps {
  params: Promise<{ id: string }>
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

export default async function TournamentDetailPage({ params }: TournamentDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()

  // 現在のユーザーを取得
  const { data: { user } } = await supabase.auth.getUser()

  // 大会詳細を取得
  const { data: tournament, error: tournamentError } = await supabase
    .from('tournaments_with_status')
    .select(`
      *,
      organizer:profiles!tournaments_organizer_id_fkey(id, display_name)
    `)
    .eq('id', id)
    .maybeSingle()

  if (tournamentError || !tournament) {
    notFound()
  }

  // 参加者リストを取得
  const { data: participants } = await supabase
    .from('participants')
    .select(`
      id,
      joined_at,
      user:profiles!participants_user_id_fkey(id, display_name)
    `)
    .eq('tournament_id', id)
    .order('joined_at', { ascending: true })

  // 対象楽曲リストを取得
  const { data: tournamentSongs } = await supabase
    .from('tournament_songs')
    .select(`
      id,
      song:songs!tournament_songs_song_id_fkey(
        id,
        title,
        artist,
        difficulty,
        level
      )
    `)
    .eq('tournament_id', id)

  // 上位3人のランキングを取得
  const { data: topRankings } = await supabase
    .rpc('calculate_ranking', { p_tournament_id: id })
    .limit(3)

  // Type-safe access to nested data
  const organizerData = Array.isArray(tournament.organizer) ? tournament.organizer[0] : tournament.organizer
  const organizerId = organizerData?.id
  const organizerName = organizerData?.display_name

  // 現在のユーザーが参加しているかチェック
  const isParticipant = participants?.some(p => {
    const userData = Array.isArray(p.user) ? p.user[0] : p.user
    return userData?.id === user?.id
  }) || false
  const isOrganizer = organizerId === user?.id

  const startDate = new Date(tournament.start_at).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  
  const endDate = new Date(tournament.end_at).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  return (
    <div className="container-wide section-spacing">
      {/* ヘッダー */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div className="flex-1">
            <h1 className="text-responsive-2xl font-bold mb-2">{tournament.title}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={statusVariants[tournament.status as TournamentStatus]}>
                {statusLabels[tournament.status as TournamentStatus]}
              </Badge>
              <Badge variant="outline">
                {gameTypeLabels[tournament.game_type as GameType]}
              </Badge>
              <span className="text-responsive-sm text-muted-foreground">
                開催者: {' '}
                <Link 
                  href={organizerId === user?.id ? '/my' : `/users/${organizerId}`}
                  className="text-foreground hover:underline font-medium"
                >
                  {organizerName || '不明'}
                </Link>
              </span>
            </div>
          </div>
        </div>

        {/* アクションボタン */}
        <TournamentActions
          tournamentId={id}
          isOrganizer={isOrganizer}
          isParticipant={isParticipant}
          isAuthenticated={!!user}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* メインコンテンツ */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* 大会情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-responsive-lg">
                <FileText className="h-5 w-5" />
                大会情報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tournament.description && (
                <div>
                  <h3 className="font-semibold mb-2 text-responsive-sm">説明</h3>
                  <p className="text-responsive-xs text-muted-foreground whitespace-pre-wrap">
                    {tournament.description}
                  </p>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2 text-responsive-sm">
                  <Calendar className="h-4 w-4" />
                  開催期間
                </h3>
                <p className="text-responsive-xs text-muted-foreground">
                  {startDate} 〜 {endDate}
                </p>
              </div>

              {tournament.rules && Object.keys(tournament.rules).length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 text-responsive-sm">ルール</h3>
                  <pre className="text-xs sm:text-sm text-muted-foreground bg-muted p-3 rounded-md overflow-x-auto">
                    {JSON.stringify(tournament.rules, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 対象楽曲 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-responsive-lg">
                <Music className="h-5 w-5" />
                対象楽曲 ({tournamentSongs?.length || 0}曲)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tournamentSongs && tournamentSongs.length > 0 ? (
                <div className="space-y-2">
                  {tournamentSongs.map((ts) => {
                    const songData = Array.isArray(ts.song) ? ts.song[0] : ts.song
                    return (
                      <div
                        key={ts.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-muted/50 rounded-md"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-responsive-sm truncate">{songData?.title}</p>
                          {songData?.artist && (
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">{songData.artist}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 sm:text-right">
                          <Badge variant="outline" className="text-xs">
                            {songData?.difficulty}
                          </Badge>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Lv. {songData?.level}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-responsive-sm text-muted-foreground text-center py-4">
                  対象楽曲が設定されていません
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* サイドバー */}
        <div className="space-y-4 sm:space-y-6">
          {/* 上位ランキング */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-responsive-lg">
                  <Trophy className="h-5 w-5" />
                  上位ランキング
                </CardTitle>
                <Link href={`/tournaments/${id}/ranking`}>
                  <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
                    全て見る →
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {topRankings && topRankings.length > 0 ? (
                <div className="space-y-3">
                  {topRankings.map((entry: any, index: number) => (
                    <div
                      key={entry.user_id}
                      className="flex items-center gap-3 p-2 bg-muted/50 rounded-md"
                    >
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                        index === 0 ? 'bg-yellow-500 text-yellow-950' :
                        index === 1 ? 'bg-gray-400 text-gray-950' :
                        index === 2 ? 'bg-amber-600 text-amber-950' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {entry.rank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link 
                          href={entry.user_id === user?.id ? '/my' : `/users/${entry.user_id}`}
                          className="text-responsive-xs font-medium truncate hover:underline block"
                        >
                          {entry.display_name || '名無しプレイヤー'}
                        </Link>
                        <p className="text-xs text-muted-foreground font-mono">
                          {entry.total_score.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-responsive-sm text-muted-foreground text-center py-4">
                  まだスコアが提出されていません
                </p>
              )}
            </CardContent>
          </Card>

          {/* 参加者リスト */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-responsive-lg">
                <Users className="h-5 w-5" />
                参加者 ({participants?.length || 0}人)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {participants && participants.length > 0 ? (
                <div className="space-y-2">
                  {participants.map((participant) => {
                    const userData = Array.isArray(participant.user) ? participant.user[0] : participant.user
                    return (
                      <div
                        key={participant.id}
                        className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-md"
                      >
                        <Link 
                          href={userData?.id === user?.id ? '/my' : `/users/${userData?.id}`}
                          className="text-responsive-xs font-medium hover:underline truncate flex-1 min-w-0"
                        >
                          {userData?.display_name || '不明'}
                        </Link>
                        {userData?.id === organizerId && (
                          <Badge variant="secondary" className="text-xs flex-shrink-0">
                            開催者
                          </Badge>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-responsive-sm text-muted-foreground text-center py-4">
                  まだ参加者がいません
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
