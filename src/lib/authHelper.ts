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
  private static getSupabaseClientSafe(): SupabaseClient | null {
    try {
      const supabase = getSupabaseClient()
      if (!supabase) {
        console.warn('⚠️ Supabase client not available')
        return null
      }
      return supabase
    } catch (error) {
      console.error('❌ Failed to get Supabase client:', error)
      return null
    }
  }

  /**
   * 獲取當前用戶
   */
  static async getCurrentUser(): Promise<User | null> {
    try {
      const supabase = this.getSupabaseClientSafe()
      if (!supabase) {
        console.log('ℹ️ Supabase client not available')
        return null
      }

      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        // 🔧 修復：不要拋出錯誤，只記錄並返回 null
        console.log('ℹ️ Auth session missing or invalid:', error.message)
        return null
      }
      
      if (!user) {
        console.log('ℹ️ No authenticated user found')
        return null
      }

      console.log('✅ Current user:', user.email)
      return {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.user_metadata?.full_name
      }

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
   * 獲取當前 session（用於檢查認證狀態）
   */
  static async getSession() {
    try {
      const supabase = this.getSupabaseClientSafe()
      if (!supabase) {
        return { session: null, error: 'Supabase client not available' }
      }

      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.log('ℹ️ Session error:', error.message)
        return { session: null, error: error.message }
      }

      return { session, error: null }
    } catch (error) {
      console.error('❌ Failed to get session:', error)
      return { session: null, error: 'Failed to get session' }
    }
  }

  /**
   * Google OAuth 登入
   */
  static async loginWithGoogle(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = this.getSupabaseClientSafe()
    if (!supabase) {
      return { success: false, error: 'Supabase client not available' }
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/` // 🔧 使用動態 URL
        // 或者明確指定: redirectTo: 'https://murverse.vercel.app'
      }
    })

    if (error) {
      console.error('❌ Google login failed:', error.message)
      return { success: false, error: error.message }
    }

    console.log('🔄 Google login initiated')
    return { success: true }

  } catch (error) {
    console.error('❌ Google login process failed:', error)
    return { success: false, error: 'Login process failed' }
  }
}

  /**
   * 登入
   */
  static async login(email: string, password: string): Promise<User | null> {
    try {
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
      const supabase = this.getSupabaseClientSafe()
      if (!supabase) {
        return false
      }

      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('❌ Logout failed:', error.message)
        return false
      }

      console.log('✅ Logout successful')
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
      if (!supabase) {
        return null
      }

      const { data: { session } } = await supabase.auth.getSession()
      return session?.access_token || null
    } catch (error) {
      console.error('❌ Failed to get session token:', error)
      return null
    }
  }

  /**
   * 監聽認證狀態變化
   */
  static onAuthStateChange(callback: (event: string, session: any) => void) {
    const supabase = this.getSupabaseClientSafe()
    if (!supabase) {
      return { data: { subscription: null } }
    }

    return supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Auth state change:', event, session?.user?.email)
      callback(event, session)
    })
  }

  /**
   * 處理認證回調 URL
   */
  static async handleAuthCallback(): Promise<{ success: boolean; error?: string }> {
    try {
      if (typeof window === 'undefined') {
        return { success: false, error: 'Not in browser environment' }
      }

      // 檢查 URL 是否包含認證參數
      if (!window.location.hash.includes('access_token')) {
        return { success: false, error: 'No auth callback detected' }
      }

      const supabase = this.getSupabaseClientSafe()
      if (!supabase) {
        return { success: false, error: 'Supabase client not available' }
      }

      console.log('🔑 Processing auth callback...')

      // 等待 Supabase 自動處理認證回調
      await new Promise(resolve => setTimeout(resolve, 1000))

      // 檢查認證狀態
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.error('❌ Auth callback processing failed:', error)
        return { success: false, error: error.message }
      }

      if (!session) {
        console.log('ℹ️ No session found after callback processing')
        return { success: false, error: 'No session established' }
      }

      console.log('✅ Auth callback successful:', session.user.email)

      // 清除 URL hash
      window.history.replaceState({}, document.title, window.location.pathname)

      return { success: true }

    } catch (error) {
      console.error('❌ Error handling auth callback:', error)
      return { success: false, error: 'Callback processing failed' }
    }
  }
}