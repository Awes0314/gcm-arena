import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyTournamentOrganizer } from '@/lib/utils/notifications'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: tournamentId } = await context.params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        {
          error: {
            code: 'AUTH_REQUIRED',
            message: '認証が必要です',
          },
        },
        { status: 401 }
      )
    }

    // Check if tournament exists
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('id, title, organizer_id')
      .eq('id', tournamentId)
      .single()

    if (tournamentError || !tournament) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: '大会が見つかりません',
          },
        },
        { status: 404 }
      )
    }

    // Check for duplicate participation
    const { data: existingParticipant } = await supabase
      .from('participants')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('user_id', user.id)
      .single()

    if (existingParticipant) {
      return NextResponse.json(
        {
          error: {
            code: 'BUSINESS_DUPLICATE_PARTICIPATION',
            message: '既にこの大会に参加しています',
          },
        },
        { status: 400 }
      )
    }

    // Create participant record
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .insert({
        tournament_id: tournamentId,
        user_id: user.id,
      })
      .select()
      .single()

    if (participantError) {
      console.error('Error creating participant:', participantError)
      return NextResponse.json(
        {
          error: {
            code: 'SYSTEM_DATABASE_ERROR',
            message: '参加登録に失敗しました',
          },
        },
        { status: 500 }
      )
    }

    // Create notification for organizer (if not self-joining)
    if (tournament.organizer_id !== user.id) {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()

      const displayName = userProfile?.display_name || 'ユーザー'

      await notifyTournamentOrganizer(
        supabase,
        tournamentId,
        `${displayName}さんが「${tournament.title}」に参加しました`
      )
    }

    return NextResponse.json({
      success: true,
      participant,
    })
  } catch (error) {
    console.error('Unexpected error in POST /api/tournaments/[id]/join:', error)
    return NextResponse.json(
      {
        error: {
          code: 'SYSTEM_INTERNAL_ERROR',
          message: 'システムエラーが発生しました',
        },
      },
      { status: 500 }
    )
  }
}
