import { createClient } from '@supabase/supabase-js'

let supabaseClient

const defaultSupabaseUrl = 'https://zmhgjntxtzhblcaejekn.supabase.co'
const defaultSupabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptaGdqbnR4dHpoYmxjYWVqZWtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3MzI4NzQsImV4cCI6MjEwNDMwODg3NH0.6kjFXPHuY1IUK_0-ipe9SyQxKXvFTFT9wzMQeXl5UaY'

export function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || defaultSupabaseUrl
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || defaultSupabaseAnonKey

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required.')
  }

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storageKey: 'intl-dj-experience-auth'
    }
  })
  return supabaseClient
}
