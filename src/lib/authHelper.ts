// lib/authHelper.ts
'use client'

import { getSupabaseClient } from '@/lib/supabase/client'
import { MockAuthService } from '@/lib/mockAuthService'

export interface User {
  id: string
  email?: string
  name?: string
}

/**
 * 統一的認證輔助函數
 * 開發模式使用模擬用戶，生產模式使用真實認證
 */
export class AuthHelper {
  /**
   * 獲取當前用戶
   * 開發模式返回模擬用戶，生產模式使用 Supabase 認證
   */
  static async getCurrentUser(): Promise<User | null> {
    // 開發模式：使用模擬用戶
    if (MockAuthService.isDevelopmentMode()) {
      const mockUser = await MockAuthService.getCurrentUser()
      if (mockUser) {
        console.log('🔧 [DEV] 使用模擬用戶:', mockUser.id)
        return {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name
        }
      }
      return null
    }

    // 生產模式：使用真實 Supabase 認證
    try {
      const supabase = getSupabaseClient()
      
      if (!supabase) {
        console.error('Supabase client not available')
        return null
      }

      // 修復：添加實際的 API 調用
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        console.error('認證錯誤:', error)
        return null
      }
      
      return user ? {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name
      } : null
    } catch (error) {
      console.error('獲取用戶失敗:', error)
      return null
    }
  }

  /**
   * 檢查是否已認證
   */
  static async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser()
    return user !== null
  }

  /**
   * 獲取用戶 ID（用於資料庫操作）
   */
  static async getUserId(): Promise<string | null> {
    const user = await this.getCurrentUser()
    return user?.id || null
  }

  /**
   * 快速獲取用戶 ID（同步版本，僅開發模式）
   */
  static getUserIdSync(): string | null {
    if (MockAuthService.isDevelopmentMode()) {
      return MockAuthService.getDevUserId()
    }
    return null
  }

  /**
   * 登入
   */
  static async login(email: string, password: string): Promise<User | null> {
    if (MockAuthService.isDevelopmentMode()) {
      return await MockAuthService.login(email, password)
    }

    // 修復：先獲取 supabase 客戶端
    const supabase = getSupabaseClient()
    if (!supabase) {
      console.error('Supabase client not available')
      return null
    }

    // 真實登入邏輯
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      console.error('登入失敗:', error)
      return null
    }

    return data.user ? {
      id: data.user.id,
      email: data.user.email,
      name: data.user.user_metadata?.name
    } : null
  }

  /**
   * 登出
   */
  static async logout(): Promise<void> {
    if (MockAuthService.isDevelopmentMode()) {
      await MockAuthService.logout()
      return
    }

    // 修復：先獲取 supabase 客戶端
    const supabase = getSupabaseClient()
    if (!supabase) {
      console.error('Supabase client not available')
      return
    }

    // 真實登出邏輯
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('登出失敗:', error)
    }
  }
}