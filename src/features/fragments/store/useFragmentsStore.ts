'use client'

import { create } from 'zustand'
import { Fragment, Note } from '@/features/fragments/types/fragment'
import { loadFragments, saveFragments } from '@/features/fragments/services/SupabaseFragmentsRepository'
import { v4 as uuidv4 } from 'uuid'
import { ParsedSearch, SearchToken } from '@/features/search/useAdvancedSearch'
import { matchText, matchFragment, matchesSearchToken } from '@/features/search/searchHelpers'
import { isDateInRange } from '@/features/fragments/utils'
import { SORT_FIELDS, SORT_ORDERS } from '@/features/fragments/constants'
import { getNotesByFragmentId } from '@/features/fragments/services/SupabaseNotesRepository'
import { addNote } from '@/features/fragments/services/SupabaseNotesRepository'
import { getTagsByFragmentId } from '@/features/fragments/services/SupabaseTagsRepository'
import {
  addTagToFragment as addTagRemote,
  removeTagFromFragment as removeTagRemote
} from '@/features/fragments/services/SupabaseTagsRepository'

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

  // 操作方法
  load: () => void
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

  // 進階功能
  getFilteredFragments: () => Fragment[]
  getFilteredFragmentsByAdvancedSearch: () => Fragment[]

  // Fragment 操作
  addFragment: (content: string, tags: string[], notes: Note[]) => void
  addNoteToFragment: (fragmentId: string, note: Note) => void
  updateNoteInFragment: (fragmentId: string, noteId: string, updates: Partial<Note>) => void
  removeNoteFromFragment: (fragmentId: string, noteId: string) => void
  reorderNotesInFragment: (fragmentId: string, newOrder: string[]) => void
  addTagToFragment: (fragmentId: string, tag: string) => void
  removeTagFromFragment: (fragmentId: string, tag: string) => void
}

