'use client'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient | null {
  if (typeof window === 'undefined') {
    console.warn('⚠️ Supabase client called on server side')
    return null
  }
  
  if (supabaseInstance) {
    return supabaseInstance
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables:', {
      url: !!supabaseUrl,
      key: !!supabaseAnonKey,
      nodeEnv: process.env.NODE_ENV
    })
    return null
  }

  // 驗證 URL 格式
  try {
    new URL(supabaseUrl)
  } catch {
    console.error('❌ Invalid Supabase URL format')
    return null
  }

  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
    
    console.log('✅ Supabase client initialized')
    return supabaseInstance
    
  } catch (error) {
    console.error('❌ Failed to create Supabase client:', error)
    return null
  }
}

/**
 * 重置客戶端實例（測試用）
 */
export function resetSupabaseClient(): void {
  supabaseInstance = null
}