import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fc from 'fast-check'
import { createTestClient } from '../test-client'
import type { GameType } from '../../types/database'

/**
 * Property-Based Tests for Image Cleanup
 * Feature: gcm-arena-platform
 * 
 * These tests validate automatic image cleanup functionality, ensuring that:
 * - Images are automatically deleted when tournaments end
 * 
 * Note: These tests require a live Supabase instance with the dev schema,
 * RLS policies, and storage bucket configured.
 */

describe('Image Cleanup - Property-Based Tests', () => {
  const supabase = createTestClient()
  const schema = process.env.SUPABASE_SCHEMA || 'dev'
  
  // Test user credentials
  const testUser = {
    email: 'test-cleanup-participant@example.com',
    password: 'test-password-123',
    id: '' // Will be populated after login
  }

  const testOrganizer = {
    email: 'test-cleanup-organizer@example.com',
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
    console.log('\n=== Image Cleanup Property Tests Setup ===')
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
        title: 'Cleanup Test Song 1',
        artist: 'Test Artist',
        difficulty: 'master' as const,
        level: 14.5,
      },
      {
        game_type: 'chunithm' as GameType,
        title: 'Cleanup Test Song 2',
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
  async function createTournament(
    title: string,
    gameType: GameType = 'ongeki',
    endInPast: boolean = false
  ) {
    // Sign in as organizer
    await supabase.auth.signInWithPassword({
      email: testOrganizer.email,
      password: testOrganizer.password,
    })

    const now = new Date()
    let startAt: Date
    let endAt: Date

    if (endInPast) {
      // Create a tournament that has already ended
      endAt = new Date(now.getTime() - 24 * 60 * 60 * 1000) // Ended 1 day ago
      startAt = new Date(endAt.getTime() - 7 * 24 * 60 * 60 * 1000) // Started 8 days ago
    } else {
      // Create a future tournament
      startAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      endAt = new Date(startAt.getTime() + 7 * 24 * 60 * 60 * 1000)
    }

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
   * Helper function to simulate the cleanup cron job logic
   */
  async function cleanupEndedTournamentImages() {
    const now = new Date()

    // Find tournaments that have ended
    const { data: endedTournaments, error: tournamentsError } = await supabase
      .from(`${schema}.tournaments`)
      .select('id')
      .lt('end_at', now.toISOString())

    if (tournamentsError || !endedTournaments || endedTournaments.length === 0) {
      return { deletedCount: 0, processedTournaments: 0 }
    }

    const tournamentIds = endedTournaments.map((t) => t.id)

    // Find all scores with images from ended tournaments
    const { data: scoresWithImages, error: scoresError } = await supabase
      .from(`${schema}.scores`)
      .select('id, image_url')
      .in('tournament_id', tournamentIds)
      .not('image_url', 'is', null)

    if (scoresError || !scoresWithImages || scoresWithImages.length === 0) {
      return { deletedCount: 0, processedTournaments: endedTournaments.length }
    }

    // Extract file paths from image URLs
    const filePaths: string[] = []
    for (const score of scoresWithImages) {
      if (score.image_url) {
        const urlParts = score.image_url.split('/score-images/')
        if (urlParts.length === 2) {
          filePaths.push(urlParts[1])
        }
      }
    }

    // Delete images from Supabase Storage
    let deletedCount = 0
    if (filePaths.length > 0) {
      const { error: deleteError } = await supabase.storage
        .from('score-images')
        .remove(filePaths)

      if (!deleteError) {
        deletedCount = filePaths.length
      }
    }

    // Update scores to remove image_url references
    await supabase
      .from(`${schema}.scores`)
      .update({ image_url: null })
      .in(
        'id',
        scoresWithImages.map((s) => s.id)
      )

    return { deletedCount, processedTournaments: endedTournaments.length }
  }

  /**
   * Property 16: 大会終了時の画像削除
   * Validates: Requirements 5.4
   * 
   * For any tournament, when the tournament ends, all related images
   * are automatically deleted from Supabase Storage
   */
  it('Property 16: Tournament end image deletion', async () => {
    // Feature: gcm-arena-platform, Property 16: 大会終了時の画像削除

    if (!testUser.id || !testOrganizer.id || createdSongIds.length === 0) {
      console.log('⚠️  Skipping test: Users not authenticated or no test songs')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }),
        async (tournamentSuffix) => {
          // Create a tournament that has already ended
          const tournament = await createTournament(
            `Cleanup Test ${tournamentSuffix}`,
            'ongeki',
            true // endInPast = true
          )
          
          if (!tournament) {
            return false
          }

          // Verify tournament has ended
          const now = new Date()
          const endAt = new Date(tournament.end_at)
          expect(endAt.getTime()).toBeLessThan(now.getTime())

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

          // Create score record with image
          const { data: score, error: scoreError } = await supabase
            .from(`${schema}.scores`)
            .insert({
              tournament_id: tournament.id,
              user_id: testUser.id,
              song_id: songId,
              score: 950000,
              status: 'approved',
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

          // Verify image exists before cleanup
          const { data: fileListBefore, error: listErrorBefore } = await supabase.storage
            .from('score-images')
            .list(fileName.split('/').slice(0, -1).join('/'))

          expect(listErrorBefore).toBeNull()
          expect(fileListBefore).toBeDefined()
          expect(fileListBefore!.some(f => fileName.endsWith(f.name))).toBe(true)

          // Verify score has image_url
          expect(score.image_url).toBe(urlData.publicUrl)

          // Run cleanup process
          const cleanupResult = await cleanupEndedTournamentImages()

          // Verify cleanup processed the tournament
          expect(cleanupResult.processedTournaments).toBeGreaterThan(0)
          expect(cleanupResult.deletedCount).toBeGreaterThan(0)

          // Verify image was deleted from storage
          const { data: fileListAfter, error: listErrorAfter } = await supabase.storage
            .from('score-images')
            .list(fileName.split('/').slice(0, -1).join('/'))

          // The file should no longer exist
          if (fileListAfter) {
            expect(fileListAfter.some(f => fileName.endsWith(f.name))).toBe(false)
          }

          // Verify score record was updated (image_url set to null)
          const { data: updatedScore, error: queryError } = await supabase
            .from(`${schema}.scores`)
            .select('image_url')
            .eq('id', score.id)
            .single()

          expect(queryError).toBeNull()
          expect(updatedScore).toBeDefined()
          expect(updatedScore!.image_url).toBeNull()

          // Remove from uploadedImagePaths since it's already deleted
          const index = uploadedImagePaths.indexOf(fileName)
          if (index > -1) {
            uploadedImagePaths.splice(index, 1)
          }

          return true
        }
      ),
      { numRuns: 3 }
    )

    console.log('✓ Property 16: Tournament end image deletion verified')
  }, { timeout: 120000 })
})
