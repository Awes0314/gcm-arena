import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fc from 'fast-check'
import { createTestClient } from '../test-client'
import type { GameType } from '../../types/database'

/**
 * Property-Based Tests for Tournament Participation
 * Feature: gcm-arena-platform
 * 
 * These tests validate tournament participation functionality, ensuring that:
 * - Participants can join and leave tournaments
 * - Users can participate in unlimited tournaments
 * - Duplicate participation is prevented
 * 
 * Note: These tests require a live Supabase instance with the dev schema
 * and RLS policies applied. They are integration tests that verify the
 * actual database behavior.
 */

describe('Tournament Participation - Property-Based Tests', () => {
  const supabase = createTestClient()
  const schema = process.env.SUPABASE_SCHEMA || 'dev'
  
  // Test user credentials
  const testUser = {
    email: 'test-participant@example.com',
    password: 'test-password-123',
    id: '' // Will be populated after login
  }

  const testOrganizer = {
    email: 'test-organizer@example.com',
    password: 'test-password-123',
    id: '' // Will be populated after login
  }

  // Store created IDs for cleanup
  const createdTournamentIds: string[] = []
  const createdSongIds: string[] = []
  const createdParticipantIds: string[] = []

  beforeAll(async () => {
    console.log('\n=== Tournament Participation Property Tests Setup ===')
    console.log('Note: These tests require manual user creation in Supabase Auth')
    console.log(`Required test users:`)
    console.log(`  - ${testUser.email} / ${testUser.password}`)
    console.log(`  - ${testOrganizer.email} / ${testOrganizer.password}`)
    console.log('====================================================\n')

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
        title: 'Participation Test Song 1',
        artist: 'Test Artist',
        difficulty: 'master' as const,
        level: 14.5,
      },
      {
        game_type: 'chunithm' as GameType,
        title: 'Participation Test Song 2',
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

      // Add at least one song
      if (createdSongIds.length > 0) {
        await supabase
          .from(`${schema}.tournament_songs`)
          .insert({
            tournament_id: tournament.id,
            song_id: createdSongIds[0],
          })
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
   * Property 8: 参加記録の作成と削除
   * Validates: Requirements 3.1, 3.2
   * 
   * For any logged-in user and tournament, that user can create a
   * participation record and later delete it
   */
  it('Property 8: Participation record creation and deletion', async () => {
    // Feature: gcm-arena-platform, Property 8: 参加記録の作成と削除

    if (!testUser.id || !testOrganizer.id || createdSongIds.length === 0) {
      console.log('⚠️  Skipping test: Users not authenticated or no test songs')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (tournamentSuffix) => {
          // Create a tournament
          const tournament = await createTournament(`Join Test ${tournamentSuffix}`)
          
          if (!tournament) {
            return false
          }

          // Join the tournament
          const { data: participant, error: joinError } = await supabase
            .from(`${schema}.participants`)
            .insert({
              tournament_id: tournament.id,
              user_id: testUser.id,
            })
            .select()
            .single()

          if (joinError || !participant) {
            console.error('Failed to join tournament:', joinError)
            return false
          }

          createdParticipantIds.push(participant.id)

          // Verify participation record was created
          expect(participant.tournament_id).toBe(tournament.id)
          expect(participant.user_id).toBe(testUser.id)
          expect(participant.joined_at).toBeDefined()

          // Verify we can query the participation
          const { data: checkParticipant, error: checkError } = await supabase
            .from(`${schema}.participants`)
            .select('id')
            .eq('tournament_id', tournament.id)
            .eq('user_id', testUser.id)
            .single()

          expect(checkError).toBeNull()
          expect(checkParticipant).toBeDefined()
          expect(checkParticipant!.id).toBe(participant.id)

          // Leave the tournament (delete participation record)
          const { error: leaveError } = await supabase
            .from(`${schema}.participants`)
            .delete()
            .eq('tournament_id', tournament.id)
            .eq('user_id', testUser.id)

          expect(leaveError).toBeNull()

          // Verify participation record was deleted
          const { data: checkDeleted, error: checkDeletedError } = await supabase
            .from(`${schema}.participants`)
            .select('id')
            .eq('tournament_id', tournament.id)
            .eq('user_id', testUser.id)
            .single()

          // Should return error because record doesn't exist
          expect(checkDeletedError).toBeDefined()
          expect(checkDeleted).toBeNull()

          return true
        }
      ),
      { numRuns: 5 }
    )

    console.log('✓ Property 8: Participation record creation and deletion verified')
  }, { timeout: 60000 })

  /**
   * Property 9: 無制限の参加
   * Validates: Requirements 3.3
   * 
   * For any user, that user can participate in any number of tournaments
   */
  it('Property 9: Unlimited participation', async () => {
    // Feature: gcm-arena-platform, Property 9: 無制限の参加

    if (!testUser.id || !testOrganizer.id || createdSongIds.length === 0) {
      console.log('⚠️  Skipping test: Users not authenticated or no test songs')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 5 }),
        async (numTournaments) => {
          const tournamentIds: string[] = []
          const participantIds: string[] = []

          // Create multiple tournaments
          for (let i = 0; i < numTournaments; i++) {
            const tournament = await createTournament(`Unlimited Test ${i}-${Date.now()}`)
            
            if (!tournament) {
              return false
            }

            tournamentIds.push(tournament.id)

            // Join each tournament
            const { data: participant, error: joinError } = await supabase
              .from(`${schema}.participants`)
              .insert({
                tournament_id: tournament.id,
                user_id: testUser.id,
              })
              .select()
              .single()

            if (joinError || !participant) {
              console.error(`Failed to join tournament ${i}:`, joinError)
              return false
            }

            participantIds.push(participant.id)
            createdParticipantIds.push(participant.id)
          }

          // Verify user is participating in all tournaments
          const { data: userParticipations, error: checkError } = await supabase
            .from(`${schema}.participants`)
            .select('id, tournament_id')
            .eq('user_id', testUser.id)
            .in('tournament_id', tournamentIds)

          expect(checkError).toBeNull()
          expect(userParticipations).toBeDefined()
          expect(userParticipations!.length).toBe(numTournaments)

          // Verify each tournament has the user as participant
          for (const tournamentId of tournamentIds) {
            const participation = userParticipations!.find(
              (p) => p.tournament_id === tournamentId
            )
            expect(participation).toBeDefined()
          }

          return true
        }
      ),
      { numRuns: 3 }
    )

    console.log('✓ Property 9: Unlimited participation verified')
  }, { timeout: 90000 })

  /**
   * Property 10: 重複参加の防止
   * Validates: Requirements 3.6
   * 
   * For any user and tournament, if the user is already participating
   * in the tournament, attempting to join again is rejected
   */
  it('Property 10: Duplicate participation prevention', async () => {
    // Feature: gcm-arena-platform, Property 10: 重複参加の防止

    if (!testUser.id || !testOrganizer.id || createdSongIds.length === 0) {
      console.log('⚠️  Skipping test: Users not authenticated or no test songs')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (tournamentSuffix) => {
          // Create a tournament
          const tournament = await createTournament(`Duplicate Test ${tournamentSuffix}`)
          
          if (!tournament) {
            return false
          }

          // Join the tournament (first time)
          const { data: participant1, error: joinError1 } = await supabase
            .from(`${schema}.participants`)
            .insert({
              tournament_id: tournament.id,
              user_id: testUser.id,
            })
            .select()
            .single()

          if (joinError1 || !participant1) {
            console.error('Failed to join tournament first time:', joinError1)
            return false
          }

          createdParticipantIds.push(participant1.id)

          // Verify first participation was successful
          expect(participant1.tournament_id).toBe(tournament.id)
          expect(participant1.user_id).toBe(testUser.id)

          // Try to join the same tournament again (should fail)
          const { data: participant2, error: joinError2 } = await supabase
            .from(`${schema}.participants`)
            .insert({
              tournament_id: tournament.id,
              user_id: testUser.id,
            })
            .select()
            .single()

          // Should fail due to unique constraint on (tournament_id, user_id)
          expect(joinError2).toBeDefined()
          expect(participant2).toBeNull()

          // Verify error is about duplicate/unique constraint
          const errorMessage = joinError2?.message.toLowerCase() || ''
          const isDuplicateError = 
            errorMessage.includes('duplicate') ||
            errorMessage.includes('unique') ||
            errorMessage.includes('already exists')

          expect(isDuplicateError).toBe(true)

          // Verify only one participation record exists
          const { data: participations, error: checkError } = await supabase
            .from(`${schema}.participants`)
            .select('id')
            .eq('tournament_id', tournament.id)
            .eq('user_id', testUser.id)

          expect(checkError).toBeNull()
          expect(participations).toBeDefined()
          expect(participations!.length).toBe(1)
          expect(participations![0].id).toBe(participant1.id)

          return true
        }
      ),
      { numRuns: 5 }
    )

    console.log('✓ Property 10: Duplicate participation prevention verified')
  }, { timeout: 60000 })
})
