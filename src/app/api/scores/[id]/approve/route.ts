import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/utils/notifications'

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

    const body = await request.json()
    const { score, status } = body

    // Validation
    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_INVALID_FORMAT', message: '無効なステータスです' } },
        { status: 400 }
      )
    }

    if (status === 'approved') {
      if (typeof score !== 'number' || score < 0) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_INVALID_FORMAT', message: '有効なスコアを入力してください' } },
          { status: 400 }
        )
      }

      if (score > 1010000) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_INVALID_FORMAT', message: 'スコアが範囲外です' } },
          { status: 400 }
        )
      }
    }

    // Fetch the score record
    const { data: scoreRecord, error: fetchError } = await supabase
      .from('scores')
      .select('*, tournaments!inner(organizer_id)')
      .eq('id', id)
      .single()

    if (fetchError || !scoreRecord) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_INVALID_FORMAT',
            message: 'スコアレコードが見つかりません',
          },
        },
        { status: 404 }
      )
    }

    // Check if user is the organizer
    const tournament = scoreRecord.tournaments as any
    if (tournament.organizer_id !== user.id) {
      return NextResponse.json(
        {
          error: {
            code: 'AUTHZ_NOT_ORGANIZER',
            message: 'この操作を実行する権限がありません',
          },
        },
        { status: 403 }
      )
    }

    // Update the score record
    const updateData: any = {
      status,
      approved_at: new Date().toISOString(),
      approved_by: user.id,
    }

    if (status === 'approved' && score !== undefined) {
      updateData.score = score
    }

    const { data: updatedScore, error: updateError } = await supabase
      .from('scores')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating score:', updateError)
      return NextResponse.json(
        {
          error: {
            code: 'SYSTEM_DATABASE_ERROR',
            message: 'スコアの更新に失敗しました',
            details: updateError,
          },
        },
        { status: 500 }
      )
    }

    // Notify the submitter about the approval/rejection
    const { data: tournamentData } = await supabase
      .from('tournaments')
      .select('title')
      .eq('id', scoreRecord.tournament_id)
      .single()

    const { data: songData } = await supabase
      .from('songs')
      .select('title')
      .eq('id', scoreRecord.song_id)
      .single()

    const tournamentTitle = tournamentData?.title || '大会'
    const songTitle = songData?.title || '楽曲'

    if (status === 'approved') {
      await createNotification(
        supabase,
        scoreRecord.user_id,
        `「${tournamentTitle}」のスコアが承認されました（${songTitle}: ${score}点）`,
        {
          tournamentId: scoreRecord.tournament_id,
          linkUrl: `/tournaments/${scoreRecord.tournament_id}`,
        }
      )
    } else {
      await createNotification(
        supabase,
        scoreRecord.user_id,
        `「${tournamentTitle}」のスコア提出が却下されました（${songTitle}）`,
        {
          tournamentId: scoreRecord.tournament_id,
          linkUrl: `/tournaments/${scoreRecord.tournament_id}`,
        }
      )
    }

    return NextResponse.json(
      {
        message: status === 'approved' ? 'スコアを承認しました' : 'スコアを却下しました',
        score: updatedScore,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Unexpected error in PATCH /api/scores/[id]/approve:', error)
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
