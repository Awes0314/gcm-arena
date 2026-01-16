import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fc from 'fast-check'
import { createTestClient } from '../test-client'
import type { GameType } from '../../types/database'

/**
 * Property-Based Tests for Image Submission
 * Feature: gcm-arena-platform
 * 
 * These tests validate image submission functionality, ensuring that:
 * - Images are saved to storage and pending score records are created
 * - Organizers can approve scores and manually input values
 * 
 * Note: These tests require a live Supabase instance with the dev schema,
 * RLS policies, and storage bucket configured.
 */

describe('Image Submission - Property-Based Tests', () => {
  const supabase = createTestClient()
  const schema = process.env.SUPABASE_SCHEMA || 'dev'
  
  // Test user credentials
  const testUser = {
    email: 'test-image-submitter@example.com',
    password: 'test-password-123',
    id: '' // Will be populated after login
  }

  const testOrganizer = {
    email: 'test-image-organizer@example.com',
    password: 'test-password-123',
    id: '' // Will be populated after login
  }

  // Store created IDs for cleanup
  const createdTournamentIds: string[] = []
  const createdSongIds: string[] = []
  const createdParticipantIds: string[] = []
  const createdScoreIds: string[] = []
  const uploadedImagePaths: string[] = []

  beforeAll(async () => {
    console.log('\n=== Image Submission Property Tests Setup ===')
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
        title: 'Image Test Song 1',
        artist: 'Test Artist',
        difficulty: 'master' as const,
        level: 14.5,
      },
      {
        game_type: 'chunithm' as GameType,
        title: 'Image Test Song 2',
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
    
    // Delete uploaded images from storage
    if (uploadedImagePaths.length > 0) {
      const { error } = await supabase.storage
        .from('score-images')
        .remove(uploadedImagePaths)
      
      if (!error) {
        console.log(`✓ Deleted ${uploadedImagePaths.length} test images`)
      }
    }

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
        submission_method: 'image',
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
   * Helper function to create a mock image file
   */
  function createMockImageBuffer(): Buffer {
    // Create a minimal valid PNG image (1x1 pixel, transparent)
    const pngHeader = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
      0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
      0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
      0x42, 0x60, 0x82
    ])
    return pngHeader
  }

  /**
   * Property 14: 画像の保存と保留状態
   * Validates: Requirements 5.1, 5.2
   * 
   * For any image upload, the image is saved to Supabase Storage and a
   * score record with status='pending' is created
   */
  it('Property 14: Image storage and pending status', async () => {
    // Feature: gcm-arena-platform, Property 14: 画像の保存と保留状態

    if (!testUser.id || !testOrganizer.id || createdSongIds.length === 0) {
      console.log('⚠️  Skipping test: Users not authenticated or no test songs')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }),
        async (tournamentSuffix) => {
          // Create a tournament
          const tournament = await createTournament(`Image Test ${tournamentSuffix}`)
          
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

          // Create mock image
          const imageBuffer = createMockImageBuffer()
          const fileName = `${tournament.id}/${testUser.id}/${songId}_${Date.now()}.png`

          // Upload image to storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('score-images')
            .upload(fileName, imageBuffer, {
              contentType: 'image/png',
              upsert: false,
            })

          if (uploadError) {
            console.error('Failed to upload image:', uploadError)
            return false
          }

          uploadedImagePaths.push(fileName)

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('score-images')
            .getPublicUrl(fileName)

          expect(urlData.publicUrl).toBeDefined()
          expect(urlData.publicUrl).toContain(fileName)

          // Create pending score record
          const { data: score, error: scoreError } = await supabase
            .from(`${schema}.scores`)
            .insert({
              tournament_id: tournament.id,
              user_id: testUser.id,
              song_id: songId,
              score: 0, // Will be set by organizer
              status: 'pending',
              submitted_via: 'image',
              image_url: urlData.publicUrl,
            })
            .select()
            .single()

          if (scoreError || !score) {
            console.error('Failed to create score record:', scoreError)
            return false
          }

          createdScoreIds.push(score.id)

          // Verify score record
          expect(score.status).toBe('pending')
          expect(score.submitted_via).toBe('image')
          expect(score.image_url).toBe(urlData.publicUrl)
          expect(score.score).toBe(0)
          expect(score.tournament_id).toBe(tournament.id)
          expect(score.user_id).toBe(testUser.id)
          expect(score.song_id).toBe(songId)

          // Verify image exists in storage
          const { data: fileList, error: listError } = await supabase.storage
            .from('score-images')
            .list(fileName.split('/').slice(0, -1).join('/'))

          expect(listError).toBeNull()
          expect(fileList).toBeDefined()
          expect(fileList!.some(f => fileName.endsWith(f.name))).toBe(true)

          return true
        }
      ),
      { numRuns: 5 }
    )

    console.log('✓ Property 14: Image storage and pending status verified')
  }, { timeout: 120000 })

  /**
   * Property 15: 開催者によるスコア承認
   * Validates: Requirements 5.3, 8.2
   * 
   * For any image submission, the tournament organizer can approve the
   * score and manually input the value
   */
  it('Property 15: Organizer score approval', async () => {
    // Feature: gcm-arena-platform, Property 15: 開催者によるスコア承認

    if (!testUser.id || !testOrganizer.id || createdSongIds.length === 0) {
      console.log('⚠️  Skipping test: Users not authenticated or no test songs')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 500000, max: 1010000 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        async (approvedScore, tournamentSuffix) => {
          // Create a tournament
          const tournament = await createTournament(`Approval Test ${tournamentSuffix}`)
          
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

          // Create mock image
          const imageBuffer = createMockImageBuffer()
          const fileName = `${tournament.id}/${testUser.id}/${songId}_${Date.now()}.png`

          // Upload image to storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('score-images')
            .upload(fileName, imageBuffer, {
              contentType: 'image/png',
              upsert: false,
            })

          if (uploadError) {
            console.error('Failed to upload image:', uploadError)
            return false
          }

          uploadedImagePaths.push(fileName)

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('score-images')
            .getPublicUrl(fileName)

          // Create pending score record
          const { data: score, error: scoreError } = await supabase
            .from(`${schema}.scores`)
            .insert({
              tournament_id: tournament.id,
              user_id: testUser.id,
              song_id: songId,
              score: 0,
              status: 'pending',
              submitted_via: 'image',
              image_url: urlData.publicUrl,
            })
            .select()
            .single()

          if (scoreError || !score) {
            console.error('Failed to create score record:', scoreError)
            return false
          }

          createdScoreIds.push(score.id)

          // Verify initial status
          expect(score.status).toBe('pending')
          expect(score.score).toBe(0)

          // Switch to organizer
          await supabase.auth.signInWithPassword({
            email: testOrganizer.email,
            password: testOrganizer.password,
          })

          // Approve score with manual input
          const { data: approvedScoreData, error: approveError } = await supabase
            .from(`${schema}.scores`)
            .update({
              status: 'approved',
              score: approvedScore,
              approved_at: new Date().toISOString(),
              approved_by: testOrganizer.id,
            })
            .eq('id', score.id)
            .select()
            .single()

          if (approveError || !approvedScoreData) {
            console.error('Failed to approve score:', approveError)
            return false
          }

          // Verify approval
          expect(approvedScoreData.status).toBe('approved')
          expect(approvedScoreData.score).toBe(approvedScore)
          expect(approvedScoreData.approved_by).toBe(testOrganizer.id)
          expect(approvedScoreData.approved_at).toBeDefined()

          // Switch back to participant
          await supabase.auth.signInWithPassword({
            email: testUser.email,
            password: testUser.password,
          })

          // Verify participant can see approved score
          const { data: queriedScore, error: queryError } = await supabase
            .from(`${schema}.scores`)
            .select('*')
            .eq('id', score.id)
            .single()

          expect(queryError).toBeNull()
          expect(queriedScore).toBeDefined()
          expect(queriedScore!.status).toBe('approved')
          expect(queriedScore!.score).toBe(approvedScore)

          return true
        }
      ),
      { numRuns: 5 }
    )

    console.log('✓ Property 15: Organizer score approval verified')
  }, { timeout: 120000 })
})
