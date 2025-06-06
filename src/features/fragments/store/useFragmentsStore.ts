'use client'

import { create } from 'zustand'
import { Fragment, Note } from '@/features/fragments/types/fragment'
import { apiClient } from '@/services/api-client'
import { ParsedSearch, SearchToken } from '@/features/search/useAdvancedSearch'
import { matchText, matchFragment, matchesSearchToken } from '@/features/search/searchHelpers'
import { isDateInRange } from '@/features/fragments/utils'
import { SORT_FIELDS, SORT_ORDERS } from '@/features/fragments/constants'

// 使用常量來定義排序方式
type SortField = typeof SORT_FIELDS[keyof typeof SORT_FIELDS]
type SortOrder = typeof SORT_ORDERS[keyof typeof SORT_ORDERS]
type Mode = 'float' | 'list'

export type TagLogicMode = 'AND' | 'OR'

interface FragmentsState {
  fragments: Fragment[]
  searchQuery: string
  searchKeyword: string
  selectedTags: string[]
  excludedTags: string[]
  tagLogicMode: TagLogicMode
  sortField: SortField
  sortOrder: SortOrder
  selectedFragment: Fragment | null
  mode: Mode
  advancedSearch: ParsedSearch | null
  isLoading: boolean
  error: string | null

  // 操作方法
  load: () => Promise<void>
  save: () => void
  setFragments: (fragments: Fragment[]) => void
  setSearchQuery: (query: string) => void
  setSelectedTags: (tags: string[]) => void
  setExcludedTags: (tags: string[]) => void
  setTagLogicMode: (mode: TagLogicMode) => void
  setSortField: (field: SortField) => void
  setSortOrder: (order: SortOrder) => void
  setSelectedFragment: (fragment: Fragment | null) => void
  setMode: (mode: Mode) => void
  setAdvancedSearch: (search: ParsedSearch | null) => void
  setSearchKeyword: (keyword: string) => void
  setError: (error: string | null) => void
  setLoading: (loading: boolean) => void

  // 進階功能
  getFilteredFragments: () => Fragment[]
  getFilteredFragmentsByAdvancedSearch: () => Fragment[]

  // Fragment 操作 - 修正為正確的 API 呼叫
  addFragment: (content: string, tags: string[], notes: Note[]) => Promise<void>
  deleteFragment: (fragmentId: string) => Promise<void> 
  addNoteToFragment: (fragmentId: string, note: Note) => Promise<void>
  updateNoteInFragment: (fragmentId: string, noteId: string, updates: Partial<Note>) => Promise<void>
  removeNoteFromFragment: (fragmentId: string, noteId: string) => Promise<void>
  reorderNotesInFragment: (fragmentId: string, newOrder: string[]) => void
  addTagToFragment: (fragmentId: string, tag: string) => Promise<void>
  removeTagFromFragment: (fragmentId: string, tag: string) => Promise<void>
}

// 檢查是否在客戶端環境
const isClient = typeof window !== 'undefined'

// 📄 修復後的 useFragmentsStore.ts

