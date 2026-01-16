import { GameType, Difficulty, Song } from '@/lib/types/database'
import { createClient } from '@/lib/supabase/server'

/**
 * JSON形式の楽曲データ
 */
export interface SongImportData {
  game_type: GameType
  title: string
  artist?: string
  difficulty: Difficulty
  level: number
}

/**
 * インポート結果
 */
export interface ImportResult {
  success: boolean
  imported: number
  skipped: number
  errors: Array<{ song: SongImportData; error: string }>
}

/**
 * 楽曲データのバリデーション
 */
export function validateSongData(data: unknown): data is SongImportData {
  if (typeof data !== 'object' || data === null) {
    return false
  }

  const song = data as Record<string, unknown>

  // game_type のバリデーション
  const validGameTypes: GameType[] = ['ongeki', 'chunithm', 'maimai']
  if (!validGameTypes.includes(song.game_type as GameType)) {
    return false
  }

  // title のバリデーション (空文字列や空白のみは不可)
  if (typeof song.title !== 'string' || song.title.trim().length === 0) {
    return false
  }

  // artist のバリデーション（オプショナル）
  if (song.artist !== undefined && typeof song.artist !== 'string') {
    return false
  }

  // difficulty のバリデーション
  const validDifficulties: Difficulty[] = [
    'basic',
    'advanced',
    'expert',
    'master',
    'ultima',
    'world_end',
  ]
  if (!validDifficulties.includes(song.difficulty as Difficulty)) {
    return false
  }

  // level のバリデーション
  if (typeof song.level !== 'number' || song.level < 0 || song.level > 15) {
    return false
  }

  return true
}

/**
 * JSONファイルから楽曲データをパース
 */
export function parseSongJSON(jsonContent: string): SongImportData[] {
  try {
    const data = JSON.parse(jsonContent)

    if (!Array.isArray(data)) {
      throw new Error('JSON data must be an array')
    }

    const songs: SongImportData[] = []
    const errors: string[] = []

    for (let i = 0; i < data.length; i++) {
      if (validateSongData(data[i])) {
        songs.push(data[i])
      } else {
        errors.push(`Invalid song data at index ${i}`)
      }
    }

    if (errors.length > 0) {
      console.warn('Validation errors:', errors)
    }

    return songs
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * 楽曲データをデータベースにインポート
 */
export async function importSongs(songs: SongImportData[]): Promise<ImportResult> {
  const supabase = await createClient()

  const result: ImportResult = {
    success: true,
    imported: 0,
    skipped: 0,
    errors: [],
  }

  for (const song of songs) {
    try {
      // 既存の楽曲をチェック（game_type, title, difficulty の組み合わせ）
      const { data: existing, error: checkError } = await supabase
        .from('songs')
        .select('id')
        .eq('game_type', song.game_type)
        .eq('title', song.title)
        .eq('difficulty', song.difficulty)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 = not found (expected)
        throw checkError
      }

      if (existing) {
        // 既存の楽曲を更新
        const { error: updateError } = await supabase
          .from('songs')
          .update({
            artist: song.artist || null,
            level: song.level,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)

        if (updateError) {
          throw updateError
        }

        result.skipped++
      } else {
        // 新規楽曲を挿入
        const { error: insertError } = await supabase
          .from('songs')
          .insert({
            game_type: song.game_type,
            title: song.title,
            artist: song.artist || null,
            difficulty: song.difficulty,
            level: song.level,
          })

        if (insertError) {
          throw insertError
        }

        result.imported++
      }
    } catch (error) {
      result.errors.push({
        song,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      result.success = false
    }
  }

  return result
}

/**
 * JSONファイルから楽曲データをインポート（パース + インポート）
 */
export async function importSongsFromJSON(jsonContent: string): Promise<ImportResult> {
  const songs = parseSongJSON(jsonContent)
  return importSongs(songs)
}

/**
 * 楽曲データをJSONにエクスポート
 */
export async function exportSongsToJSON(gameType?: GameType): Promise<string> {
  const supabase = await createClient()

  let query = supabase
    .from('songs')
    .select('game_type, title, artist, difficulty, level')
    .order('game_type')
    .order('title')
    .order('difficulty')

  if (gameType) {
    query = query.eq('game_type', gameType)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to export songs: ${error.message}`)
  }

  const exportData = data.map((song) => ({
    game_type: song.game_type,
    title: song.title,
    artist: song.artist || undefined,
    difficulty: song.difficulty,
    level: song.level,
  }))

  return JSON.stringify(exportData, null, 2)
}
