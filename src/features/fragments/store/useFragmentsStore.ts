'use client'

import { create } from 'zustand'
import { Fragment, Note } from '@/features/fragments/types/fragment'
import { loadFragments, saveFragments } from '@/features/fragments/services/FragmentsRepository'
import { v4 as uuidv4 } from 'uuid'
import { ParsedSearch, SearchToken } from '@/features/search/useAdvancedSearch'
import {
  matchesSearchToken,
} from '@/features/search/searchHelpers'
import { matchText } from '@/features/search/searchHelpers'
import {
  matchFragment,
} from '@/features/search/searchHelpers'


type SortField = 'createdAt' | 'content' | 'updatedAt'
type SortOrder = 'asc' | 'desc'
type Mode = 'float' | 'list'

export type TagLogicMode = 'AND' | 'OR'

interface FragmentsState {
  fragments: Fragment[]
  searchQuery: string
  searchKeyword: string
  setSearchKeyword: (keyword: string) => void
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

// 檢查日期是否在指定範圍內
const isDateInRange = (dateStr: string, timeRange: string, customStart?: Date, customEnd?: Date): boolean => {
  const date = new Date(dateStr)
  const now = new Date()
  
  // 重置當前時間為當天開始（00:00:00）
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  switch(timeRange) {
    case 'today':
      return date >= today
    case 'yesterday': {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      return date >= yesterday && date < today
    }
    case 'week': {
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay()) // 設為本週日（一週的開始）
      return date >= weekStart
    }
    case 'month': {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      return date >= monthStart
    }
    case 'custom':
      return (
        (!customStart || date >= customStart) && 
        (!customEnd || date <= customEnd)
      )
    case 'all':
    default:
      return true
  }
}



export const useFragmentsStore = create<FragmentsState>((set, get) => ({
  fragments: [],
  searchQuery: '',
  searchKeyword: '',
  selectedTags: [],
  excludedTags: [],
  tagLogicMode: 'AND',
  sortField: 'createdAt',
  sortOrder: 'desc',
  selectedFragment: null,
  mode: 'float',
  advancedSearch: null,

  load: () => {
    if (!isClient) return
    const fragments = loadFragments()
    set({ fragments })
  },

  save: () => {
    if (!isClient) return
    const { fragments } = get()
    saveFragments(fragments)
  },

  setFragments: (fragments) => set({ fragments }),
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

  getFilteredFragments: () => {
    const {
      fragments,
      searchQuery,
      selectedTags,
      excludedTags,
      tagLogicMode,
      advancedSearch
    } = get() as FragmentsState
  
    const mode = advancedSearch?.matchMode ?? 'substring'
    
    if (advancedSearch) {
      return get().getFilteredFragmentsByAdvancedSearch()
    }
  
    return fragments.filter(fragment => {
      if (searchQuery && !matchText(fragment.content, searchQuery, mode)) {
        return false
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
      // 範圍檢查 - 確保只在選定的範圍中搜尋
      if (!scopes.includes('fragment') && !scopes.includes('note') && !scopes.includes('tag')) {
        return false
      }
  
      // 時間檢查
      const dateField = fragment.updatedAt || fragment.createdAt
      if (!isDateInRange(dateField, timeRange, customStartDate, customEndDate)) {
        return false
      }
  
      // 使用修改後的 matchFragment 函數進行搜尋
      return matchFragment(fragment, tokens, matchMode, scopes)
    })
  },


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

    if (isClient) {
      get().save()
    }
  },

  addNoteToFragment: (fragmentId, note) => {
    set(state => ({
      fragments: state.fragments.map(f =>
        f.id === fragmentId
          ? { ...f, notes: [...f.notes, note], updatedAt: new Date().toISOString() }
          : f
      )
    }))
    if (isClient) {
      get().save()
    }
  },

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
    if (isClient) {
      get().save()
    }
  },

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
    if (isClient) {
      get().save()
    }
  },

  reorderNotesInFragment: (fragmentId, newOrder) => {
    set(state => ({
      fragments: state.fragments.map(f => {
        if (f.id !== fragmentId) return f
        const notesMap = Object.fromEntries(f.notes.map(n => [n.id, n]))
        const orderedNotes = newOrder.map(id => notesMap[id]).filter(Boolean)
        return {
          ...f,
          notes: orderedNotes,
          updatedAt: new Date().toISOString()
        }
      })
    }))
    if (isClient) {
      get().save()
    }
  },

  addTagToFragment: (fragmentId, tag) => {
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
    if (isClient) {
      get().save()
    }
  },

  removeTagFromFragment: (fragmentId, tag) => {
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
    if (isClient) {
      get().save()
    }
  },
}))