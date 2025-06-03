// lib/supabase/server.ts (Server-side only)
import { createClient } from '@supabase/supabase-js'

export function createServerSupabaseClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // 使用 service role key
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}