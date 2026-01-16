import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{
    id: string
    userId: string
  }>
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id: tournamentId, userId } = await context.params
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
      .eq('id', tournamentId)
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
        { error: { code: 'AUTHZ_NOT_ORGANIZER', message: '開催者のみが参加者を除外できます' } },
        { status: 403 }
      )
    }

    // Prevent organizer from banning themselves
    if (userId === user.id) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_CANNOT_BAN_SELF', message: '開催者は自分自身を除外できません' } },
        { status: 400 }
      )
    }

    // Delete all scores for this participant in this tournament
    const { error: scoresDeleteError } = await supabase
      .from('scores')
      .delete()
      .eq('tournament_id', tournamentId)
      .eq('user_id', userId)

    if (scoresDeleteError) {
      console.error('Error deleting participant scores:', scoresDeleteError)
      return NextResponse.json(
        { error: { code: 'SYSTEM_DATABASE_ERROR', message: 'スコアの削除に失敗しました' } },
        { status: 500 }
      )
    }

    // Delete the participant record
    const { error: participantDeleteError } = await supabase
      .from('participants')
      .delete()
      .eq('tournament_id', tournamentId)
      .eq('user_id', userId)

    if (participantDeleteError) {
      console.error('Error deleting participant:', participantDeleteError)
      return NextResponse.json(
        { error: { code: 'SYSTEM_DATABASE_ERROR', message: '参加者の除外に失敗しました' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '参加者を除外しました',
    })
  } catch (error) {
    console.error('Error in participant ban API:', error)
    return NextResponse.json(
      { error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'システムエラーが発生しました' } },
      { status: 500 }
    )
  }
}
