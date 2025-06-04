// services/api-client.ts
'use client'
import { Fragment, Note } from '@/features/fragments/types/fragment'
import { getSupabaseClient } from '@/lib/supabase/client'

class ApiClient {
  private baseUrl = '/api'

  private async getAuthHeaders(): Promise<Record<string, string>> {
    // 開發模式不需要認證 headers
    if (process.env.NODE_ENV === 'development') {
      return {}
    }

    // 生產模式需要認證
    const supabase = getSupabaseClient()
    if (!supabase) {
      throw new Error('Supabase client not available')
    }
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('No authentication token')
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

      // 如果有額外的 headers，加入它們
      if (options.headers) {
        const optionHeaders = options.headers as Record<string, string>
        Object.assign(headers, optionHeaders)
      }
      
      const config: RequestInit = {
        ...options,
        headers,
      }

      const response = await fetch(url, config)
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }))
        throw new Error(error.error || `HTTP ${response.status}`)
      }
      
      return response.json()
    } catch (error) {
      console.error(`API request failed [${endpoint}]:`, error)
      throw error
    }
  }

  // Fragments API
  async getFragments(): Promise<Fragment[]> {
    const data = await this.request('/fragments')
    return data.fragments
  }

  async createFragment(fragment: {
    content: string
    tags: string[]
    notes: any[]
    type?: string
  }): Promise<Fragment> {
    const data = await this.request('/fragments', {
      method: 'POST',
      body: JSON.stringify(fragment),
    })
    return data.fragment
  }

  // Notes API
  async addNoteToFragment(fragmentId: string, note: any): Promise<boolean> {
    try {
      await this.request(`/fragments/${fragmentId}/notes`, {
        method: 'POST',
        body: JSON.stringify(note),
      })
      return true
    } catch (error) {
      console.error('Failed to add note:', error)
      return false
    }
  }

  async updateNote(fragmentId: string, noteId: string, updates: Partial<Note>): Promise<boolean> {
    try {
      await this.request(`/fragments/${fragmentId}/notes/${noteId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
      return true
    } catch (error) {
      console.error('Failed to update note:', error)
      return false
    }
  }

  async deleteNote(fragmentId: string, noteId: string): Promise<boolean> {
    try {
      await this.request(`/fragments/${fragmentId}/notes/${noteId}`, {
        method: 'DELETE',
      })
      return true
    } catch (error) {
      console.error('Failed to delete note:', error)
      return false
    }
  }

  // Tags API  
  async addTagToFragment(fragmentId: string, tag: string): Promise<boolean> {
    try {
      await this.request(`/fragments/${fragmentId}/tags`, {
        method: 'POST',
        body: JSON.stringify({ tag }),
      })
      return true
    } catch (error) {
      console.error('Failed to add tag:', error)
      return false
    }
  }

  async removeTagFromFragment(fragmentId: string, tag: string): Promise<boolean> {
    try {
      await this.request(`/fragments/${fragmentId}/tags/${encodeURIComponent(tag)}`, {
        method: 'DELETE',
      })
      return true
    } catch (error) {
      console.error('Failed to remove tag:', error)
      return false
    }
  }
}

export const apiClient = new ApiClient()