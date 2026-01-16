import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    // Get tournament with organizer info
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select(`
        *,
        organizer:profiles!tournaments_organizer_id_fkey(id, display_name)
      `)
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

    // Calculate status
    const now = new Date()
    const startAt = new Date(tournament.start_at)
    const endAt = new Date(tournament.end_at)
    
    let status: 'upcoming' | 'active' | 'ended'
    if (now < startAt) {
      status = 'upcoming'
    } else if (now >= startAt && now <= endAt) {
      status = 'active'
    } else {
      status = 'ended'
    }

    // Get participants
    const { data: participants } = await supabase
      .from('participants')
      .select(`
        id,
        joined_at,
        user:profiles!participants_user_id_fkey(id, display_name)
      `)
      .eq('tournament_id', id)
      .order('joined_at', { ascending: true })

    // Get tournament songs
    const { data: tournamentSongs } = await supabase
      .from('tournament_songs')
      .select(`
        id,
        song:songs!tournament_songs_song_id_fkey(
          id,
          title,
          artist,
          difficulty,
          level
        )
      `)
      .eq('tournament_id', id)

    return NextResponse.json({
      ...tournament,
      status,
      participants: participants || [],
      songs: tournamentSongs || [],
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/tournaments/[id]:', error)
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
