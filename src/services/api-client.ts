// services/api-client.ts - 改進版本
'use client'
import { Fragment, Note } from '@/features/fragments/types/fragment'
import { getSupabaseClient } from '@/lib/supabase/client'

class ApiClient {
  private baseUrl = '/api'
  private authCache: { token: string; expires: number } | null = null

  // 🔧 改進的認證標頭獲取方法
  private async getAuthHeaders(): Promise<Record<string, string>> {
    try {
      const supabase = getSupabaseClient()
      if (!supabase) {
        throw new Error('Supabase client not available')
      }

      // 🔧 檢查快取的Token是否還有效
      const now = Date.now()
      if (this.authCache && this.authCache.expires > now + 60000) { // 提前1分鐘重新獲取
        return {
          'Authorization': `Bearer ${this.authCache.token}`
        }
      }

      console.log('🔐 獲取新的認證Token...')
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('❌ 獲取認證會話失敗:', error)
        this.authCache = null
        throw new Error(`Authentication error: ${error.message}`)
      }
      
      if (!session?.access_token) {
        console.warn('⚠️ 未找到有效的認證會話')
        this.authCache = null
        throw new Error('No authentication token available')
      }

      // 🔧 快取Token和過期時間
      this.authCache = {
        token: session.access_token,
        expires: session.expires_at ? session.expires_at * 1000 : now + 3600000 // 默認1小時
      }

      console.log('✅ 認證Token獲取成功')
      return {
        'Authorization': `Bearer ${session.access_token}`
      }
    } catch (error) {
      console.error('❌ 獲取認證標頭失敗:', error)
      this.authCache = null
      throw error
    }
  }

  // 🔧 改進的請求方法，加入重試機制
  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`
    
    // 🔧 最多重試一次認證失敗
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const authHeaders = await this.getAuthHeaders()
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...authHeaders,
        }

        // 合併額外的 headers
        if (options.headers) {
          Object.assign(headers, options.headers)
        }
        
        const config: RequestInit = {
          ...options,
          headers,
        }

        console.log(`🔗 API Request (attempt ${attempt + 1}): ${options.method || 'GET'} ${endpoint}`)
        
        const response = await fetch(url, config)
        
        // 🔧 如果是401錯誤且是第一次嘗試，清除快取並重試
        if (response.status === 401 && attempt === 0) {
          console.warn('🔄 認證失效，清除快取並重試...')
          this.authCache = null
          continue
        }
        
        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}`
          try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorMessage
          } catch {
            // 如果無法解析錯誤訊息，使用預設
          }
          
          console.error(`❌ API Error [${endpoint}]:`, errorMessage)
          throw new Error(errorMessage)
        }
        
        const data = await response.json()
        console.log(`✅ API Success [${endpoint}]`)
        return data
        
      } catch (error) {
        // 🔧 如果是認證錯誤且是第一次嘗試，清除快取並重試
        if (attempt === 0 && (
          error instanceof Error && 
          error.message.includes('authentication')
        )) {
          console.warn('🔄 認證錯誤，清除快取並重試...')
          this.authCache = null
          continue
        }
        
        console.error(`❌ API request failed [${endpoint}]:`, error)
        throw error
      }
    }
    
    throw new Error('API request failed after retries')
  }

  // 🔧 新增：檢查認證狀態的方法
  async checkAuthStatus(): Promise<boolean> {
    try {
      const supabase = getSupabaseClient()
      if (!supabase) return false

      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('認證狀態檢查失敗:', error)
        return false
      }
      
      return !!session?.access_token
    } catch (error) {
      console.error('認證狀態檢查異常:', error)
      return false
    }
  }

  // 🔧 改進的健康檢查
  async healthCheck(): Promise<boolean> {
    try {
      // 首先檢查認證狀態
      const isAuthenticated = await this.checkAuthStatus()
      if (!isAuthenticated) {
        console.log('🚫 健康檢查失敗：用戶未認證')
        return false
      }

      // 然後嘗試簡單的API調用
      console.log('🩺 執行API健康檢查...')
      await this.getFragments()
      console.log('✅ 健康檢查通過')
      return true
    } catch (error) {
      console.error('❌ 健康檢查失敗:', error)
      return false
    }
  }

  // 🔧 新增：清除認證快取的方法
  clearAuthCache(): void {
    this.authCache = null
    console.log('🗑️ 認證快取已清除')
  }

  // Fragments API
  async getFragments(): Promise<Fragment[]> {
    try {
      const data = await this.request('/fragments')
      return data.fragments || []
    } catch (error) {
      console.error('Failed to fetch fragments:', error)
      throw error
    }
  }

  async createFragment(fragment: {
    content: string
    tags?: string[]
    notes?: any[]
    type?: string
  }): Promise<Fragment> {
    try {
      const data = await this.request('/fragments', {
        method: 'POST',
        body: JSON.stringify({
          content: fragment.content,
          tags: fragment.tags || [],
          notes: fragment.notes || [],
          type: fragment.type || 'fragment'
        }),
      })
      return data.fragment
    } catch (error) {
      console.error('Failed to create fragment:', error)
      throw error
    }
  }

  // 🎯 刪除碎片方法
  async deleteFragment(fragmentId: string): Promise<void> {
    try {
      await this.request(`/fragments/${fragmentId}`, {
        method: 'DELETE',
      })
      console.log(`✅ 成功刪除碎片: ${fragmentId}`)
    } catch (error) {
      console.error('Failed to delete fragment:', error)
      throw error
    }
  }

  // Notes API
  async addNoteToFragment(fragmentId: string, note: {
    id?: string
    title: string
    value: string
    color?: string
    isPinned?: boolean
  }): Promise<Note> {
    try {
      const data = await this.request(`/fragments/${fragmentId}/notes`, {
        method: 'POST',
        body: JSON.stringify({
          id: note.id || crypto.randomUUID(),
          title: note.title,
          value: note.value,
          color: note.color,
          isPinned: note.isPinned || false
        }),
      })
      return data.note
    } catch (error) {
      console.error('Failed to add note:', error)
      throw error
    }
  }

  async updateNote(
    fragmentId: string, 
    noteId: string, 
    updates: Partial<Note>
  ): Promise<void> {
    try {
      await this.request(`/fragments/${fragmentId}/notes`, {
        method: 'PATCH',
        body: JSON.stringify({
          noteId,
          ...updates
        }),
      })
    } catch (error) {
      console.error('Failed to update note:', error)
      throw error
    }
  }

  async deleteNote(fragmentId: string, noteId: string): Promise<void> {
    try {
      await this.request(`/fragments/${fragmentId}/notes?noteId=${noteId}`, {
        method: 'DELETE',
      })
    } catch (error) {
      console.error('Failed to delete note:', error)
      throw error
    }
  }

  // Tags API  
  async addTagToFragment(fragmentId: string, tag: string): Promise<void> {
    try {
      await this.request(`/fragments/${fragmentId}/tags`, {
        method: 'POST',
        body: JSON.stringify({ tag }),
      })
    } catch (error) {
      console.error('Failed to add tag:', error)
      throw error
    }
  }

  async removeTagFromFragment(fragmentId: string, tag: string): Promise<void> {
    try {
      await this.request(
        `/fragments/${fragmentId}/tags?tag=${encodeURIComponent(tag)}`, 
        {
          method: 'DELETE',
        }
      )
    } catch (error) {
      console.error('Failed to remove tag:', error)
      throw error
    }
  }
}

export const apiClient = new ApiClient()

// 🔧 新增：在Store中使用改進的健康檢查
// 在 useFragmentsStore.ts 的 initialize 方法中:

/*
console.log('🩺 執行健康檢查')
const healthCheck = await apiClient.healthCheck()

if (!healthCheck) {
  console.log('❌ 健康檢查失敗 - 可能是認證問題')
  
  // 🔧 額外檢查：嘗試刷新認證狀態
  const authStatus = await apiClient.checkAuthStatus()
  if (!authStatus) {
    console.log('🔍 確認認證失效，設置為需要登入')
    set({ 
      isAuthenticated: false,
      loadingState: AppLoadingState.LOADED,
      isLoading: false,
      hasInitialized: true 
    })
    return
  }
  
  // 如果認證正常但健康檢查失敗，設置為錯誤狀態
  set({ 
    isAuthenticated: true,
    loadingState: AppLoadingState.ERROR,
    isLoading: false,
    hasInitialized: true,
    error: '服務健康檢查失敗'
  })
  return
}
*/