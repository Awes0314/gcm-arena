import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Create a Supabase client for testing
 * This client uses the service role key for admin operations in tests
 */
export function createTestClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createSupabaseClient(supabaseUrl, supabaseKey, {
    db: {
      schema: process.env.SUPABASE_SCHEMA || 'dev'
    }
  })
}

/**
 * Create a Supabase client authenticated as a specific user
 */
export function createAuthenticatedTestClient(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }

  const client = createSupabaseClient(supabaseUrl, supabaseKey, {
    db: {
      schema: process.env.SUPABASE_SCHEMA || 'dev'
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  })

  return client
}
