// lib/supabase/server.ts
import { createClient } from '@supabase/supabase-js'

export function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL 
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY  

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase server environment variables')
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}