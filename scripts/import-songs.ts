#!/usr/bin/env tsx

/**
 * 楽曲データバッチインポートスクリプト
 * 
 * 使用方法:
 *   npx tsx scripts/import-songs.ts <json-file-path>
 * 
 * 例:
 *   npx tsx scripts/import-songs.ts data/songs.json
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import { parseSongJSON, type SongImportData, type ImportResult } from '../src/lib/utils/song-import'

// Load environment variables
import { config } from 'dotenv'
config({ path: '.env.local' })

/**
 * 楽曲データをデータベースにインポート（スクリプト用）
 */
async function importSongsScript(songs: SongImportData[]): Promise<ImportResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const schema = process.env.SUPABASE_SCHEMA || 'dev'

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }

  console.log(`Using ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service role' : 'anon'} key`)
  console.log(`Target schema: ${schema}`)

  // Service role key bypasses RLS, so we can use it without schema restriction
  const supabase = createClient(supabaseUrl, supabaseKey, {
    db: { schema }
  })

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
        .maybeSingle()

      if (checkError) {
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
        console.log(`  ⏭️  Skipped: ${song.title} (${song.game_type} - ${song.difficulty})`)
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
        console.log(`  ✅ Imported: ${song.title} (${song.game_type} - ${song.difficulty})`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error)
      result.errors.push({
        song,
        error: errorMessage,
      })
      result.success = false
      console.log(`  ❌ Error: ${song.title} (${song.game_type} - ${song.difficulty}): ${errorMessage}`)
    }
  }

  return result
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.error('Usage: npx tsx scripts/import-songs.ts <json-file-path>')
    process.exit(1)
  }

  const filePath = resolve(args[0])

  try {
    console.log(`Reading song data from: ${filePath}`)
    const jsonContent = readFileSync(filePath, 'utf-8')

    console.log('Parsing JSON...')
    const songs = parseSongJSON(jsonContent)
    console.log(`Found ${songs.length} songs to import\n`)

    console.log('Importing songs...')
    const result = await importSongsScript(songs)

    console.log('\n=== Import Result ===')
    console.log(`Success: ${result.success}`)
    console.log(`Imported: ${result.imported}`)
    console.log(`Skipped (already exists): ${result.skipped}`)
    console.log(`Errors: ${result.errors.length}`)

    if (result.errors.length > 0) {
      console.log('\n=== Errors ===')
      result.errors.forEach((err, index) => {
        console.log(`\n${index + 1}. ${err.song.title} (${err.song.game_type} - ${err.song.difficulty})`)
        console.log(`   Error: ${err.error}`)
      })
    }

    if (!result.success) {
      process.exit(1)
    }
  } catch (error) {
    console.error('Failed to import songs:', error)
    process.exit(1)
  }
}

main()
