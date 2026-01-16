import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
import type { Song } from '@/lib/types/database'

// Dynamic import for score submission form
const ScoreSubmitForm = dynamic(
  () => import('@/components/scores/ScoreSubmitForm').then(mod => ({ default: mod.ScoreSubmitForm })),
  {
    loading: () => (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    ),
    ssr: false,
  }
)

interface PageProps {
  params: Promise<{
    tournamentId: string
  }>
}

export default async function SubmitScorePage({ params }: PageProps) {
  const { tournamentId } = await params
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
    .eq('id', tournamentId)
    .single()

  if (tournamentError || !tournament) {
    redirect('/tournaments')
  }

  // Check if user is a participant
  const { data: participant, error: participantError } = await supabase
    .from('participants')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('user_id', user.id)
    .single()

  if (participantError || !participant) {
    redirect(`/tournaments/${tournamentId}`)
  }

  // Fetch tournament songs
  const { data: tournamentSongs, error: songsError } = await supabase
    .from('tournament_songs')
    .select('song_id, songs(*)')
    .eq('tournament_id', tournamentId)

  if (songsError) {
    console.error('Error fetching tournament songs:', songsError)
    redirect(`/tournaments/${tournamentId}`)
  }

  const songs: Song[] = tournamentSongs
    ?.map((ts: any) => ts.songs)
    .filter((song: any) => song !== null) || []

  // Fetch user's existing scores for this tournament
  const { data: existingScores } = await supabase
    .from('scores')
    .select('song_id, score, submitted_at, status')
    .eq('tournament_id', tournamentId)
    .eq('user_id', user.id)
    .eq('status', 'approved')

  // Create a map of song_id to score for easy lookup
  const scoresMap = new Map(
    existingScores?.map(score => [score.song_id, score]) || []
  )

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">スコア提出</h1>
        <p className="text-muted-foreground">{tournament.title}</p>
      </div>

      <ScoreSubmitForm 
        tournamentId={tournamentId} 
        tournamentSongs={songs}
        submissionMethod={tournament.submission_method}
        existingScores={scoresMap}
      />
    </div>
  )
}
