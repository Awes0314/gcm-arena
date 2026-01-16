import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: { code: 'AUTH_REQUIRED', message: '認証が必要です' } },
        { status: 401 }
      )
    }

    // Fetch tournament and verify organizer
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('organizer_id')
      .eq('id', id)
      .single()

    if (tournamentError || !tournament) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '大会が見つかりません' } },
        { status: 404 }
      )
    }

    // Check if user is the organizer
    if (tournament.organizer_id !== user.id) {
      return NextResponse.json(
        { error: { code: 'AUTHZ_NOT_ORGANIZER', message: '開催者のみがランキングを再計算できます' } },
        { status: 403 }
      )
    }

    // Call the calculate_ranking function
    // Note: The function is already called automatically when scores are updated,
    // but this endpoint allows manual recalculation if needed
    const { data: ranking, error: rankingError } = await supabase.rpc(
      'calculate_ranking',
      { p_tournament_id: id }
    )

    if (rankingError) {
      console.error('Error calculating ranking:', rankingError)
      return NextResponse.json(
        { error: { code: 'SYSTEM_DATABASE_ERROR', message: 'ランキングの計算に失敗しました' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'ランキングを再計算しました',
      ranking,
    })
  } catch (error) {
    console.error('Error in recalculate API:', error)
    return NextResponse.json(
      { error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'システムエラーが発生しました' } },
      { status: 500 }
    )
  }
}
