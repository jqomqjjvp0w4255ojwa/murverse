// lib/authHelper.ts
'use client'

import { getSupabaseClient } from '@/lib/supabase/client'
import { MockAuthService } from '@/lib/mockAuthService'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface User {
  id: string
  email?: string
  name?: string
}

export class AuthHelper {
  /**
   * 檢查是否為開發模式且使用模擬認證
   */
  private static shouldUseMockAuth(): boolean {
    // 強制使用真實認證，不再使用 Mock
    return false
  }

  /**
   * 安全獲取 Supabase 客戶端
   */
  private static getSupabaseClientSafe(): SupabaseClient | null {
    if (this.shouldUseMockAuth()) {
      return null // 開發模式不需要 Supabase
    }
    
    const supabase = getSupabaseClient()
    if (!supabase) {
      console.error('❌ Supabase client not available in production mode')
    }
    return supabase
  }

  /**
   * 獲取當前用戶
   */
  static async getCurrentUser(): Promise<User | null> {
    try {
      // 開發模式：使用模擬用戶
      if (this.shouldUseMockAuth()) {
        console.log('🔧 [DEV MODE] Using mock authentication')
        const mockUser = await MockAuthService.getCurrentUser()
        return mockUser ? {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name
        } : null
      }

      // 生產模式：使用真實 Supabase 認證
      const supabase = this.getSupabaseClientSafe()
      if (!supabase) {
        return null
      }

      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        console.error('❌ Auth error:', error.message)
        return null
      }
      
      return user ? {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name
      } : null

    } catch (error) {
      console.error('❌ Failed to get current user:', error)
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
    console.warn('⚠️ getUserIdSync only works in development mode')
    return null
  }

  /**
   * 登入
   */
  static async login(email: string, password: string): Promise<User | null> {
    try {
      // 開發模式
      if (MockAuthService.isDevelopmentMode()) {
        console.log('🔧 [DEV MODE] Mock login for:', email)
        return await MockAuthService.login(email, password)
      }

      // 生產模式
      const supabase = this.getSupabaseClientSafe()
      if (!supabase) {
        return null
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        console.error('❌ Login failed:', error.message)
        return null
      }

      return data.user ? {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name
      } : null

    } catch (error) {
      console.error('❌ Login process failed:', error)
      return null
    }
  }

  /**
   * 登出
   */
  static async logout(): Promise<boolean> {
    try {
      // 開發模式
      if (MockAuthService.isDevelopmentMode()) {
        console.log('🔧 [DEV MODE] Mock logout')
        await MockAuthService.logout()
        return true
      }

      // 生產模式
      const supabase = this.getSupabaseClientSafe()
      if (!supabase) {
        return false
      }

      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('❌ Logout failed:', error.message)
        return false
      }

      return true

    } catch (error) {
      console.error('❌ Logout process failed:', error)
      return false
    }
  }
}