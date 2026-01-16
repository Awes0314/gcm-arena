import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
      .select('id')
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

    // Check if user is a participant
    const { data: participant } = await supabase
      .from('participants')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('user_id', user.id)
      .single()

    if (!participant) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'この大会に参加していません',
          },
        },
        { status: 404 }
      )
    }

    // Delete participant record (RLS policy ensures user can only delete their own)
    const { error: deleteError } = await supabase
      .from('participants')
      .delete()
      .eq('tournament_id', tournamentId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting participant:', deleteError)
      return NextResponse.json(
        {
          error: {
            code: 'SYSTEM_DATABASE_ERROR',
            message: '離脱に失敗しました',
          },
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('Unexpected error in POST /api/tournaments/[id]/leave:', error)
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
