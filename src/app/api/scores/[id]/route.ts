import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

export async function DELETE(request: NextRequest, context: RouteContext) {
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
        { error: { code: 'AUTHZ_NOT_ORGANIZER', message: '開催者のみがスコアを削除できます' } },
        { status: 403 }
      )
    }

    // Delete the score
    const { error: deleteError } = await supabase
      .from('scores')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting score:', deleteError)
      return NextResponse.json(
        { error: { code: 'SYSTEM_DATABASE_ERROR', message: 'スコアの削除に失敗しました' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'スコアを削除しました',
    })
  } catch (error) {
    console.error('Error in score delete API:', error)
    return NextResponse.json(
      { error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'システムエラーが発生しました' } },
      { status: 500 }
    )
  }
}
