import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

// Dynamic import for heavy form component
const TournamentForm = dynamic(
  () => import('@/components/tournaments/TournamentForm').then(mod => ({ default: mod.TournamentForm })),
  {
    loading: () => (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    ),
  }
)

export default async function CreateTournamentPage() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">大会を作成</h1>
        <p className="text-muted-foreground mt-2">
          新しい大会を作成して、参加者を募集しましょう
        </p>
      </div>

      <TournamentForm mode="create" />
    </div>
  )
}
