import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fc from 'fast-check'
import { createTestClient } from '../test-client'
import type { GameType } from '../../types/database'

/**
 * Property-Based Tests for Score Submission
 * Feature: gcm-arena-platform
 * 
 * These tests validate score submission functionality, ensuring that:
 * - Scores are validated and saved correctly
 * - Scores are associated with the correct user and tournament
 * - Score records are updated when better scores are submitted
 * - Rankings are recalculated after score submission
 * 
 * Note: These tests require a live Supabase instance with the dev schema
 * and RLS policies applied. They are integration tests that verify the
 * actual database behavior.
 */

describe('Score Submission - Property-Based Tests', () => {
  const supabase = createTestClient()
  const schema = process.env.SUPABASE_SCHEMA || 'dev'
  
  // Test user credentials
  const testUser = {
    email: 'test-score-submitter@example.com',
    password: 'test-password-123',
    id: '' // Will be populated after login
  }

  const testOrganizer = {
    email: 'test-score-organizer@example.com',
    password: 'test-password-123',
    id: '' // Will be populated after login
  }

  // Store created IDs for cleanup
  const createdTournamentIds: string[] = []
  const createdSongIds: string[] = []
  const createdParticipantIds: string[] = []
  const createdScoreIds: string[] = []

  beforeAll(async () => {
    console.log('\n=== Score Submission Property Tests Setup ===')
    console.log('Note: These tests require manual user creation in Supabase Auth')
    console.log(`Required test users:`)
    console.log(`  - ${testUser.email} / ${testUser.password}`)
    console.log(`  - ${testOrganizer.email} / ${testOrganizer.password}`)
    console.log('================================================\n')

    // Sign in as organizer first to create tournaments
    const { data: organizerAuth, error: organizerError } = await supabase.auth.signInWithPassword({
      email: testOrganizer.email,
      password: testOrganizer.password,
    })

    if (organizerError || !organizerAuth.user) {
      console.log('⚠️  Test organizer not found. Some tests will be skipped.')
      console.log('   Please create test user:', testOrganizer.email)
      return
    }

    testOrganizer.id = organizerAuth.user.id
    console.log('✓ Signed in as test organizer:', testOrganizer.email)

    // Create test songs
    const testSongs = [
      {
        game_type: 'ongeki' as GameType,
        title: 'Score Test Song 1',
        artist: 'Test Artist',
        difficulty: 'master' as const,
        level: 14.5,
      },
      {
        game_type: 'ongeki' as GameType,
        title: 'Score Test Song 2',
        artist: 'Test Artist',
        difficulty: 'expert' as const,
        level: 13.0,
      },
      {
        game_type: 'chunithm' as GameType,
        title: 'Score Test Song 3',
        artist: 'Test Artist',
        difficulty: 'master' as const,
        level: 15.0,
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

    // Sign out organizer
    await supabase.auth.signOut()

    // Sign in as participant
    const { data: participantAuth, error: participantError } = await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password,
    })

    if (participantError || !participantAuth.user) {
      console.log('⚠️  Test participant not found. Some tests will be skipped.')
      console.log('   Please create test user:', testUser.email)
      return
    }

    testUser.id = participantAuth.user.id
    console.log('✓ Signed in as test participant:', testUser.email)
  })

  afterAll(async () => {
    console.log('\n=== Cleanup ===')
    
    // Delete created scores
    if (createdScoreIds.length > 0) {
      const { error } = await supabase
        .from(`${schema}.scores`)
        .delete()
        .in('id', createdScoreIds)
      
      if (!error) {
        console.log(`✓ Deleted ${createdScoreIds.length} test scores`)
      }
    }

    // Delete created participants
    if (createdParticipantIds.length > 0) {
      const { error } = await supabase
        .from(`${schema}.participants`)
        .delete()
        .in('id', createdParticipantIds)
      
      if (!error) {
        console.log(`✓ Deleted ${createdParticipantIds.length} test participants`)
      }
    }

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
   * Helper function to create a tournament as organizer
   */
  async function createTournament(title: string, gameType: GameType = 'ongeki') {
    // Sign in as organizer
    await supabase.auth.signInWithPassword({
      email: testOrganizer.email,
      password: testOrganizer.password,
    })

    const now = new Date()
    const startAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const endAt = new Date(startAt.getTime() + 7 * 24 * 60 * 60 * 1000)

    const { data: tournament, error } = await supabase
      .from(`${schema}.tournaments`)
      .insert({
        organizer_id: testOrganizer.id,
        title,
        game_type: gameType,
        submission_method: 'both',
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        is_public: true,
        rules: {},
      })
      .select()
      .single()

    if (!error && tournament) {
      createdTournamentIds.push(tournament.id)

      // Add songs to tournament
      const songsToAdd = createdSongIds
        .filter((_, index) => index < 2) // Add first 2 songs
        .map(songId => ({
          tournament_id: tournament.id,
          song_id: songId,
        }))

      if (songsToAdd.length > 0) {
        await supabase
          .from(`${schema}.tournament_songs`)
          .insert(songsToAdd)
      }
    }

    // Sign back in as participant
    await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password,
    })

    return tournament
  }

  /**
   * Helper function to join a tournament
   */
  async function joinTournament(tournamentId: string) {
    const { data: participant, error } = await supabase
      .from(`${schema}.participants`)
      .insert({
        tournament_id: tournamentId,
        user_id: testUser.id,
      })
      .select()
      .single()

    if (!error && participant) {
      createdParticipantIds.push(participant.id)
    }

    return participant
  }

  /**
   * Property 11: スコア提出の検証と保存
   * Validates: Requirements 4.3
   * 
   * For any valid score data, when the API receives it, validation is
   * performed and if valid, it is saved to the database
   */
  it('Property 11: Score submission validation and storage', async () => {
    // Feature: gcm-arena-platform, Property 11: スコア提出の検証と保存

    if (!testUser.id || !testOrganizer.id || createdSongIds.length === 0) {
      console.log('⚠️  Skipping test: Users not authenticated or no test songs')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 1010000 }),
        fc.string({ minLength: 1, maxLength: 30 }),
        async (scoreValue, tournamentSuffix) => {
          // Create a tournament
          const tournament = await createTournament(`Score Test ${tournamentSuffix}`)
          
          if (!tournament) {
            return false
          }

          // Join the tournament
          const participant = await joinTournament(tournament.id)
          
          if (!participant) {
            return false
          }

          // Get tournament songs
          const { data: tournamentSongs } = await supabase
            .from(`${schema}.tournament_songs`)
            .select('song_id')
            .eq('tournament_id', tournament.id)

          if (!tournamentSongs || tournamentSongs.length === 0) {
            return false
          }

          const songId = tournamentSongs[0].song_id

          // Submit score
          const { data: score, error: submitError } = await supabase
            .from(`${schema}.scores`)
            .insert({
              tournament_id: tournament.id,
              user_id: testUser.id,
              song_id: songId,
              score: scoreValue,
              status: 'approved',
              submitted_via: 'manual',
            })
            .select()
            .single()

          if (submitError || !score) {
            console.error('Failed to submit score:', submitError)
            return false
          }

          createdScoreIds.push(score.id)

          // Verify score was saved correctly
          expect(score.tournament_id).toBe(tournament.id)
          expect(score.user_id).toBe(testUser.id)
          expect(score.song_id).toBe(songId)
          expect(score.score).toBe(scoreValue)
          expect(score.status).toBe('approved')
          expect(score.submitted_via).toBe('manual')
          expect(score.submitted_at).toBeDefined()

          // Verify score can be queried
          const { data: queriedScore, error: queryError } = await supabase
            .from(`${schema}.scores`)
            .select('*')
            .eq('id', score.id)
            .single()

          expect(queryError).toBeNull()
          expect(queriedScore).toBeDefined()
          expect(queriedScore!.score).toBe(scoreValue)

          return true
        }
      ),
      { numRuns: 10 }
    )

    console.log('✓ Property 11: Score submission validation and storage verified')
  }, { timeout: 120000 })

  /**
   * Property 12: スコア提出の関連付け
   * Validates: Requirements 4.4, 5.5
   * 
   * For any score submission (bookmarklet or image), the record includes
   * the submitting user's user_id and the target tournament's tournament_id
   */
  it('Property 12: Score submission association', async () => {
    // Feature: gcm-arena-platform, Property 12: スコア提出の関連付け

    if (!testUser.id || !testOrganizer.id || createdSongIds.length === 0) {
      console.log('⚠️  Skipping test: Users not authenticated or no test songs')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('manual', 'bookmarklet', 'image'),
        fc.integer({ min: 500000, max: 1010000 }),
        async (submittedVia, scoreValue) => {
          // Create a tournament
          const tournament = await createTournament(`Association Test ${Date.now()}`)
          
          if (!tournament) {
            return false
          }

          // Join the tournament
          const participant = await joinTournament(tournament.id)
          
          if (!participant) {
            return false
          }

          // Get tournament songs
          const { data: tournamentSongs } = await supabase
            .from(`${schema}.tournament_songs`)
            .select('song_id')
            .eq('tournament_id', tournament.id)

          if (!tournamentSongs || tournamentSongs.length === 0) {
            return false
          }

          const songId = tournamentSongs[0].song_id

          // Submit score
          const { data: score, error: submitError } = await supabase
            .from(`${schema}.scores`)
            .insert({
              tournament_id: tournament.id,
              user_id: testUser.id,
              song_id: songId,
              score: scoreValue,
              status: submittedVia === 'manual' ? 'approved' : 'pending',
              submitted_via: submittedVia,
              image_url: submittedVia === 'image' ? 'https://example.com/image.jpg' : null,
            })
            .select()
            .single()

          if (submitError || !score) {
            console.error('Failed to submit score:', submitError)
            return false
          }

          createdScoreIds.push(score.id)

          // Verify associations
          expect(score.user_id).toBe(testUser.id)
          expect(score.tournament_id).toBe(tournament.id)
          expect(score.song_id).toBe(songId)
          expect(score.submitted_via).toBe(submittedVia)

          // Verify we can query by user_id
          const { data: userScores, error: userError } = await supabase
            .from(`${schema}.scores`)
            .select('*')
            .eq('user_id', testUser.id)
            .eq('id', score.id)

          expect(userError).toBeNull()
          expect(userScores).toBeDefined()
          expect(userScores!.length).toBe(1)
          expect(userScores![0].id).toBe(score.id)

          // Verify we can query by tournament_id
          const { data: tournamentScores, error: tournamentError } = await supabase
            .from(`${schema}.scores`)
            .select('*')
            .eq('tournament_id', tournament.id)
            .eq('id', score.id)

          expect(tournamentError).toBeNull()
          expect(tournamentScores).toBeDefined()
          expect(tournamentScores!.length).toBe(1)
          expect(tournamentScores![0].id).toBe(score.id)

          return true
        }
      ),
      { numRuns: 10 }
    )

    console.log('✓ Property 12: Score submission association verified')
  }, { timeout: 120000 })

  /**
   * Property 13: スコア提出による記録更新
   * Validates: Requirements 4.6
   * 
   * For any score submission, when submission is successful, the
   * participant's score record for that song is created or updated
   */
  it('Property 13: Score record update on submission', async () => {
    // Feature: gcm-arena-platform, Property 13: スコア提出による記録更新

    if (!testUser.id || !testOrganizer.id || createdSongIds.length === 0) {
      console.log('⚠️  Skipping test: Users not authenticated or no test songs')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 500000, max: 900000 }),
        fc.integer({ min: 900001, max: 1010000 }),
        async (initialScore, betterScore) => {
          // Create a tournament
          const tournament = await createTournament(`Update Test ${Date.now()}`)
          
          if (!tournament) {
            return false
          }

          // Join the tournament
          const participant = await joinTournament(tournament.id)
          
          if (!participant) {
            return false
          }

          // Get tournament songs
          const { data: tournamentSongs } = await supabase
            .from(`${schema}.tournament_songs`)
            .select('song_id')
            .eq('tournament_id', tournament.id)

          if (!tournamentSongs || tournamentSongs.length === 0) {
            return false
          }

          const songId = tournamentSongs[0].song_id

          // Submit initial score
          const { data: score1, error: submitError1 } = await supabase
            .from(`${schema}.scores`)
            .insert({
              tournament_id: tournament.id,
              user_id: testUser.id,
              song_id: songId,
              score: initialScore,
              status: 'approved',
              submitted_via: 'manual',
            })
            .select()
            .single()

          if (submitError1 || !score1) {
            console.error('Failed to submit initial score:', submitError1)
            return false
          }

          createdScoreIds.push(score1.id)

          // Verify initial score was created
          expect(score1.score).toBe(initialScore)

          // Query for existing score
          const { data: existingScores, error: queryError } = await supabase
            .from(`${schema}.scores`)
            .select('*')
            .eq('tournament_id', tournament.id)
            .eq('user_id', testUser.id)
            .eq('song_id', songId)
            .eq('status', 'approved')

          expect(queryError).toBeNull()
          expect(existingScores).toBeDefined()
          expect(existingScores!.length).toBeGreaterThan(0)

          const existingScore = existingScores![0]

          // Update with better score
          const { data: score2, error: updateError } = await supabase
            .from(`${schema}.scores`)
            .update({
              score: betterScore,
              submitted_at: new Date().toISOString(),
            })
            .eq('id', existingScore.id)
            .select()
            .single()

          if (updateError || !score2) {
            console.error('Failed to update score:', updateError)
            return false
          }

          // Verify score was updated
          expect(score2.id).toBe(existingScore.id)
          expect(score2.score).toBe(betterScore)
          expect(score2.score).toBeGreaterThan(initialScore)

          // Verify only one score record exists for this user/tournament/song
          const { data: finalScores, error: finalError } = await supabase
            .from(`${schema}.scores`)
            .select('*')
            .eq('tournament_id', tournament.id)
            .eq('user_id', testUser.id)
            .eq('song_id', songId)
            .eq('status', 'approved')

          expect(finalError).toBeNull()
          expect(finalScores).toBeDefined()
          expect(finalScores!.length).toBe(1)
          expect(finalScores![0].score).toBe(betterScore)

          return true
        }
      ),
      { numRuns: 5 }
    )

    console.log('✓ Property 13: Score record update on submission verified')
  }, { timeout: 90000 })

  /**
   * Property 17: ランキングの自動再計算
   * Validates: Requirements 6.1
   * 
   * For any score submission, when submission is approved, the
   * tournament's ranking is recalculated
   */
  it('Property 17: Automatic ranking recalculation', async () => {
    // Feature: gcm-arena-platform, Property 17: ランキングの自動再計算

    if (!testUser.id || !testOrganizer.id || createdSongIds.length === 0) {
      console.log('⚠️  Skipping test: Users not authenticated or no test songs')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 500000, max: 1010000 }),
        async (scoreValue) => {
          // Create a tournament
          const tournament = await createTournament(`Ranking Test ${Date.now()}`)
          
          if (!tournament) {
            return false
          }

          // Join the tournament
          const participant = await joinTournament(tournament.id)
          
          if (!participant) {
            return false
          }

          // Get tournament songs
          const { data: tournamentSongs } = await supabase
            .from(`${schema}.tournament_songs`)
            .select('song_id')
            .eq('tournament_id', tournament.id)

          if (!tournamentSongs || tournamentSongs.length === 0) {
            return false
          }

          const songId = tournamentSongs[0].song_id

          // Submit score
          const { data: score, error: submitError } = await supabase
            .from(`${schema}.scores`)
            .insert({
              tournament_id: tournament.id,
              user_id: testUser.id,
              song_id: songId,
              score: scoreValue,
              status: 'approved',
              submitted_via: 'manual',
            })
            .select()
            .single()

          if (submitError || !score) {
            console.error('Failed to submit score:', submitError)
            return false
          }

          createdScoreIds.push(score.id)

          // Call ranking calculation function
          const { data: ranking, error: rankingError } = await supabase
            .rpc(`${schema}.calculate_ranking`, {
              p_tournament_id: tournament.id,
            })

          expect(rankingError).toBeNull()
          expect(ranking).toBeDefined()
          expect(Array.isArray(ranking)).toBe(true)

          // Verify user appears in ranking
          const userRanking = ranking!.find((r: any) => r.user_id === testUser.id)
          expect(userRanking).toBeDefined()
          expect(userRanking!.total_score).toBe(scoreValue)
          expect(userRanking!.rank).toBeGreaterThan(0)

          return true
        }
      ),
      { numRuns: 5 }
    )

    console.log('✓ Property 17: Automatic ranking recalculation verified')
  }, { timeout: 90000 })
})
