import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GameType } from '@/lib/types/database'

/**
 * GET /api/songs
 * 楽曲一覧を取得
 * 
 * クエリパラメータ:
 * - game_type: ゲームタイプでフィルタリング (ongeki | chunithm | maimai)
 * - difficulty: 難易度でフィルタリング
 * - title: タイトルで部分一致検索
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const searchParams = request.nextUrl.searchParams
    const gameType = searchParams.get('game_type') as GameType | null
    const difficulty = searchParams.get('difficulty')
    const titleSearch = searchParams.get('title')

    // クエリを構築
    let query = supabase
      .from('songs')
      .select('*')
      .order('game_type')
      .order('title')
      .order('difficulty')

    // ゲームタイプでフィルタリング
    if (gameType) {
      const validGameTypes: GameType[] = ['ongeki', 'chunithm', 'maimai']
      if (!validGameTypes.includes(gameType)) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_INVALID_FORMAT', message: 'Invalid game_type' } },
          { status: 400 }
        )
      }
      query = query.eq('game_type', gameType)
    }

    // 難易度でフィルタリング
    if (difficulty) {
      query = query.eq('difficulty', difficulty)
    }

    // タイトルで部分一致検索
    if (titleSearch) {
      query = query.ilike('title', `%${titleSearch}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to fetch songs:', error)
      return NextResponse.json(
        { error: { code: 'SYSTEM_DATABASE_ERROR', message: 'Failed to fetch songs' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ songs: data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
