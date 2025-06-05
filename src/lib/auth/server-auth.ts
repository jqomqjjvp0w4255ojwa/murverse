// lib/auth/server-auth.ts
import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * 統一的服務器端用戶認證函數
 * 支援 Authorization header 和 cookies 兩種方式
 */
export async function getServerUserId(request: NextRequest): Promise<string | null> {
  try {
    const supabase = createServerSupabaseClient()
    
    // 方法1: 從 Authorization header 獲取 (API 調用)
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data: { user }, error } = await supabase.auth.getUser(token)
      
      if (!error && user) {
        console.log('✅ Auth via header:', user.id)
        return user.id
      }
    }
    
    // 方法2: 從 cookies 獲取 (瀏覽器直接訪問)
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (!error && user) {
        console.log('✅ Auth via cookies:', user.id)
        return user.id
      }
    } catch (cookieError) {
      console.log('Cookies auth failed:', cookieError)
    }
    
    console.log('❌ Authentication failed - no valid session found')
    return null
    
  } catch (error) {
    console.error('❌ Server auth error:', error)
    return null
  }
}

/**
 * 檢查用戶是否擁有特定 fragment 的權限
 */
export async function checkFragmentOwnership(
  fragmentId: string, 
  userId: string
): Promise<boolean> {
  try {
    const supabase = createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('fragments')
      .select('id')
      .eq('id', fragmentId)
      .eq('user_id', userId)
      .single()

    return !error && !!data
  } catch (error) {
    console.error('❌ Fragment ownership check failed:', error)
    return false
  }
}