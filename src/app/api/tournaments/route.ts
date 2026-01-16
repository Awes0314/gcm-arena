import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { GameType, SubmissionMethod } from '@/lib/types/database'
import {
  sanitizeTournamentTitle,
  sanitizeTournamentDescription,
  sanitizeJsonObject,
} from '@/lib/utils/sanitization'
import {
  validateTournamentTitle,
  validateTournamentDescription,
  validateDateRange,
  validateGameType,
  validateSubmissionMethod,
  validateSongIds,
  validateJsonObject,
} from '@/lib/utils/validation'
import { applyRateLimit, RATE_LIMITS } from '@/lib/utils/rate-limit-middleware'

interface CreateTournamentRequest {
  title: string
  description?: string
  game_type: GameType
  submission_method: SubmissionMethod
  start_at: string
  end_at: string
  is_public: boolean
  rules: Record<string, any>
  song_ids: string[]
}

export async function POST(request: NextRequest) {
  try {
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

    // Apply rate limiting (per user)
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.TOURNAMENT_CREATION, user.id)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body: CreateTournamentRequest = await request.json()

    // Sanitize inputs
    const sanitizedTitle = sanitizeTournamentTitle(body.title)
    const sanitizedDescription = body.description
      ? sanitizeTournamentDescription(body.description)
      : null
    const sanitizedRules = sanitizeJsonObject(body.rules || {})

    // Validation
    const titleValidation = validateTournamentTitle(sanitizedTitle)
    if (!titleValidation.valid) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_REQUIRED_FIELD', message: titleValidation.error } },
        { status: 400 }
      )
    }

    if (body.description) {
      const descValidation = validateTournamentDescription(body.description)
      if (!descValidation.valid) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_INVALID_FORMAT', message: descValidation.error } },
          { status: 400 }
        )
      }
    }

    const dateValidation = validateDateRange(body.start_at, body.end_at)
    if (!dateValidation.valid) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_INVALID_PERIOD',
            message: dateValidation.error,
          },
        },
        { status: 400 }
      )
    }

    const gameTypeValidation = validateGameType(body.game_type)
    if (!gameTypeValidation.valid) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_INVALID_FORMAT', message: gameTypeValidation.error } },
        { status: 400 }
      )
    }

    const submissionMethodValidation = validateSubmissionMethod(body.submission_method)
    if (!submissionMethodValidation.valid) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_INVALID_FORMAT', message: submissionMethodValidation.error } },
        { status: 400 }
      )
    }

    const songIdsValidation = validateSongIds(body.song_ids)
    if (!songIdsValidation.valid) {
      return NextResponse.json(
        {
          error: {
            code: 'BUSINESS_NO_SONGS',
            message: songIdsValidation.error,
          },
        },
        { status: 400 }
      )
    }

    const rulesValidation = validateJsonObject(sanitizedRules)
    if (!rulesValidation.valid) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_INVALID_FORMAT', message: rulesValidation.error } },
        { status: 400 }
      )
    }

    const startAt = new Date(body.start_at)
    const endAt = new Date(body.end_at)

    // Check active tournament limit (1 active tournament per user)
    const { data: activeTournaments, error: checkError } = await supabase
      .from('tournaments')
      .select('id')
      .eq('organizer_id', user.id)
      .lte('start_at', new Date().toISOString())
      .gte('end_at', new Date().toISOString())

    if (checkError) {
      console.error('Error checking active tournaments:', checkError)
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

    if (activeTournaments && activeTournaments.length > 0) {
      return NextResponse.json(
        {
          error: {
            code: 'BUSINESS_ACTIVE_TOURNAMENT_LIMIT',
            message: '既にアクティブな大会を開催しています。同時に開催できる大会は1つまでです。',
          },
        },
        { status: 400 }
      )
    }

    // Create tournament
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .insert({
        organizer_id: user.id,
        title: sanitizedTitle,
        description: sanitizedDescription,
        game_type: body.game_type,
        submission_method: body.submission_method,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        is_public: body.is_public,
        rules: sanitizedRules,
      })
      .select()
      .single()

    if (tournamentError) {
      console.error('Error creating tournament:', tournamentError)
      return NextResponse.json(
        {
          error: {
            code: 'SYSTEM_DATABASE_ERROR',
            message: '大会の作成に失敗しました',
            details: tournamentError,
          },
        },
        { status: 500 }
      )
    }

    // Insert tournament songs (transaction-like behavior)
    const tournamentSongs = body.song_ids.map((song_id) => ({
      tournament_id: tournament.id,
      song_id,
    }))

    const { error: songsError } = await supabase
      .from('tournament_songs')
      .insert(tournamentSongs)

    if (songsError) {
      console.error('Error inserting tournament songs:', songsError)
      
      // Rollback: delete the tournament
      await supabase.from('tournaments').delete().eq('id', tournament.id)

      return NextResponse.json(
        {
          error: {
            code: 'SYSTEM_DATABASE_ERROR',
            message: '楽曲の関連付けに失敗しました',
            details: songsError,
          },
        },
        { status: 500 }
      )
    }

    return NextResponse.json(tournament, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/tournaments:', error)
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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const gameType = searchParams.get('game_type')
    const status = searchParams.get('status')

    let query = supabase
      .from('tournaments')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })

    if (gameType) {
      query = query.eq('game_type', gameType)
    }

    const { data: tournaments, error } = await query

    if (error) {
      console.error('Error fetching tournaments:', error)
      return NextResponse.json(
        {
          error: {
            code: 'SYSTEM_DATABASE_ERROR',
            message: '大会の取得に失敗しました',
          },
        },
        { status: 500 }
      )
    }

    // Calculate status for each tournament
    const now = new Date()
    const tournamentsWithStatus = tournaments?.map((tournament) => {
      const startAt = new Date(tournament.start_at)
      const endAt = new Date(tournament.end_at)
      
      let calculatedStatus: 'upcoming' | 'active' | 'ended'
      if (now < startAt) {
        calculatedStatus = 'upcoming'
      } else if (now >= startAt && now <= endAt) {
        calculatedStatus = 'active'
      } else {
        calculatedStatus = 'ended'
      }

      return {
        ...tournament,
        status: calculatedStatus,
      }
    })

    // Filter by status if provided
    const filteredTournaments = status
      ? tournamentsWithStatus?.filter((t) => t.status === status)
      : tournamentsWithStatus

    // Add cache headers
    const response = NextResponse.json(filteredTournaments || [])
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120')
    
    return response
  } catch (error) {
    console.error('Unexpected error in GET /api/tournaments:', error)
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
