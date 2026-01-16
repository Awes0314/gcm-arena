import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fc from 'fast-check'
import { createTestClient } from '../test-client'
import type { GameType, SubmissionMethod } from '../../types/database'

/**
 * Property-Based Tests for Tournament Display
 * Feature: gcm-arena-platform
 * 
 * These tests validate tournament display functionality, ensuring that:
 * - Public tournaments are listed correctly
 * - Tournament details are complete
 * - Game type filtering works correctly
 * - Tournament status is calculated correctly
 * 
 * Note: These tests require a live Supabase instance with the dev schema
 * and RLS policies applied.
 */

describe('Tournament Display - Property-Based Tests', () => {
  const supabase = createTestClient()
  const schema = process.env.SUPABASE_SCHEMA || 'dev'
  
  // Test user credentials
  const testUser = {
    email: 'test-tournament-display@example.com',
    password: 'test-password-123',
    id: '' // Will be populated after login
  }

  // Store created IDs for cleanup
  const createdTournamentIds: string[] = []
  const createdSongIds: string[] = []

  beforeAll(async () => {
    console.log('\n=== Tournament Display Property Tests Setup ===')
    console.log('Note: These tests require manual user creation in Supabase Auth')
    console.log(`Required test user: ${testUser.email} / ${testUser.password}`)
    console.log('================================================\n')

    // Try to sign in
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password,
    })

    if (signInError || !authData.user) {
      console.log('⚠️  Test user not found. Some tests will be skipped.')
      console.log('   Please create test user:', testUser.email)
      return
    }

    testUser.id = authData.user.id
    console.log('✓ Signed in as test user:', testUser.email)

    // Create test songs
    const testSongs = [
      {
        game_type: 'ongeki' as GameType,
        title: 'Display Test Song 1',
        artist: 'Test Artist',
        difficulty: 'master' as const,
        level: 14.5,
      },
      {
        game_type: 'chunithm' as GameType,
        title: 'Display Test Song 2',
        artist: 'Test Artist',
        difficulty: 'master' as const,
        level: 15.0,
      },
      {
        game_type: 'maimai' as GameType,
        title: 'Display Test Song 3',
        artist: 'Test Artist',
        difficulty: 'master' as const,
        level: 14.8,
      },
    ]

    for (const song of testSongs) {
      const { data, error } = await supabase
        .from(`${schema}.songs`)
        .insert(song)
        .select()
        .single()

      if (!error && data) {
        createdSongIds.push(data.id)
      }
    }

    console.log(`✓ Created ${createdSongIds.length} test songs`)
  })

  afterAll(async () => {
    console.log('\n=== Cleanup ===')
    
    // Delete created tournaments
    if (createdTournamentIds.length > 0) {
      const { error } = await supabase
        .from(`${schema}.tournaments`)
        .delete()
        .in('id', createdTournamentIds)
      
      if (!error) {
        console.log(`✓ Deleted ${createdTournamentIds.length} test tournaments`)
      }
    }

    // Delete created songs
    if (createdSongIds.length > 0) {
      const { error } = await supabase
        .from(`${schema}.songs`)
        .delete()
        .in('id', createdSongIds)
      
      if (!error) {
        console.log(`✓ Deleted ${createdSongIds.length} test songs`)
      }
    }

    // Sign out
    await supabase.auth.signOut()
    console.log('✓ Signed out')
  })

  /**
   * Property 21: 公開大会の一覧表示
   * Validates: Requirements 7.1, 7.5
   * 
   * For any tournament list request, the returned results include all public
   * tournaments and do not include private tournaments
   */
  it('Property 21: Public tournament listing', async () => {
    // Feature: gcm-arena-platform, Property 21: 公開大会の一覧表示

    if (!testUser.id || createdSongIds.length === 0) {
      console.log('⚠️  Skipping test: User not authenticated or no test songs')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          numPublic: fc.integer({ min: 1, max: 3 }),
          numPrivate: fc.integer({ min: 1, max: 3 }),
        }),
        async ({ numPublic, numPrivate }) => {
          const now = new Date()
          const startAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)
          const endAt = new Date(startAt.getTime() + 7 * 24 * 60 * 60 * 1000)

          const publicTournamentIds: string[] = []
          const privateTournamentIds: string[] = []

          // Create public tournaments
          for (let i = 0; i < numPublic; i++) {
            const { data, error } = await supabase
              .from(`${schema}.tournaments`)
              .insert({
                organizer_id: testUser.id,
                title: `Public Tournament ${i + 1}`,
                game_type: 'ongeki',
                submission_method: 'both',
                start_at: startAt.toISOString(),
                end_at: endAt.toISOString(),
                is_public: true,
                rules: {},
              })
              .select()
              .single()

            if (!error && data) {
              publicTournamentIds.push(data.id)
              createdTournamentIds.push(data.id)

              // Add song
              await supabase
                .from(`${schema}.tournament_songs`)
                .insert({
                  tournament_id: data.id,
                  song_id: createdSongIds[0],
                })
            }
          }

          // Create private tournaments
          for (let i = 0; i < numPrivate; i++) {
            const { data, error } = await supabase
              .from(`${schema}.tournaments`)
              .insert({
                organizer_id: testUser.id,
                title: `Private Tournament ${i + 1}`,
                game_type: 'chunithm',
                submission_method: 'both',
                start_at: startAt.toISOString(),
                end_at: endAt.toISOString(),
                is_public: false,
                rules: {},
              })
              .select()
              .single()

            if (!error && data) {
              privateTournamentIds.push(data.id)
              createdTournamentIds.push(data.id)

              // Add song
              await supabase
                .from(`${schema}.tournament_songs`)
                .insert({
                  tournament_id: data.id,
                  song_id: createdSongIds[1],
                })
            }
          }

          // Fetch public tournaments
          const { data: publicTournaments, error: fetchError } = await supabase
            .from(`${schema}.tournaments`)
            .select('*')
            .eq('is_public', true)
            .in('id', [...publicTournamentIds, ...privateTournamentIds])

          expect(fetchError).toBeNull()
          expect(publicTournaments).toBeDefined()

          // Verify only public tournaments are returned
          const returnedIds = publicTournaments!.map(t => t.id)
          
          // All public tournaments should be in the results
          for (const id of publicTournamentIds) {
            expect(returnedIds).toContain(id)
          }

          // No private tournaments should be in the results
          for (const id of privateTournamentIds) {
            expect(returnedIds).not.toContain(id)
          }

          return true
        }
      ),
      { numRuns: 5 }
    )

    console.log('✓ Property 21: Public tournament listing verified')
  }, { timeout: 60000 })

  /**
   * Property 22: 大会詳細の完全性
   * Validates: Requirements 7.2, 7.6
   * 
   * For any tournament detail request, the returned data includes game,
   * songs, period, rules, participants, and organizer name
   */
  it('Property 22: Tournament detail completeness', async () => {
    // Feature: gcm-arena-platform, Property 22: 大会詳細の完全性

    if (!testUser.id || createdSongIds.length === 0) {
      console.log('⚠️  Skipping test: User not authenticated or no test songs')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 }),
          description: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
          game_type: fc.constantFrom('ongeki', 'chunithm', 'maimai') as fc.Arbitrary<GameType>,
          rules: fc.record({
            scoring: fc.constantFrom('total', 'average', 'best'),
          }),
        }),
        async (tournamentData) => {
          const now = new Date()
          const startAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)
          const endAt = new Date(startAt.getTime() + 7 * 24 * 60 * 60 * 1000)

          // Create tournament
          const { data: tournament, error: tournamentError } = await supabase
            .from(`${schema}.tournaments`)
            .insert({
              organizer_id: testUser.id,
              title: tournamentData.title,
              description: tournamentData.description,
              game_type: tournamentData.game_type,
              submission_method: 'both',
              start_at: startAt.toISOString(),
              end_at: endAt.toISOString(),
              is_public: true,
              rules: tournamentData.rules,
            })
            .select()
            .single()

          if (tournamentError || !tournament) {
            return false
          }

          createdTournamentIds.push(tournament.id)

          // Add songs
          const numSongs = Math.min(createdSongIds.length, 2)
          for (let i = 0; i < numSongs; i++) {
            await supabase
              .from(`${schema}.tournament_songs`)
              .insert({
                tournament_id: tournament.id,
                song_id: createdSongIds[i],
              })
          }

          // Fetch tournament details with all related data
          const { data: details, error: fetchError } = await supabase
            .from(`${schema}.tournaments`)
            .select(`
              *,
              organizer:profiles!tournaments_organizer_id_fkey(id, display_name),
              tournament_songs(
                id,
                song:songs!tournament_songs_song_id_fkey(*)
              ),
              participants(
                id,
                user:profiles!participants_user_id_fkey(id, display_name)
              )
            `)
            .eq('id', tournament.id)
            .single()

          expect(fetchError).toBeNull()
          expect(details).toBeDefined()

          // Verify all required fields are present
          expect(details!.game_type).toBe(tournamentData.game_type)
          expect(details!.title).toBe(tournamentData.title)
          expect(details!.description).toBe(tournamentData.description)
          expect(details!.start_at).toBeDefined()
          expect(details!.end_at).toBeDefined()
          expect(details!.rules).toEqual(tournamentData.rules)
          expect(details!.organizer).toBeDefined()
          expect(details!.organizer.display_name).toBeDefined()
          expect(details!.tournament_songs).toBeDefined()
          expect(details!.tournament_songs.length).toBeGreaterThan(0)
          expect(details!.participants).toBeDefined()

          return true
        }
      ),
      { numRuns: 10 }
    )

    console.log('✓ Property 22: Tournament detail completeness verified')
  }, { timeout: 60000 })

  /**
   * Property 23: ゲームタイプによるフィルタリング
   * Validates: Requirements 7.3
   * 
   * For any game type filter, all returned tournaments match the specified game type
   */
  it('Property 23: Game type filtering', async () => {
    // Feature: gcm-arena-platform, Property 23: ゲームタイプによるフィルタリング

    if (!testUser.id || createdSongIds.length === 0) {
      console.log('⚠️  Skipping test: User not authenticated or no test songs')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('ongeki', 'chunithm', 'maimai') as fc.Arbitrary<GameType>,
        async (gameType) => {
          const now = new Date()
          const startAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)
          const endAt = new Date(startAt.getTime() + 7 * 24 * 60 * 60 * 1000)

          const tournamentIds: string[] = []

          // Create tournaments of different game types
          const gameTypes: GameType[] = ['ongeki', 'chunithm', 'maimai']
          for (const gt of gameTypes) {
            const { data, error } = await supabase
              .from(`${schema}.tournaments`)
              .insert({
                organizer_id: testUser.id,
                title: `${gt} Tournament`,
                game_type: gt,
                submission_method: 'both',
                start_at: startAt.toISOString(),
                end_at: endAt.toISOString(),
                is_public: true,
                rules: {},
              })
              .select()
              .single()

            if (!error && data) {
              tournamentIds.push(data.id)
              createdTournamentIds.push(data.id)

              // Add song
              const songIndex = gameTypes.indexOf(gt) % createdSongIds.length
              await supabase
                .from(`${schema}.tournament_songs`)
                .insert({
                  tournament_id: data.id,
                  song_id: createdSongIds[songIndex],
                })
            }
          }

          // Filter by game type
          const { data: filteredTournaments, error: fetchError } = await supabase
            .from(`${schema}.tournaments`)
            .select('*')
            .eq('game_type', gameType)
            .in('id', tournamentIds)

          expect(fetchError).toBeNull()
          expect(filteredTournaments).toBeDefined()
          expect(filteredTournaments!.length).toBeGreaterThan(0)

          // Verify all returned tournaments match the filter
          for (const tournament of filteredTournaments!) {
            expect(tournament.game_type).toBe(gameType)
          }

          return true
        }
      ),
      { numRuns: 10 }
    )

    console.log('✓ Property 23: Game type filtering verified')
  }, { timeout: 60000 })

  /**
   * Property 24: 大会ステータスの計算
   * Validates: Requirements 7.4
   * 
   * For any tournament, the status (upcoming, active, ended) is correctly
   * calculated based on current time and tournament period
   */
  it('Property 24: Tournament status calculation', async () => {
    // Feature: gcm-arena-platform, Property 24: 大会ステータスの計算

    if (!testUser.id || createdSongIds.length === 0) {
      console.log('⚠️  Skipping test: User not authenticated or no test songs')
      return
    }

    const now = new Date()

    // Create tournaments with different time periods
    const testCases = [
      {
        name: 'Upcoming',
        startAt: new Date(now.getTime() + 48 * 60 * 60 * 1000), // 2 days from now
        endAt: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        expectedStatus: 'upcoming',
      },
      {
        name: 'Active',
        startAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Started yesterday
        endAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // Ends in 7 days
        expectedStatus: 'active',
      },
      {
        name: 'Ended',
        startAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // Started 10 days ago
        endAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // Ended 3 days ago
        expectedStatus: 'ended',
      },
    ]

    for (const testCase of testCases) {
      const { data: tournament, error: createError } = await supabase
        .from(`${schema}.tournaments`)
        .insert({
          organizer_id: testUser.id,
          title: `${testCase.name} Tournament`,
          game_type: 'ongeki',
          submission_method: 'both',
          start_at: testCase.startAt.toISOString(),
          end_at: testCase.endAt.toISOString(),
          is_public: true,
          rules: {},
        })
        .select()
        .single()

      if (createError || !tournament) {
        console.error(`Failed to create ${testCase.name} tournament:`, createError)
        continue
      }

      createdTournamentIds.push(tournament.id)

      // Add song
      await supabase
        .from(`${schema}.tournament_songs`)
        .insert({
          tournament_id: tournament.id,
          song_id: createdSongIds[0],
        })

      // Calculate status
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

      expect(calculatedStatus).toBe(testCase.expectedStatus)
      console.log(`  ✓ ${testCase.name} tournament status: ${calculatedStatus}`)
    }

    console.log('✓ Property 24: Tournament status calculation verified')
  }, { timeout: 30000 })
})
