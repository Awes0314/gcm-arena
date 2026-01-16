import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PendingSubmissionsList } from '@/components/tournaments/PendingSubmissionsList'
import { ManagementActions } from '@/components/tournaments/ManagementActions'
import { ScoreHistoryList } from '@/components/tournaments/ScoreHistoryList'
import { ParticipantManagement } from '@/components/tournaments/ParticipantManagement'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function ManageTournamentPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch tournament details
  const { data: tournament, error: tournamentError } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single()

  if (tournamentError || !tournament) {
    redirect('/tournaments')
  }

  // Check if user is the organizer
  if (tournament.organizer_id !== user.id) {
    redirect(`/tournaments/${id}`)
  }

  // Fetch pending submissions
  const { data: pendingScores, error: scoresError } = await supabase
    .from('scores')
    .select(`
      *,
      profiles:user_id (
        id,
        display_name
      ),
      songs:song_id (
        id,
        title,
        difficulty,
        level
      )
    `)
    .eq('tournament_id', id)
    .eq('status', 'pending')
    .order('submitted_at', { ascending: false })

  if (scoresError) {
    console.error('Error fetching pending scores:', scoresError)
  }

  // Fetch approved scores (score history)
  const { data: approvedScores, error: approvedError } = await supabase
    .from('scores')
    .select(`
      *,
      profiles:user_id (
        id,
        display_name
      ),
      songs:song_id (
        id,
        title,
        difficulty,
        level
      )
    `)
    .eq('tournament_id', id)
    .eq('status', 'approved')
    .order('submitted_at', { ascending: false })

  if (approvedError) {
    console.error('Error fetching approved scores:', approvedError)
  }

  // Fetch participants with their submission counts
  const { data: participants, error: participantsError } = await supabase
    .from('participants')
    .select(`
      *,
      profiles:user_id (
        id,
        display_name
      )
    `)
    .eq('tournament_id', id)
    .order('joined_at', { ascending: false })

  if (participantsError) {
    console.error('Error fetching participants:', participantsError)
  }

  // Get submission counts for each participant
  const participantsWithStats = await Promise.all(
    (participants || []).map(async (participant) => {
      const { count: submissionCount } = await supabase
        .from('scores')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', id)
        .eq('user_id', participant.user_id)
        .eq('status', 'approved')

      return {
        ...participant,
        submissionCount: submissionCount || 0,
      }
    })
  )

  // Fetch participant statistics
  const { count: participantCount } = await supabase
    .from('participants')
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', id)

  const { count: submissionCount } = await supabase
    .from('scores')
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', id)
    .eq('status', 'approved')

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">大会管理</h1>
          <p className="text-muted-foreground">{tournament.title}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/tournaments/${id}`}>
            <Button variant="outline">大会ページへ</Button>
          </Link>
          {new Date(tournament.start_at) > new Date() && (
            <Link href={`/tournaments/${id}/edit`}>
              <Button variant="outline">大会を編集</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-card border rounded-lg p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">参加者数</h3>
          <p className="text-3xl font-bold">{participantCount || 0}</p>
        </div>
        <div className="bg-card border rounded-lg p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">承認済み提出数</h3>
          <p className="text-3xl font-bold">{submissionCount || 0}</p>
        </div>
        <div className="bg-card border rounded-lg p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">保留中の提出</h3>
          <p className="text-3xl font-bold">{pendingScores?.length || 0}</p>
        </div>
      </div>

      {/* Actions */}
      <ManagementActions tournamentId={id} />

      {/* Tabs for different management sections */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">
            保留中の提出 ({pendingScores?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="history">
            スコア履歴 ({approvedScores?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="participants">
            参加者管理 ({participantCount || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <div>
            <h2 className="text-2xl font-bold mb-4">保留中の画像提出</h2>
            <PendingSubmissionsList 
              submissions={pendingScores || []} 
              tournamentId={id}
            />
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <div>
            <h2 className="text-2xl font-bold mb-4">スコア提出履歴</h2>
            <ScoreHistoryList 
              scores={approvedScores || []} 
              tournamentId={id}
            />
          </div>
        </TabsContent>

        <TabsContent value="participants" className="mt-6">
          <div>
            <h2 className="text-2xl font-bold mb-4">参加者管理</h2>
            <ParticipantManagement 
              participants={participantsWithStats || []} 
              tournamentId={id}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
