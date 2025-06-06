// services/api-client.ts
'use client'
import { Fragment, Note } from '@/features/fragments/types/fragment'
import { getSupabaseClient } from '@/lib/supabase/client'

class ApiClient {
  private baseUrl = '/api'

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const supabase = getSupabaseClient()
    if (!supabase) {
      throw new Error('Supabase client not available')
    }
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('No authentication token available')
    }
    
    return {
      'Authorization': `Bearer ${session.access_token}`
    }
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`
    
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

      console.log(`🔗 API Request: ${options.method || 'GET'} ${endpoint}`)
      
      const response = await fetch(url, config)
      
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
      console.error(`❌ API request failed [${endpoint}]:`, error)
      throw error
    }
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

  // 🎯 新增：刪除碎片方法（添加到 createFragment 方法後面）
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

  // 健康檢查
  async healthCheck(): Promise<boolean> {
    try {
      await this.getFragments()
      return true
    } catch (error) {
      console.error('Health check failed:', error)
      return false
    }
  }
}

export const apiClient = new ApiClient()