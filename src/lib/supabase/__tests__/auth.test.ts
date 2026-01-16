import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const schema = process.env.SUPABASE_SCHEMA || 'dev'

describe('Authentication Flow', () => {
  let supabase: ReturnType<typeof createClient>

  beforeAll(() => {
    supabase = createClient(supabaseUrl, supabaseKey, {
      db: { schema },
    })
  })

  describe('User Registration Validation', () => {
    it('should fail to register with invalid email', async () => {
      const { data, error } = await supabase.auth.signUp({
        email: 'invalid-email',
        password: 'testpassword123',
      })

      expect(error).toBeDefined()
      expect(data.user).toBeNull()
    })

    it('should fail to register with short password', async () => {
      const { data, error } = await supabase.auth.signUp({
        email: `test-short-${Date.now()}@example.com`,
        password: '123',
      })

      expect(error).toBeDefined()
      expect(data.user).toBeNull()
    })

    it('should validate email format', async () => {
      const invalidEmails = ['', 'test', 'test@', '@example.com', 'test @example.com']
      
      for (const email of invalidEmails) {
        const { error } = await supabase.auth.signUp({
          email,
          password: 'testpassword123',
        })
        expect(error).toBeDefined()
      }
    })
  })

  describe('User Login Validation', () => {
    it('should fail to login with incorrect password', async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'wrongpassword',
      })

      expect(error).toBeDefined()
      expect(data.user).toBeNull()
      expect(data.session).toBeNull()
    })

    it('should fail to login with non-existent email', async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: `nonexistent-${Date.now()}@example.com`,
        password: 'testpassword123',
      })

      expect(error).toBeDefined()
      expect(data.user).toBeNull()
      expect(data.session).toBeNull()
    })

    it('should fail to login with invalid email format', async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'invalid-email',
        password: 'testpassword123',
      })

      expect(error).toBeDefined()
      expect(data.user).toBeNull()
    })

    it('should validate required fields', async () => {
      // Test with empty email
      const { error: emailError } = await supabase.auth.signInWithPassword({
        email: '',
        password: 'testpassword123',
      })
      expect(emailError).toBeDefined()

      // Test with empty password
      const { error: passwordError } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: '',
      })
      expect(passwordError).toBeDefined()
    })
  })

  describe('Session Management', () => {
    it('should return null session when not authenticated', async () => {
      // Ensure we're logged out
      await supabase.auth.signOut()

      // Check session is null
      const { data: sessionData } = await supabase.auth.getSession()
      expect(sessionData.session).toBeNull()
    })

    it('should return null user when not authenticated', async () => {
      // Ensure we're logged out
      await supabase.auth.signOut()

      // Check user is null
      const { data: userData, error } = await supabase.auth.getUser()
      expect(userData.user).toBeNull()
      expect(error).toBeDefined()
    })

    it('should successfully sign out', async () => {
      // Sign out (even if not signed in)
      const { error } = await supabase.auth.signOut()
      expect(error).toBeNull()

      // Verify session is cleared
      const { data: sessionData } = await supabase.auth.getSession()
      expect(sessionData.session).toBeNull()
    })
  })

  describe('Supabase Client Configuration', () => {
    it('should have valid Supabase URL', () => {
      expect(supabaseUrl).toBeDefined()
      expect(supabaseUrl).toContain('supabase.co')
    })

    it('should have valid Supabase anon key', () => {
      expect(supabaseKey).toBeDefined()
      expect(supabaseKey.length).toBeGreaterThan(0)
    })

    it('should use correct schema', () => {
      expect(schema).toBeDefined()
      expect(['dev', 'public']).toContain(schema)
    })

    it('should create client successfully', () => {
      expect(supabase).toBeDefined()
      expect(supabase.auth).toBeDefined()
    })
  })
})