// 檢查是否在客戶端環境
const isClient = typeof window !== 'undefined'

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

  // 載入碎片資料
    load: async () => {
    if (!isClient) return
    const fragments = await loadFragments()

    const fragmentsWithAll = await Promise.all(
      fragments.map(async (f) => ({
        ...f,
        notes: await getNotesByFragmentId(f.id),
        tags: await getTagsByFragmentId(f.id)
      }))
    )

    set({ fragments: fragmentsWithAll })
  },

  // 儲存碎片資料
  save: () => {
    if (!isClient) return
    const { fragments } = get()
    saveFragments(fragments)
  },

  // 設置整個碎片陣列
  setFragments: (fragments) => {
    set({ fragments })
    // 自動儲存到本地
    if (isClient) {
      localStorage.removeItem('fragment_positions') 
      setTimeout(() => saveFragments(fragments), 0)
    }
  },

  // 設置搜尋查詢
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  // 設置選定標籤
  setSelectedTags: (tags) => set({ selectedTags: tags }),
  
  // 設置排除的標籤
  setExcludedTags: (tags) => set({ excludedTags: tags }),
  
  // 設置標籤邏輯模式（AND/OR）
  setTagLogicMode: (mode) => set({ tagLogicMode: mode }),
  
  // 設置排序欄位
  setSortField: (field) => set({ sortField: field }),
  
  // 設置排序順序
  setSortOrder: (order) => set({ sortOrder: order }),
  
  // 設置選定的碎片
  setSelectedFragment: (fragment) => set({ selectedFragment: fragment }),
  
  // 設置顯示模式
  setMode: (mode) => set({ mode }),
  
  // 設置進階搜尋
  setAdvancedSearch: (search) => set({ advancedSearch: search }),
  
  // 設置搜尋關鍵字
  setSearchKeyword: (keyword) => set({ searchKeyword: keyword }),

  /**
   * 獲取篩選後的碎片
   * 基於關鍵字搜尋、標籤篩選等條件
   */
  getFilteredFragments: () => {
    const {
      fragments,
      searchQuery,
      selectedTags,
      excludedTags,
      tagLogicMode,
      advancedSearch
    } = get() as FragmentsState
  
    // 如果有進階搜尋，優先使用
    if (advancedSearch) {
      return get().getFilteredFragmentsByAdvancedSearch()
    }
  
    const mode = 'substring' // 默認搜尋模式
    
    return fragments.filter(fragment => {
      // 關鍵字篩選
      if (searchQuery && !matchText(fragment.content, searchQuery, mode)) {
        // 如果有關鍵字且內容不匹配，還檢查筆記是否匹配
        const noteMatches = fragment.notes.some(note => 
          matchText(note.title, searchQuery, mode) || 
          matchText(note.value, searchQuery, mode)
        )
        if (!noteMatches) return false
      }
  
      // 排除標籤篩選
      if (excludedTags.length > 0 && excludedTags.some(tag => fragment.tags.includes(tag))) {
        return false
      }
  
      // 選定標籤篩選
      if (selectedTags.length === 0) return true
  
      return tagLogicMode === 'AND'
        ? selectedTags.every(tag => fragment.tags.includes(tag))
        : selectedTags.some(tag => fragment.tags.includes(tag))
    })
  },

  /**
   * 基於進階搜尋條件獲取篩選後的碎片
   */
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
      // 範圍檢查 - 確保只在選定的範圍中搜尋
      if (!scopes.includes('fragment') && !scopes.includes('note') && !scopes.includes('tag')) {
        return false
      }
  
      // 時間檢查
      const dateField = fragment.updatedAt || fragment.createdAt
      if (!isDateInRange(dateField, timeRange, customStartDate, customEndDate)) {
        return false
      }
  
      // 使用 matchFragment 函數進行搜尋
      return matchFragment(fragment, tokens, matchMode, scopes)
    })
  },

  /**
   * 添加新碎片
   */
  addFragment: (content, tags, notes) => {
    const now = new Date().toISOString()
    const newFragment: Fragment = {
      id: uuidv4(),
      content,
      type: 'fragment',
      tags,
      notes,
      createdAt: now,
      updatedAt: now,
    }

    set(state => ({
      fragments: [newFragment, ...state.fragments]
    }))

    // 自動儲存
    if (isClient) {
      get().save()
    }
  },

  /**
   * 添加筆記到碎片
   */
    addNoteToFragment: async (fragmentId, note) => {
    const updatedAt = new Date().toISOString()

    // 更新 Zustand 狀態
    set(state => ({
      fragments: state.fragments.map(f =>
        f.id === fragmentId
          ? {
              ...f,
              notes: [...f.notes, note],
              updatedAt
            }
          : f
      )
    }))

    // 同步寫入 Supabase
    await addNote(fragmentId, note)
  },

  /**
   * 更新碎片中的筆記
   */
  updateNoteInFragment: (fragmentId, noteId, updates) => {
    set(state => ({
      fragments: state.fragments.map(f =>
        f.id === fragmentId
          ? {
            ...f,
            notes: f.notes.map(n => n.id === noteId ? { ...n, ...updates } : n),
            updatedAt: new Date().toISOString()
          }
          : f
      )
    }))
    
    // 自動儲存
    if (isClient) {
      get().save()
    }
  },

  /**
   * 從碎片移除筆記
   */
  removeNoteFromFragment: (fragmentId, noteId) => {
    set(state => ({
      fragments: state.fragments.map(f =>
        f.id === fragmentId
          ? {
            ...f,
            notes: f.notes.filter(n => n.id !== noteId),
            updatedAt: new Date().toISOString()
          }
          : f
      )
    }))
    
    // 自動儲存
    if (isClient) {
      get().save()
    }
  },

  /**
   * 重新排序碎片中的筆記
   */
  reorderNotesInFragment: (fragmentId, newOrder) => {
    set(state => ({
      fragments: state.fragments.map(f => {
        if (f.id !== fragmentId) return f
        
        // 創建筆記映射，保持筆記內容引用
        const notesMap = Object.fromEntries(f.notes.map(n => [n.id, n]))
        
        // 根據新順序重新排列筆記
        const orderedNotes = newOrder
          .map(id => notesMap[id])
          .filter(Boolean) // 過濾出任何未找到的筆記ID
        
        return {
          ...f,
          notes: orderedNotes,
          updatedAt: new Date().toISOString()
        }
      })
    }))
    
    // 自動儲存
    if (isClient) {
      get().save()
    }
  },

  /**
   * 添加標籤到碎片
   */
   addTagToFragment: async (fragmentId, tag) => {
  set(state => ({
    fragments: state.fragments.map(f =>
      f.id === fragmentId && !f.tags.includes(tag)
        ? {
            ...f,
            tags: [...f.tags, tag],
            updatedAt: new Date().toISOString()
          }
        : f
    )
  }))

  await addTagRemote(fragmentId, tag)
  },

  /**
   * 從碎片移除標籤
   */
  removeTagFromFragment: async (fragmentId, tag) => {
  set(state => ({
    fragments: state.fragments.map(f =>
      f.id === fragmentId
        ? {
            ...f,
            tags: f.tags.filter(t => t !== tag),
            updatedAt: new Date().toISOString()
          }
        : f
    )
  }))

  await removeTagRemote(fragmentId, tag)
},
}))