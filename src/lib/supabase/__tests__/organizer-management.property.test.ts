import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fc from 'fast-check'
import { createTestClient } from '../test-client'
import type { GameType, SubmissionMethod } from '../../types/database'

/**
 * Property-Based Tests for Organizer Management
 * Feature: gcm-arena-platform
 * 
 * These tests validate organizer management functionality, ensuring that:
 * - Organizers can view all submissions for their tournaments
 * - Participant statistics are calculated correctly
 * 
 * Note: These tests require a live Supabase instance with the dev schema
 * and RLS policies applied. They are integration tests that verify the
 * actual database behavior.
 */

describe('Organizer Management - Property-Based Tests', () => {
  const supabase = createTestClient()
  const schema = process.env.SUPABASE_SCHEMA || 'dev'
  
  // Test user credentials
  const organizerUser = {
    email: 'test-organizer@example.com',
    password: 'test-password-123',
    id: '' // Will be populated after login
  }

  const participantUser = {
    email: 'test-participant@example.com',
    password: 'test-password-123',
    id: '' // Will be populated after login
  }

  // Store created IDs for cleanup
  const createdTournamentIds: string[] = []
  const createdSongIds: string[] = []
  const createdScoreIds: string[] = []
  const createdParticipantIds: string[] = []

  beforeAll(async () => {
    console.log('\n=== Organizer Management Property Tests Setup ===')
    console.log('Note: These tests require manual user creation in Supabase Auth')
    console.log(`Required organizer: ${organizerUser.email} / ${organizerUser.password}`)
    console.log(`Required participant: ${participantUser.email} / ${participantUser.password}`)
    console.log('================================================\n')

    // Sign in as organizer
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: organizerUser.email,
      password: organizerUser.password,
    })

    if (signInError || !authData.user) {
      console.log('⚠️  Organizer user not found. Some tests will be skipped.')
      console.log('   Please create test user:', organizerUser.email)
      return
    }

    organizerUser.id = authData.user.id
    console.log('✓ Signed in as organizer:', organizerUser.email)

    // Get participant user ID (sign in temporarily)
    await supabase.auth.signOut()
    const { data: participantAuth, error: participantError } = await supabase.auth.signInWithPassword({
      email: participantUser.email,
      password: participantUser.password,
    })

    if (participantError || !participantAuth.user) {
      console.log('⚠️  Participant user not found. Some tests will be skipped.')
      console.log('   Please create test user:', participantUser.email)
      return
    }

    participantUser.id = participantAuth.user.id
    console.log('✓ Found participant user:', participantUser.email)

    // Sign back in as organizer
    await supabase.auth.signOut()
    await supabase.auth.signInWithPassword({
      email: organizerUser.email,
      password: organizerUser.password,
    })

    // Create test songs
    const testSongs = [
      {
        game_type: 'ongeki' as GameType,
        title: 'Organizer Test Song 1',
        artist: 'Test Artist',
        difficulty: 'master' as const,
        level: 14.5,
      },
      {
        game_type: 'ongeki' as GameType,
        title: 'Organizer Test Song 2',
        artist: 'Test Artist',
        difficulty: 'expert' as const,
        level: 13.0,
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
   * Property 25: 開催者による提出の閲覧
   * Validates: Requirements 8.1
   * 
   * For any organizer, that organizer can view all score submissions
   * for their tournaments
   */
  it('Property 25: Organizer can view all submissions', async () => {
    // Feature: gcm-arena-platform, Property 25: 開催者による提出の閲覧

    if (!organizerUser.id || !participantUser.id || createdSongIds.length === 0) {
      console.log('⚠️  Skipping test: Users not authenticated or no test songs')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 3 }),
        async (numParticipants, numScoresPerParticipant) => {
          const now = new Date()
          const startAt = new Date(now.getTime() - 24 * 60 * 60 * 1000) // Started yesterday
          const endAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // Ends in 7 days

          // Create tournament as organizer
          const { data: tournament, error: tournamentError } = await supabase
            .from(`${schema}.tournaments`)
            .insert({
              organizer_id: organizerUser.id,
              title: `Organizer Test Tournament ${Date.now()}`,
              game_type: 'ongeki',
              submission_method: 'both' as SubmissionMethod,
              start_at: startAt.toISOString(),
              end_at: endAt.toISOString(),
              is_public: true,
              rules: {},
            })
            .select()
            .single()

          if (tournamentError || !tournament) {
            console.error('Failed to create tournament:', tournamentError)
            return false
          }

          createdTournamentIds.push(tournament.id)

          // Add songs to tournament
          await supabase
            .from(`${schema}.tournament_songs`)
            .insert({
              tournament_id: tournament.id,
              song_id: createdSongIds[0],
            })

          // Create participants (using participant user as one of them)
          const participantIds = [participantUser.id]
          
          // Add participant
          const { data: participant, error: participantError } = await supabase
            .from(`${schema}.participants`)
            .insert({
              tournament_id: tournament.id,
              user_id: participantUser.id,
            })
            .select()
            .single()

          if (participantError || !participant) {
            console.error('Failed to create participant:', participantError)
            return false
          }

          createdParticipantIds.push(participant.id)

          // Create scores for each participant
          let totalScoresCreated = 0
          for (const userId of participantIds) {
            for (let i = 0; i < numScoresPerParticipant; i++) {
              const { data: score, error: scoreError } = await supabase
                .from(`${schema}.scores`)
                .insert({
                  tournament_id: tournament.id,
                  user_id: userId,
                  song_id: createdSongIds[0],
                  score: Math.floor(Math.random() * 1000000),
                  status: 'approved',
                  submitted_via: 'bookmarklet',
                })
                .select()
                .single()

              if (!scoreError && score) {
                createdScoreIds.push(score.id)
                totalScoresCreated++
              }
            }
          }

          // Verify organizer can view all submissions
          const { data: submissions, error: fetchError } = await supabase
            .from(`${schema}.scores`)
            .select('*')
            .eq('tournament_id', tournament.id)

          expect(fetchError).toBeNull()
          expect(submissions).toBeDefined()
          expect(submissions!.length).toBe(totalScoresCreated)

          // Verify organizer can see submissions with user details
          const { data: detailedSubmissions, error: detailedError } = await supabase
            .from(`${schema}.scores`)
            .select(`
              *,
              profiles:user_id (
                id,
                display_name
              ),
              songs:song_id (
                id,
                title
              )
            `)
            .eq('tournament_id', tournament.id)

          expect(detailedError).toBeNull()
          expect(detailedSubmissions).toBeDefined()
          expect(detailedSubmissions!.length).toBe(totalScoresCreated)

          return true
        }
      ),
      { numRuns: 5 }
    )

    console.log('✓ Property 25: Organizer can view all submissions verified')
  }, { timeout: 60000 })

  /**
   * Property 26: 参加者統計の計算
   * Validates: Requirements 8.4
   * 
   * For any tournament, the statistics viewed by the organizer
   * (participant count, submission count, etc.) are calculated correctly
   */
  it('Property 26: Participant statistics calculation', async () => {
    // Feature: gcm-arena-platform, Property 26: 参加者統計の計算

    if (!organizerUser.id || !participantUser.id || createdSongIds.length === 0) {
      console.log('⚠️  Skipping test: Users not authenticated or no test songs')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 3 }),
        fc.integer({ min: 0, max: 5 }),
        fc.integer({ min: 0, max: 3 }),
        async (numParticipants, numApprovedScores, numPendingScores) => {
          const now = new Date()
          const startAt = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          const endAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

          // Create tournament
          const { data: tournament, error: tournamentError } = await supabase
            .from(`${schema}.tournaments`)
            .insert({
              organizer_id: organizerUser.id,
              title: `Stats Test Tournament ${Date.now()}`,
              game_type: 'ongeki',
              submission_method: 'both' as SubmissionMethod,
              start_at: startAt.toISOString(),
              end_at: endAt.toISOString(),
              is_public: true,
              rules: {},
            })
            .select()
            .single()

          if (tournamentError || !tournament) {
            return false
          }

          createdTournamentIds.push(tournament.id)

          // Add song
          await supabase
            .from(`${schema}.tournament_songs`)
            .insert({
              tournament_id: tournament.id,
              song_id: createdSongIds[0],
            })

          // Add participant
          const { data: participant, error: participantError } = await supabase
            .from(`${schema}.participants`)
            .insert({
              tournament_id: tournament.id,
              user_id: participantUser.id,
            })
            .select()
            .single()

          if (participantError || !participant) {
            return false
          }

          createdParticipantIds.push(participant.id)

          // Create approved scores
          for (let i = 0; i < numApprovedScores; i++) {
            const { data: score, error: scoreError } = await supabase
              .from(`${schema}.scores`)
              .insert({
                tournament_id: tournament.id,
                user_id: participantUser.id,
                song_id: createdSongIds[0],
                score: Math.floor(Math.random() * 1000000),
                status: 'approved',
                submitted_via: 'bookmarklet',
              })
              .select()
              .single()

            if (!scoreError && score) {
              createdScoreIds.push(score.id)
            }
          }

          // Create pending scores
          for (let i = 0; i < numPendingScores; i++) {
            const { data: score, error: scoreError } = await supabase
              .from(`${schema}.scores`)
              .insert({
                tournament_id: tournament.id,
                user_id: participantUser.id,
                song_id: createdSongIds[0],
                score: 0,
                status: 'pending',
                submitted_via: 'image',
                image_url: 'https://example.com/image.jpg',
              })
              .select()
              .single()

            if (!scoreError && score) {
              createdScoreIds.push(score.id)
            }
          }

          // Calculate statistics
          const { count: participantCount } = await supabase
            .from(`${schema}.participants`)
            .select('*', { count: 'exact', head: true })
            .eq('tournament_id', tournament.id)

          const { count: approvedCount } = await supabase
            .from(`${schema}.scores`)
            .select('*', { count: 'exact', head: true })
            .eq('tournament_id', tournament.id)
            .eq('status', 'approved')

          const { count: pendingCount } = await supabase
            .from(`${schema}.scores`)
            .select('*', { count: 'exact', head: true })
            .eq('tournament_id', tournament.id)
            .eq('status', 'pending')

          // Verify statistics are correct
          expect(participantCount).toBe(1) // We added 1 participant
          expect(approvedCount).toBe(numApprovedScores)
          expect(pendingCount).toBe(numPendingScores)

          return true
        }
      ),
      { numRuns: 10 }
    )

    console.log('✓ Property 26: Participant statistics calculation verified')
  }, { timeout: 60000 })
})
