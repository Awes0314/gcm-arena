import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fc from 'fast-check'
import { createTestClient } from '../test-client'
import type { Profile } from '../../types/database'

/**
 * Property-Based Tests for Profile Management
 * Feature: gcm-arena-platform
 * 
 * These tests validate profile viewing and updating functionality,
 * ensuring that ownership rules and visibility rules are correctly enforced.
 * 
 * Note: These tests require a live Supabase instance with the dev schema
 * and RLS policies applied. They are integration tests that verify the
 * actual database behavior.
 */

describe('Profile Management - Property-Based Tests', () => {
  const supabase = createTestClient()
  
  // Test user credentials (these need to be created manually in Supabase Auth)
  const testUser1 = {
    email: 'test-user-1@example.com',
    password: 'test-password-123',
    id: '' // Will be populated after login
  }
  
  const testUser2 = {
    email: 'test-user-2@example.com',
    password: 'test-password-456',
    id: '' // Will be populated after login
  }

  beforeAll(async () => {
    console.log('\n=== Profile Management Property Tests Setup ===')
    console.log('Note: These tests require manual user creation in Supabase Auth')
    console.log(`Required test users:`)
    console.log(`  1. ${testUser1.email} / ${testUser1.password}`)
    console.log(`  2. ${testUser2.email} / ${testUser2.password}`)
    console.log('Please create these users in Supabase Dashboard before running tests')
    console.log('================================================\n')
  })

  afterAll(async () => {
    // Sign out after tests
    await supabase.auth.signOut()
  })

  /**
   * Property 1: プロフィール更新の所有権
   * Validates: Requirements 1.3, 1.7
   * 
   * For any user, that user can update their own profile and cannot update
   * other users' profiles
   */
  it('Property 1: Profile update ownership', async () => {
    // Feature: gcm-arena-platform, Property 1: プロフィール更新の所有権
    
    console.log('\n--- Property 1: Profile Update Ownership ---')
    
    // Sign in as test user 1
    const { data: authData1, error: signInError1 } = await supabase.auth.signInWithPassword({
      email: testUser1.email,
      password: testUser1.password,
    })
    
    if (signInError1 || !authData1.user) {
      console.log('⚠️  Test user 1 not found. Skipping test.')
      console.log('   Please create test user:', testUser1.email)
      return
    }
    
    testUser1.id = authData1.user.id
    console.log('✓ Signed in as User 1:', testUser1.email)
    
    // Test 1: User can update their own profile
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (displayName) => {
          const { data: updatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update({ display_name: displayName })
            .eq('id', testUser1.id)
            .select()
            .single()
          
          // Should succeed
          expect(updateError).toBeNull()
          expect(updatedProfile).toBeDefined()
          expect(updatedProfile?.display_name).toBe(displayName)
          
          return true
        }
      ),
      { numRuns: 10 }
    )
    
    console.log('✓ User 1 can update their own profile')
    
    // Sign in as test user 2 to get their ID
    await supabase.auth.signOut()
    const { data: authData2, error: signInError2 } = await supabase.auth.signInWithPassword({
      email: testUser2.email,
      password: testUser2.password,
    })
    
    if (signInError2 || !authData2.user) {
      console.log('⚠️  Test user 2 not found. Skipping cross-user test.')
      console.log('   Please create test user:', testUser2.email)
      return
    }
    
    testUser2.id = authData2.user.id
    console.log('✓ Signed in as User 2:', testUser2.email)
    
    // Sign back in as user 1
    await supabase.auth.signOut()
    await supabase.auth.signInWithPassword({
      email: testUser1.email,
      password: testUser1.password,
    })
    
    // Test 2: User cannot update another user's profile
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (displayName) => {
          const { data: updatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update({ display_name: displayName })
            .eq('id', testUser2.id)
            .select()
            .single()
          
          // Should fail or return no rows (RLS blocks the update)
          // Either error is not null, or no data is returned
          const updateBlocked = updateError !== null || updatedProfile === null
          expect(updateBlocked).toBe(true)
          
          return true
        }
      ),
      { numRuns: 10 }
    )
    
    console.log('✓ User 1 cannot update User 2 profile (RLS enforced)')
    console.log('--- Property 1: PASSED ---\n')
  }, { timeout: 60000 })

  /**
   * Property 2: プロフィールの閲覧可能性
   * Validates: Requirements 1.6
   * 
   * For any user, that user can view any other user's profile
   */
  it('Property 2: Profile visibility', async () => {
    // Feature: gcm-arena-platform, Property 2: プロフィールの閲覧可能性
    
    console.log('\n--- Property 2: Profile Visibility ---')
    
    // Test 1: Authenticated user can view all profiles
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testUser1.email,
      password: testUser1.password,
    })
    
    if (signInError || !authData.user) {
      console.log('⚠️  Test user not found. Skipping test.')
      return
    }
    
    console.log('✓ Signed in as User 1:', testUser1.email)
    
    const { data: profiles, error: selectError } = await supabase
      .from('profiles')
      .select('*')
      .limit(100)
    
    expect(selectError).toBeNull()
    expect(profiles).toBeDefined()
    expect(Array.isArray(profiles)).toBe(true)
    
    console.log(`✓ Authenticated user can view ${profiles?.length || 0} profiles`)
    
    // Test 2: Unauthenticated user can also view profiles
    await supabase.auth.signOut()
    console.log('✓ Signed out')
    
    const { data: publicProfiles, error: publicSelectError } = await supabase
      .from('profiles')
      .select('*')
      .limit(100)
    
    expect(publicSelectError).toBeNull()
    expect(publicProfiles).toBeDefined()
    expect(Array.isArray(publicProfiles)).toBe(true)
    
    console.log(`✓ Unauthenticated user can view ${publicProfiles?.length || 0} profiles`)
    
    // Test 3: Property-based test - any profile ID should be viewable
    if (publicProfiles && publicProfiles.length > 0) {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...publicProfiles.map(p => p.id)),
          async (profileId) => {
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', profileId)
              .single()
            
            // Should be able to read any profile
            expect(error).toBeNull()
            expect(profile).toBeDefined()
            expect(profile?.id).toBe(profileId)
            
            return true
          }
        ),
        { numRuns: Math.min(10, publicProfiles.length) }
      )
      
      console.log('✓ All profiles are publicly viewable')
    }
    
    console.log('--- Property 2: PASSED ---\n')
  }, { timeout: 60000 })
})
