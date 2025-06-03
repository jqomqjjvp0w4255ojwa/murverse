'use client'
import { Fragment } from '@/features/fragments/types/fragment'

class ApiClient {
  private baseUrl = '/api'

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }

    const response = await fetch(url, config)
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }
    
    return response.json()
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
}

export const apiClient = new ApiClient()