export const useFragmentsStore = create<FragmentsState>((set, get) => ({
  fragments: [],
  searchQuery: '',
  searchKeyword: '',
  selectedTags: [],
  excludedTags: [],
  tagLogicMode: 'AND',
  sortField: SORT_FIELDS.CREATED_AT,
  sortOrder: SORT_ORDERS.DESC,
  selectedFragment: null,
  mode: 'float',
  advancedSearch: null,
  isLoading: false,
  error: null,

  // 設置錯誤狀態
  setError: (error) => set({ error }),
  
  // 設置載入狀態
  setLoading: (loading) => set({ isLoading: loading }),

  // 載入碎片資料
  load: async () => {
    if (!isClient) return
    
    set({ isLoading: true, error: null })
    
    try {
      const fragments = await apiClient.getFragments()
      set({ fragments, error: null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load fragments'
      console.error('Failed to load fragments:', error)
      set({ error: errorMessage })
    } finally {
      set({ isLoading: false })
    }
  },

  // 儲存碎片資料 (已移除本地存儲邏輯)
  save: () => {
    console.log('Save function called - fragments are now saved immediately via API')
  },

  // 設置整個碎片陣列
  setFragments: (fragments) => {
    set({ fragments })
  },

  // 其他 setter 方法保持不變
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedTags: (tags) => set({ selectedTags: tags }),
  setExcludedTags: (tags) => set({ excludedTags: tags }),
  setTagLogicMode: (mode) => set({ tagLogicMode: mode }),
  setSortField: (field) => set({ sortField: field }),
  setSortOrder: (order) => set({ sortOrder: order }),
  setSelectedFragment: (fragment) => set({ selectedFragment: fragment }),
  setMode: (mode) => set({ mode }),
  setAdvancedSearch: (search) => set({ advancedSearch: search }),
  setSearchKeyword: (keyword) => set({ searchKeyword: keyword }),

  // 篩選方法保持不變
  getFilteredFragments: () => {
    const {
      fragments,
      searchQuery,
      selectedTags,
      excludedTags,
      tagLogicMode,
      advancedSearch
    } = get() as FragmentsState
  
    if (advancedSearch) {
      return get().getFilteredFragmentsByAdvancedSearch()
    }
  
    const mode = 'substring'
    
    return fragments.filter(fragment => {
      if (searchQuery && !matchText(fragment.content, searchQuery, mode)) {
        const noteMatches = fragment.notes.some(note => 
          matchText(note.title, searchQuery, mode) || 
          matchText(note.value, searchQuery, mode)
        )
        if (!noteMatches) return false
      }
  
      if (excludedTags.length > 0 && excludedTags.some(tag => fragment.tags.includes(tag))) {
        return false
      }
  
      if (selectedTags.length === 0) return true
  
      return tagLogicMode === 'AND'
        ? selectedTags.every(tag => fragment.tags.includes(tag))
        : selectedTags.some(tag => fragment.tags.includes(tag))
    })
  },

  getFilteredFragmentsByAdvancedSearch: () => {
    const { fragments, advancedSearch } = get()
    if (!advancedSearch) return fragments
  
    const {
      tokens,
      scopes,
      matchMode,
      timeRange,
      customStartDate,
      customEndDate
    } = advancedSearch
  
    return fragments.filter(fragment => {
      if (!scopes.includes('fragment') && !scopes.includes('note') && !scopes.includes('tag')) {
        return false
      }
  
      const dateField = fragment.updatedAt || fragment.createdAt
      if (!isDateInRange(dateField, timeRange, customStartDate, customEndDate)) {
        return false
      }
  
      return matchFragment(fragment, tokens, matchMode, scopes)
    })
  },

  /**
   * 添加新碎片 - 修正版本
   */
  addFragment: async (content, tags, notes) => {
    if (!isClient) return
    
    set({ isLoading: true, error: null })
    
    try {
      const newFragment = await apiClient.createFragment({
        content,
        tags,
        notes,
        type: 'fragment'
      })
      
      set(state => ({
        fragments: [newFragment, ...state.fragments],
        error: null
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add fragment'
      console.error('Failed to add fragment:', error)
      set({ error: errorMessage })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  /**
   * 🎯 刪除碎片 - 移到正確位置
   */
  deleteFragment: async (fragmentId) => {
    if (!isClient) return
    
    set({ isLoading: true, error: null })
    
    try {
      // 呼叫 API 刪除碎片
      await apiClient.deleteFragment(fragmentId)
      
      // 從本地狀態移除碎片
      set(state => ({
        fragments: state.fragments.filter(f => f.id !== fragmentId),
        selectedFragment: state.selectedFragment?.id === fragmentId ? null : state.selectedFragment,
        error: null
      }))
      
      console.log(`✅ 成功刪除碎片 ${fragmentId}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete fragment'
      console.error('Failed to delete fragment:', error)
      set({ error: errorMessage })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  /**
   * 添加筆記到碎片 - 修正版本
   */
  addNoteToFragment: async (fragmentId, note) => {
    try {
      // apiClient.addNoteToFragment 返回 Note 物件，不是 boolean
      const addedNote = await apiClient.addNoteToFragment(fragmentId, note)
      
      const updatedAt = new Date().toISOString()
      
      set(state => ({
        fragments: state.fragments.map(f =>
          f.id === fragmentId
            ? {
                ...f,
                notes: [...f.notes, addedNote],
                updatedAt
              }
            : f
        ),
        error: null
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add note'
      console.error('Failed to add note to fragment:', error)
      set({ error: errorMessage })
      throw error
    }
  },

  /**
   * 更新碎片中的筆記 - 修正版本
   */
  updateNoteInFragment: async (fragmentId, noteId, updates) => {
    try {
      // apiClient.updateNote 返回 void，但成功時不拋錯誤
      await apiClient.updateNote(fragmentId, noteId, updates)
      
      set(state => ({
        fragments: state.fragments.map(f =>
          f.id === fragmentId
            ? {
              ...f,
              notes: f.notes.map(n => n.id === noteId ? { ...n, ...updates } : n),
              updatedAt: new Date().toISOString()
            }
            : f
        ),
        error: null
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update note'
      console.error('Failed to update note:', error)
      set({ error: errorMessage })
      throw error
    }
  },

  /**
   * 從碎片移除筆記 - 修正版本
   */
  removeNoteFromFragment: async (fragmentId, noteId) => {
    try {
      // apiClient.deleteNote 返回 void，但成功時不拋錯誤
      await apiClient.deleteNote(fragmentId, noteId)
      
      set(state => ({
        fragments: state.fragments.map(f =>
          f.id === fragmentId
            ? {
              ...f,
              notes: f.notes.filter(n => n.id !== noteId),
              updatedAt: new Date().toISOString()
            }
            : f
        ),
        error: null
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove note'
      console.error('Failed to remove note:', error)
      set({ error: errorMessage })
      throw error
    }
  },

  /**
   * 重新排序碎片中的筆記 - 這個只更新本地狀態，不需要 API
   */
  reorderNotesInFragment: (fragmentId, newOrder) => {
    set(state => ({
      fragments: state.fragments.map(f => {
        if (f.id !== fragmentId) return f
        
        const notesMap = Object.fromEntries(f.notes.map(n => [n.id, n]))
        const orderedNotes = newOrder
          .map(id => notesMap[id])
          .filter(Boolean)
        
        return {
          ...f,
          notes: orderedNotes,
          updatedAt: new Date().toISOString()
        }
      })
    }))
  },

  /**
   * 添加標籤到碎片 - 修正版本
   */
  addTagToFragment: async (fragmentId, tag) => {
    try {
      // apiClient.addTagToFragment 返回 void，但成功時不拋錯誤
      await apiClient.addTagToFragment(fragmentId, tag)
      
      set(state => ({
        fragments: state.fragments.map(f =>
          f.id === fragmentId && !f.tags.includes(tag)
            ? {
                ...f,
                tags: [...f.tags, tag],
                updatedAt: new Date().toISOString()
              }
            : f
        ),
        error: null
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add tag'
      console.error('Failed to add tag to fragment:', error)
      set({ error: errorMessage })
      throw error
    }
  },

  /**
   * 從碎片移除標籤 - 修正版本
   */
  removeTagFromFragment: async (fragmentId, tag) => {
    try {
      // apiClient.removeTagFromFragment 返回 void，但成功時不拋錯誤
      await apiClient.removeTagFromFragment(fragmentId, tag)
      
      set(state => ({
        fragments: state.fragments.map(f =>
          f.id === fragmentId
            ? {
                ...f,
                tags: f.tags.filter(t => t !== tag),
                updatedAt: new Date().toISOString()
              }
            : f
        ),
        error: null
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove tag'
      console.error('Failed to remove tag from fragment:', error)
      set({ error: errorMessage })
      throw error
    }
  },

}))