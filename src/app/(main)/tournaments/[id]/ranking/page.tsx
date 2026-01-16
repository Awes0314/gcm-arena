import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RankingTable, RankingEntry } from '@/components/tournaments/RankingTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function RankingPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  // Get tournament details
  const { data: tournament, error: tournamentError } = await supabase
    .from('tournaments')
    .select(`
      *,
      organizer:profiles!tournaments_organizer_id_fkey(id, display_name)
    `)
    .eq('id', id)
    .single()

  if (tournamentError || !tournament) {
    notFound()
  }

  // Check if user is a participant
  let isParticipant = false
  if (user) {
    const { data: participant } = await supabase
      .from('participants')
      .select('id')
      .eq('tournament_id', id)
      .eq('user_id', user.id)
      .single()
    
    isParticipant = !!participant
  }

  // Check access permissions
  // Public tournaments: anyone can view
  // Private tournaments: only participants can view
  if (!tournament.is_public && !isParticipant) {
    redirect(`/tournaments/${id}`)
  }

  // Fetch ranking data using the calculate_ranking function
  const { data: rankings, error: rankingError } = await supabase
    .rpc('calculate_ranking', { p_tournament_id: id })

  if (rankingError) {
    console.error('Error fetching rankings:', rankingError)
  }

  const rankingData: RankingEntry[] = rankings || []

  // Calculate tournament status
  const now = new Date()
  const startAt = new Date(tournament.start_at)
  const endAt = new Date(tournament.end_at)
  
  let status: 'upcoming' | 'active' | 'ended'
  if (now < startAt) {
    status = 'upcoming'
  } else if (now >= startAt && now <= endAt) {
    status = 'active'
  } else {
    status = 'ended'
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <Link href={`/tournaments/${id}`}>
          <Button variant="ghost" className="mb-4">
            ← 大会詳細に戻る
          </Button>
        </Link>
        
        <Card>
          <CardHeader>
            <CardTitle>{tournament.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ステータス:</span>
                <span className="font-medium">
                  {status === 'upcoming' && '開催前'}
                  {status === 'active' && '開催中'}
                  {status === 'ended' && '終了'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">開催者:</span>
                <Link 
                  href={tournament.organizer.id === user?.id ? '/my' : `/users/${tournament.organizer.id}`}
                  className="hover:underline"
                >
                  {tournament.organizer.display_name || '名無し'}
                </Link>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">参加者数:</span>
                <span>{rankingData.length}人</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <RankingTable rankings={rankingData} currentUserId={user?.id} />
    </div>
  )
}
