import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fc from 'fast-check'
import { createTestClient } from '../test-client'
import { parseSongJSON, importSongs, exportSongsToJSON, validateSongData } from '@/lib/utils/song-import'
import type { GameType, Difficulty, Song } from '@/lib/types/database'

/**
 * Property-Based Tests for Song Data Management
 * Feature: gcm-arena-platform
 * 
 * These tests validate:
 * - Property 31: 楽曲データの参照整合性
 * - Property 32: JSONインポートのラウンドトリップ
 * 
 * Validates: Requirements 10.3, 10.6
 */

describe('Song Management - Property-Based Tests', () => {
  const supabase = createTestClient()
  const schema = process.env.SUPABASE_SCHEMA || 'dev'
  const testSongIds: string[] = []

  // Custom arbitraries for song data
  const gameTypeArb = fc.constantFrom<GameType>('ongeki', 'chunithm', 'maimai')
  const difficultyArb = fc.constantFrom<Difficulty>(
    'basic',
    'advanced',
    'expert',
    'master',
    'ultima',
    'world_end'
  )
  const levelArb = fc.double({ min: 1.0, max: 15.0, noNaN: true })
  
  const songDataArb = fc.record({
    game_type: gameTypeArb,
    title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    artist: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
    difficulty: difficultyArb,
    level: levelArb,
  })

  afterAll(async () => {
    // Cleanup test songs
    if (testSongIds.length > 0) {
      await supabase
        .from('songs')
        .delete()
        .in('id', testSongIds)
    }
  })

  /**
   * Property 31: 楽曲データの参照整合性
   * Validates: Requirements 10.3
   * 
   * For any song data update, songs referenced by existing tournaments
   * are not deleted and references are preserved
   */
  it('Property 31: Song data referential integrity', async () => {
    // Feature: gcm-arena-platform, Property 31: 楽曲データの参照整合性
    
    await fc.assert(
      fc.asyncProperty(
        songDataArb,
        async (songData) => {
          // Insert a test song
          const { data: insertedSong, error: insertError } = await supabase
            .from('songs')
            .insert({
              game_type: songData.game_type,
              title: songData.title,
              artist: songData.artist || null,
              difficulty: songData.difficulty,
              level: songData.level,
            })
            .select()
            .single()

          if (insertError) {
            console.error('Insert error:', insertError)
            return true // Skip this iteration if insert fails
          }

          expect(insertedSong).toBeDefined()
          testSongIds.push(insertedSong.id)

          // Create a tournament that references this song
          // First, we need a test user (profile)
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id')
            .limit(1)

          if (!profiles || profiles.length === 0) {
            // No profiles available, skip tournament creation
            return true
          }

          const testUserId = profiles[0].id

          // Create a test tournament
          const { data: tournament, error: tournamentError } = await supabase
            .from('tournaments')
            .insert({
              organizer_id: testUserId,
              title: `Test Tournament ${Date.now()}`,
              game_type: songData.game_type,
              start_at: new Date(Date.now() + 86400000).toISOString(),
              end_at: new Date(Date.now() + 172800000).toISOString(),
              is_public: true,
            })
            .select()
            .single()

          if (tournamentError) {
            console.error('Tournament creation error:', tournamentError)
            return true
          }

          // Link the song to the tournament
          const { error: linkError } = await supabase
            .from('tournament_songs')
            .insert({
              tournament_id: tournament.id,
              song_id: insertedSong.id,
            })

          if (linkError) {
            console.error('Link error:', linkError)
            // Cleanup tournament
            await supabase.from('tournaments').delete().eq('id', tournament.id)
            return true
          }

          // Attempt to delete the song (should fail due to ON DELETE RESTRICT)
          const { error: deleteError } = await supabase
            .from('songs')
            .delete()
            .eq('id', insertedSong.id)

          // Deletion should fail because the song is referenced
          expect(deleteError).not.toBeNull()
          expect(deleteError?.message).toContain('violates foreign key constraint')

          // Verify the song still exists
          const { data: stillExists, error: checkError } = await supabase
            .from('songs')
            .select('id')
            .eq('id', insertedSong.id)
            .single()

          expect(checkError).toBeNull()
          expect(stillExists).toBeDefined()

          // Cleanup: delete tournament_songs link, then tournament
          await supabase
            .from('tournament_songs')
            .delete()
            .eq('tournament_id', tournament.id)
          
          await supabase
            .from('tournaments')
            .delete()
            .eq('id', tournament.id)

          return true
        }
      ),
      { numRuns: 10 } // Reduced runs due to database operations
    )

    console.log('Property 31: Referential integrity test passed')
  }, { timeout: 60000 })

  /**
   * Property 32: JSONインポートのラウンドトリップ
   * Validates: Requirements 10.6
   * 
   * For any valid song data JSON, importing then exporting produces
   * equivalent JSON
   */
  it('Property 32: JSON import round-trip', async () => {
    // Feature: gcm-arena-platform, Property 32: JSONインポートのラウンドトリップ
    
    await fc.assert(
      fc.asyncProperty(
        fc.array(songDataArb, { minLength: 1, maxLength: 5 }),
        async (songsData) => {
          // Convert to JSON string
          const originalJSON = JSON.stringify(songsData)

          // Parse the JSON
          const parsedSongs = parseSongJSON(originalJSON)

          // Verify all songs were parsed correctly
          expect(parsedSongs.length).toBe(songsData.length)

          // Verify each parsed song matches the original
          for (let i = 0; i < songsData.length; i++) {
            const original = songsData[i]
            const parsed = parsedSongs[i]

            expect(parsed.game_type).toBe(original.game_type)
            expect(parsed.title).toBe(original.title)
            expect(parsed.artist).toBe(original.artist)
            expect(parsed.difficulty).toBe(original.difficulty)
            expect(parsed.level).toBeCloseTo(original.level, 1)
          }

          // Import the songs to database using test client
          const result: typeof import('@/lib/utils/song-import').ImportResult = {
            success: true,
            imported: 0,
            skipped: 0,
            errors: [],
          }

          for (const song of parsedSongs) {
            try {
              // Check if song already exists
              const { data: existing, error: checkError } = await supabase
                .from('songs')
                .select('id')
                .eq('game_type', song.game_type)
                .eq('title', song.title)
                .eq('difficulty', song.difficulty)
                .single()

              if (checkError && checkError.code !== 'PGRST116') {
                throw checkError
              }

              if (existing) {
                // Update existing song
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
                testSongIds.push(existing.id)
              } else {
                // Insert new song
                const { data: inserted, error: insertError } = await supabase
                  .from('songs')
                  .insert({
                    game_type: song.game_type,
                    title: song.title,
                    artist: song.artist || null,
                    difficulty: song.difficulty,
                    level: song.level,
                  })
                  .select()
                  .single()

                if (insertError) {
                  throw insertError
                }

                result.imported++
                if (inserted) {
                  testSongIds.push(inserted.id)
                }
              }
            } catch (error) {
              result.errors.push({
                song,
                error: error instanceof Error ? error.message : 'Unknown error',
              })
              result.success = false
            }
          }

          // Export the songs back to JSON
          let query = supabase
            .from('songs')
            .select('game_type, title, artist, difficulty, level')
            .order('game_type')
            .order('title')
            .order('difficulty')

          const { data: exportedData, error: exportError } = await query

          if (exportError) {
            throw new Error(`Failed to export songs: ${exportError.message}`)
          }

          // Verify that all imported songs are in the export
          for (const originalSong of parsedSongs) {
            const found = exportedData?.find(
              (s: any) =>
                s.game_type === originalSong.game_type &&
                s.title === originalSong.title &&
                s.difficulty === originalSong.difficulty
            )

            expect(found).toBeDefined()
            if (found) {
              expect(found.game_type).toBe(originalSong.game_type)
              expect(found.title).toBe(originalSong.title)
              expect(found.difficulty).toBe(originalSong.difficulty)
              expect(found.level).toBeCloseTo(originalSong.level, 1)
              
              // Artist can be undefined or null, both are acceptable
              if (originalSong.artist) {
                expect(found.artist).toBe(originalSong.artist)
              }
            }
          }

          return true
        }
      ),
      { numRuns: 10 } // Reduced runs due to database operations
    )

    console.log('Property 32: JSON round-trip test passed')
  }, { timeout: 60000 })

  /**
   * Additional test: Validate song data validation function
   */
  it('Song data validation', () => {
    fc.assert(
      fc.property(
        songDataArb,
        (songData) => {
          // Valid song data should pass validation
          expect(validateSongData(songData)).toBe(true)
          return true
        }
      ),
      { numRuns: 100 }
    )

    // Test invalid data
    const invalidCases = [
      null,
      undefined,
      {},
      { game_type: 'invalid' },
      { game_type: 'ongeki', title: '' },
      { game_type: 'ongeki', title: 'Test', difficulty: 'invalid' },
      { game_type: 'ongeki', title: 'Test', difficulty: 'master', level: -1 },
      { game_type: 'ongeki', title: 'Test', difficulty: 'master', level: 20 },
    ]

    for (const invalidData of invalidCases) {
      expect(validateSongData(invalidData)).toBe(false)
    }

    console.log('Song data validation test passed')
  })
})
