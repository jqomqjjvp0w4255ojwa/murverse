'use client'
import { createClient } from '@supabase/supabase-js'

let supabaseInstance: any = null

export function getSupabaseClient() {
  if (typeof window === 'undefined') return null
  
  if (!supabaseInstance) {
    supabaseInstance = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  
  return supabaseInstance
}