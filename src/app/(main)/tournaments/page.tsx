import { createClient } from '@/lib/supabase/server'
import { TournamentList } from '@/components/tournaments/TournamentList'
import { Pagination } from '@/components/ui/pagination'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { parsePageParam, getPaginationRange, createPaginationMetadata } from '@/lib/utils/pagination'

export const dynamic = 'force-dynamic'
export const revalidate = 60 // Revalidate every 60 seconds

const PAGE_SIZE = 12

interface TournamentsPageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function TournamentsPage({ searchParams }: TournamentsPageProps) {
  const params = await searchParams
  const currentPage = parsePageParam(params.page)
  const { from, to } = getPaginationRange(currentPage, PAGE_SIZE)
  
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  // Get total count for pagination
  const { count: totalCount } = await supabase
    .from('tournaments_with_status')
    .select('*', { count: 'exact', head: true })
    .eq('is_public', true)

  // 公開大会を取得（ステータス、開催者名、参加者数、楽曲情報を含む）
  const { data: tournaments, error } = await supabase
    .from('tournaments_with_status')
    .select(`
      *,
      organizer:profiles!tournaments_organizer_id_fkey(display_name),
      participants(count),
      tournament_songs(
        songs(
          id,
          title,
          difficulty,
          level
        )
      )
    `)
    .eq('is_public', true)
    .order('start_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('Failed to fetch tournaments:', error)
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-destructive">大会の取得に失敗しました</p>
      </div>
    )
  }

  // ユーザーが参加している大会のIDを取得
  let participatingTournamentIds: string[] = []
  if (user) {
    const { data: participations } = await supabase
      .from('participants')
      .select('tournament_id')
      .eq('user_id', user.id)

    participatingTournamentIds = participations?.map(p => p.tournament_id) || []
  }

  // データを整形
  const formattedTournaments = (tournaments || []).map((tournament) => ({
    ...tournament,
    organizer_name: tournament.organizer?.display_name || '不明',
    participant_count: tournament.participants?.[0]?.count || 0,
    is_organizer: user?.id === tournament.organizer_id,
    is_participating: participatingTournamentIds.includes(tournament.id),
    songs: tournament.tournament_songs?.map((ts: any) => ts.songs).filter(Boolean).slice(0, 3) || []
  }))

  // Create pagination metadata
  const pagination = createPaginationMetadata(currentPage, PAGE_SIZE, totalCount || 0)

  return (
    <div className="container-wide section-spacing">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-responsive-2xl font-bold mb-2">大会一覧</h1>
          <p className="text-muted-foreground text-responsive-sm">
            開催中の大会や今後開催される大会を探しましょう
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/tournaments/create">
            <Plus className="mr-2 h-4 w-4" />
            大会を作成
          </Link>
        </Button>
      </div>

      <TournamentList 
        tournaments={formattedTournaments}
        currentUserId={user?.id}
      />

      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        baseUrl="/tournaments"
        hasNextPage={pagination.hasNextPage}
        hasPreviousPage={pagination.hasPreviousPage}
      />
    </div>
  )
}
