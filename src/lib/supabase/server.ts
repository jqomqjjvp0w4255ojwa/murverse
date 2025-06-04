import { createClient } from '@supabase/supabase-js'

export function createServerSupabaseClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!, // 注意：不是 NEXT_PUBLIC_
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}