'use client'
import { createClient } from '@supabase/supabase-js'

// 添加檢查確保在瀏覽器環境中才創建客戶端
function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // 在開發時提供更詳細的錯誤訊息
    if (typeof window !== 'undefined') {
      console.error('Supabase environment variables missing:', {
        url: !!supabaseUrl,
        key: !!supabaseAnonKey
      })
    }
    
    // 返回一個模擬客戶端避免在 SSR 時出錯
    return null
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}

export const supabase = createSupabaseClient()

// 提供一個安全的獲取客戶端的函數
export function getSupabaseClient() {
  if (typeof window === 'undefined') {
    // 在服務器端返回 null，避免錯誤
    return null
  }
  
  if (!supabase) {
    throw new Error('Supabase client initialization failed. Check environment variables.')
  }
  
  return supabase
}