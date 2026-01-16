import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
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

    // Parse request body
    const body = await request.json()
    const { score } = body

    if (typeof score !== 'number' || score < 0 || score > 1010000) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_INVALID_SCORE', message: 'スコアは0から1,010,000の範囲で指定してください' } },
        { status: 400 }
      )
    }

    // Fetch the score to verify organizer permission
    const { data: scoreData, error: fetchError } = await supabase
      .from('scores')
      .select(`
        *,
        tournaments:tournament_id (
          organizer_id
        )
      `)
      .eq('id', id)
      .single()

    if (fetchError || !scoreData) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'スコアが見つかりません' } },
        { status: 404 }
      )
    }

    // Check if user is the organizer
    const tournament = scoreData.tournaments as any
    if (tournament.organizer_id !== user.id) {
      return NextResponse.json(
        { error: { code: 'AUTHZ_NOT_ORGANIZER', message: '開催者のみがスコアを更新できます' } },
        { status: 403 }
      )
    }

    // Update the score
    const { data: updatedScore, error: updateError } = await supabase
      .from('scores')
      .update({
        score,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating score:', updateError)
      return NextResponse.json(
        { error: { code: 'SYSTEM_DATABASE_ERROR', message: 'スコアの更新に失敗しました' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      score: updatedScore,
    })
  } catch (error) {
    console.error('Error in score update API:', error)
    return NextResponse.json(
      { error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'システムエラーが発生しました' } },
      { status: 500 }
    )
  }
}
