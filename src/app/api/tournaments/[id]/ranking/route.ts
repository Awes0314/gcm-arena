import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    // Get tournament details to check access permissions
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('id, is_public, organizer_id')
      .eq('id', id)
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

    // Check access permissions
    // Public tournaments: anyone can view ranking
    // Private tournaments: only participants can view ranking
    if (!tournament.is_public) {
      if (!user) {
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

      // Check if user is a participant
      const { data: participant } = await supabase
        .from('participants')
        .select('id')
        .eq('tournament_id', id)
        .eq('user_id', user.id)
        .single()

      if (!participant) {
        return NextResponse.json(
          {
            error: {
              code: 'AUTHZ_FORBIDDEN',
              message: 'この大会のランキングを閲覧する権限がありません',
            },
          },
          { status: 403 }
        )
      }
    }

    // Call the calculate_ranking function
    const { data: rankings, error: rankingError } = await supabase
      .rpc('calculate_ranking', { p_tournament_id: id })

    if (rankingError) {
      console.error('Error calculating ranking:', rankingError)
      return NextResponse.json(
        {
          error: {
            code: 'SYSTEM_DATABASE_ERROR',
            message: 'ランキングの計算に失敗しました',
          },
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      rankings: rankings || [],
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/tournaments/[id]/ranking:', error)
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
