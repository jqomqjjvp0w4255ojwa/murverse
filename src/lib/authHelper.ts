// lib/authHelper.ts
'use client'

import { getSupabaseClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface User {
  id: string
  email?: string
  name?: string
}

export class AuthHelper {
  /**
   * 安全獲取 Supabase 客戶端
   */
  private static getSupabaseClientSafe(): SupabaseClient {
    const supabase = getSupabaseClient()
    if (!supabase) {
      throw new Error('Supabase client not available')
    }
    return supabase
  }

  /**
   * 獲取當前用戶
   */
  static async getCurrentUser(): Promise<User | null> {
    try {
      const supabase = this.getSupabaseClientSafe()
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
   * 登入
   */
  static async login(email: string, password: string): Promise<User | null> {
    try {
      const supabase = this.getSupabaseClientSafe()

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
      const supabase = this.getSupabaseClientSafe()

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

  /**
   * 獲取當前 session token（用於 API 調用）
   */
  static async getSessionToken(): Promise<string | null> {
    try {
      const supabase = this.getSupabaseClientSafe()
      const { data: { session } } = await supabase.auth.getSession()
      return session?.access_token || null
    } catch (error) {
      console.error('❌ Failed to get session token:', error)
      return null
    }
  }
}