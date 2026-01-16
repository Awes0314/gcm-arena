import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyTournamentOrganizer } from '@/lib/utils/notifications'
import { applyRateLimit, RATE_LIMITS } from '@/lib/utils/rate-limit-middleware'
import { sanitizeUuid, sanitizeNumber } from '@/lib/utils/sanitization'
import { validateUuid, validateScore } from '@/lib/utils/validation'

interface BookmarkletSubmission {
  tournament_id: string
  song_id: string
  score: number
  game_type: 'ongeki' | 'chunithm' | 'maimai'
  song_title?: string
  difficulty?: string
}

// Check if bookmarklet is enabled (can be disabled via environment variable)
function isBookmarkletEnabled(): boolean {
  return process.env.BOOKMARKLET_ENABLED !== 'false'
}

export async function POST(request: NextRequest) {
  try {
    // Check if bookmarklet is enabled
    if (!isBookmarkletEnabled()) {
      return NextResponse.json(
        {
          error: {
            code: 'EXTERNAL_BOOKMARKLET_DISABLED',
            message: 'ブックマークレット機能は現在停止中です',
          },
        },
        { status: 503 }
      )
    }

    const supabase = await createClient()

    // Check authentication - bookmarklet uses session cookie
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: { code: 'AUTH_REQUIRED', message: '認証が必要です。ログインしてください。' } },
        { status: 401 }
      )
    }

    // Apply rate limiting (per user)
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.BOOKMARKLET, user.id)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body: BookmarkletSubmission = await request.json()

    // Sanitize inputs
    const sanitizedTournamentId = sanitizeUuid(body.tournament_id)
    const sanitizedSongId = sanitizeUuid(body.song_id)
    const sanitizedScore = sanitizeNumber(body.score, 0, 1010000)

    // Validation
    const tournamentIdValidation = validateUuid(sanitizedTournamentId)
    if (!tournamentIdValidation.valid) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_INVALID_FORMAT', message: '大会IDの形式が不正です' } },
        { status: 400 }
      )
    }

    const songIdValidation = validateUuid(sanitizedSongId)
    if (!songIdValidation.valid) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_INVALID_FORMAT', message: '楽曲IDの形式が不正です' } },
        { status: 400 }
      )
    }

    if (sanitizedScore === null) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_INVALID_FORMAT', message: '有効なスコアを入力してください' } },
        { status: 400 }
      )
    }

    const scoreValidation = validateScore(sanitizedScore)
    if (!scoreValidation.valid) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_INVALID_FORMAT', message: scoreValidation.error } },
        { status: 400 }
      )
    }

    // Check if user is a participant
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('id')
      .eq('tournament_id', sanitizedTournamentId)
      .eq('user_id', user.id)
      .single()

    if (participantError || !participant) {
      return NextResponse.json(
        {
          error: {
            code: 'AUTHZ_FORBIDDEN',
            message: 'この大会に参加していません',
          },
        },
        { status: 403 }
      )
    }

    // Check if song is part of tournament
    const { data: tournamentSong, error: tournamentSongError } = await supabase
      .from('tournament_songs')
      .select('id')
      .eq('tournament_id', sanitizedTournamentId)
      .eq('song_id', sanitizedSongId)
      .single()

    if (tournamentSongError || !tournamentSong) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_INVALID_FORMAT',
            message: 'この楽曲は大会の対象ではありません',
          },
        },
        { status: 400 }
      )
    }

    // Check if score already exists for this user, tournament, and song
    const { data: existingScore, error: existingScoreError } = await supabase
      .from('scores')
      .select('id, score')
      .eq('tournament_id', sanitizedTournamentId)
      .eq('user_id', user.id)
      .eq('song_id', sanitizedSongId)
      .eq('status', 'approved')
      .maybeSingle()

    if (existingScoreError && existingScoreError.code !== 'PGRST116') {
      console.error('Error checking existing score:', existingScoreError)
      return NextResponse.json(
        {
          error: {
            code: 'SYSTEM_DATABASE_ERROR',
            message: 'データベースエラーが発生しました',
          },
        },
        { status: 500 }
      )
    }

    let scoreRecord

    if (existingScore) {
      // Update existing score if new score is higher
      if (sanitizedScore > existingScore.score) {
        const { data: updatedScore, error: updateError } = await supabase
          .from('scores')
          .update({
            score: sanitizedScore,
            submitted_via: 'bookmarklet',
            submitted_at: new Date().toISOString(),
          })
          .eq('id', existingScore.id)
          .select()
          .maybeSingle()

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

        if (!updatedScore) {
          console.error('Score update returned no rows - possible RLS policy issue')
          return NextResponse.json(
            {
              error: {
                code: 'AUTHZ_FORBIDDEN',
                message: 'スコアの更新権限がありません',
              },
            },
            { status: 403 }
          )
        }

        scoreRecord = updatedScore
      } else {
        // Return existing score if new score is not higher
        return NextResponse.json(
          {
            success: true,
            message: '既存のスコアの方が高いため、更新されませんでした',
            score: existingScore,
          },
          { status: 200 }
        )
      }
    } else {
      // Insert new score - bookmarklet submissions are auto-approved
      const { data: newScore, error: insertError } = await supabase
        .from('scores')
        .insert({
          tournament_id: sanitizedTournamentId,
          user_id: user.id,
          song_id: sanitizedSongId,
          score: sanitizedScore,
          status: 'approved',
          submitted_via: 'bookmarklet',
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error inserting score:', insertError)
        return NextResponse.json(
          {
            error: {
              code: 'SYSTEM_DATABASE_ERROR',
              message: 'スコアの提出に失敗しました',
              details: insertError,
            },
          },
          { status: 500 }
        )
      }

      scoreRecord = newScore
    }

    // Notify tournament organizer about score submission
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('title, organizer_id')
      .eq('id', sanitizedTournamentId)
      .single()

    if (tournament && tournament.organizer_id !== user.id) {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()

      const { data: song } = await supabase
        .from('songs')
        .select('title')
        .eq('id', sanitizedSongId)
        .single()

      const displayName = userProfile?.display_name || 'ユーザー'
      const songTitle = song?.title || body.song_title || '楽曲'

      await notifyTournamentOrganizer(
        supabase,
        sanitizedTournamentId,
        `${displayName}さんが「${tournament.title}」にスコアを提出しました（${songTitle}: ${sanitizedScore}点）`
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'スコアを提出しました',
        score: scoreRecord,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Unexpected error in POST /api/bookmarklet/submit:', error)
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

// Handle OPTIONS request for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}
