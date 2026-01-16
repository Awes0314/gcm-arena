import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileView } from '@/components/profile/ProfileView'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Trophy, Calendar } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function MyPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  
  // Log error for debugging
  if (error) {
    console.error('Profile fetch error:', error)
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">マイページ</h1>
        <p className="text-muted-foreground">プロフィールの読み込みに失敗しました</p>
      </div>
    )
  }

  // Get user's organized tournaments
  const { data: organizedTournaments } = await supabase
    .from('tournaments')
    .select('id, title, game_type, start_at, end_at, is_public')
    .eq('organizer_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Get user's participated tournaments
  const { data: participatedTournaments } = await supabase
    .from('participants')
    .select(`
      tournament:tournaments(
        id,
        title,
        game_type,
        start_at,
        end_at,
        is_public
      )
    `)
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })
    .limit(5)

  // Calculate tournament status
  const calculateStatus = (startAt: string, endAt: string) => {
    const now = new Date()
    const start = new Date(startAt)
    const end = new Date(endAt)
    
    if (now < start) return 'upcoming'
    if (now >= start && now <= end) return 'active'
    return 'ended'
  }

  const statusLabels = {
    upcoming: '開催前',
    active: '開催中',
    ended: '終了'
  }

  const statusVariants: Record<string, 'default' | 'secondary' | 'outline'> = {
    upcoming: 'outline',
    active: 'default',
    ended: 'secondary'
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">マイページ</h1>
        <p className="text-muted-foreground">あなたのプロフィールと活動</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* プロフィール情報 */}
        <div className="md:col-span-1">
          <ProfileView profile={profile} isOwnProfile={true} />
        </div>

        {/* 活動情報 */}
        <div className="md:col-span-2 space-y-6">
          {/* 開催した大会 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  開催した大会 ({organizedTournaments?.length || 0})
                </CardTitle>
                <Link href="/my/tournaments">
                  <span className="text-sm text-muted-foreground hover:underline">
                    すべて見る →
                  </span>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {organizedTournaments && organizedTournaments.length > 0 ? (
                <div className="space-y-3">
                  {organizedTournaments.map((tournament) => {
                    const status = calculateStatus(tournament.start_at, tournament.end_at)
                    return (
                      <Link
                        key={tournament.id}
                        href={`/tournaments/${tournament.id}`}
                        className="block p-3 bg-muted/50 rounded-md hover:bg-muted transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{tournament.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {tournament.game_type}
                            </p>
                          </div>
                          <Badge variant={statusVariants[status]}>
                            {statusLabels[status]}
                          </Badge>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  開催した大会はありません
                </p>
              )}
            </CardContent>
          </Card>

          {/* 参加した大会 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                参加した大会 ({participatedTournaments?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {participatedTournaments && participatedTournaments.length > 0 ? (
                <div className="space-y-3">
                  {participatedTournaments.map((item) => {
                    const tournament = Array.isArray(item.tournament) 
                      ? item.tournament[0] 
                      : item.tournament
                    
                    if (!tournament) return null
                    
                    const status = calculateStatus(tournament.start_at, tournament.end_at)
                    return (
                      <Link
                        key={tournament.id}
                        href={`/tournaments/${tournament.id}`}
                        className="block p-3 bg-muted/50 rounded-md hover:bg-muted transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{tournament.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {tournament.game_type}
                            </p>
                          </div>
                          <Badge variant={statusVariants[status]}>
                            {statusLabels[status]}
                          </Badge>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  参加した大会はありません
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
