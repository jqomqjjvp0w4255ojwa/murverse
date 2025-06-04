// lib/supabase/server.ts
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// lib/supabase/server.ts
export function createServerSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,     // 加上 NEXT_PUBLIC_
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // 加上 NEXT_PUBLIC_
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// 新增開發專用 client
export function createDevServerSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}