// 🚀 修復版 useFragmentsStore.ts - 修復搜尋衝突問題
'use client'

import { create } from 'zustand'
import { Fragment, Note } from '@/features/fragments/types/fragment'
import { apiClient } from '@/services/api-client'
import { ParsedSearch } from '@/features/search/useAdvancedSearch'
import { matchText, matchFragment } from '@/features/search/searchHelpers'
import { isDateInRange } from '@/features/fragments/utils'
import { SORT_FIELDS, SORT_ORDERS } from '@/features/fragments/constants'
import { getSupabaseClient } from '@/lib/supabase/client'
import { FragmentsCacheService } from '@/features/fragments/services/FragmentsCacheService'

type SortField = typeof SORT_FIELDS[keyof typeof SORT_FIELDS]
type SortOrder = typeof SORT_ORDERS[keyof typeof SORT_ORDERS]
type Mode = 'grid' | 'flow'
export type TagLogicMode = 'AND' | 'OR'

export enum AppStatus {
  LOADING = 'loading',
  READY = 'ready',
  EMPTY = 'empty',
  UNAUTHENTICATED = 'auth',
  ERROR = 'error'
}

// 🚀 加載來源類型
export enum LoadSource {
  CACHE = 'cache',
  NETWORK = 'network'
}

interface FragmentsState {
  // === 核心數據 ===
  fragments: Fragment[] | null
  
  // === 搜尋和篩選 ===
  searchQuery: string
  searchKeyword: string
  selectedTags: string[]
  excludedTags: string[]
  tagLogicMode: TagLogicMode
  sortField: SortField
  sortOrder: SortOrder
  advancedSearch: ParsedSearch | null
  
  // === UI 狀態 ===
  selectedFragment: Fragment | null
  mode: Mode
  
  // === 狀態管理 ===
  status: AppStatus
  error: string | null
  hasInitialized: boolean
  
  // 🚀 緩存相關狀態
  loadSource: LoadSource | null
  isBackgroundRefreshing: boolean
  
  // === 操作方法 ===
  initialize: () => Promise<void>
  load: () => Promise<void>
  
  // 🚀 緩存控制方法
  clearCache: () => void
  getCacheStats: () => Promise<any>
  
  // === Setters ===
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
  
  // === 篩選方法 ===
  getFilteredFragments: () => Fragment[]
  getFilteredFragmentsByAdvancedSearch: () => Fragment[]
  getDisplayFragments: () => Fragment[] // 🚀 新增：統一的顯示碎片方法
  
  // === Fragment 操作 ===
  addFragment: (content: string, tags: string[], notes: Note[]) => Promise<void>
  deleteFragment: (fragmentId: string) => Promise<void>
  
  // === 樂觀更新重試機制 ===
  retryOperation: (fragmentId: string) => Promise<void>
  abandonOperation: (fragmentId: string) => void
  
  // === Note 操作 ===
  addNoteToFragment: (fragmentId: string, note: Note) => Promise<void>
  updateNoteInFragment: (fragmentId: string, noteId: string, updates: Partial<Note>) => Promise<void>
  removeNoteFromFragment: (fragmentId: string, noteId: string) => Promise<void>
  
  // === Tag 操作 ===
  addTagToFragment: (fragmentId: string, tag: string) => Promise<void>
  removeTagFromFragment: (fragmentId: string, tag: string) => Promise<void>
}

const isClient = typeof window !== 'undefined'

// 🚀 輔助函數：獲取用戶ID
async function getUserId(): Promise<string | null> {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) return null
    
    const { data: { session } } = await supabase.auth.getSession()
    return session?.user?.id || null
  } catch {
    return null
  }
}

export const useFragmentsStore = create<FragmentsState>((set, get) => ({
  // === 初始狀態 ===
  fragments: [], 
  searchQuery: '',
  searchKeyword: '',
  selectedTags: [],
  excludedTags: [],
  tagLogicMode: 'AND',
  sortField: SORT_FIELDS.CREATED_AT,
  sortOrder: SORT_ORDERS.DESC,
  selectedFragment: null,
  mode: 'grid',
  advancedSearch: null,
  status: AppStatus.LOADING,
  error: null,
  hasInitialized: false,
  
  // 🚀 緩存狀態
  loadSource: null,
  isBackgroundRefreshing: false,

  // 🚀 智能初始化 - 先緩存後網絡
  initialize: async () => {
    if (!isClient) return
    
    const currentState = get()
    if (currentState.hasInitialized) return
    
    console.log('🎯 開始智能載入...')
    set({ status: AppStatus.LOADING, error: null, hasInitialized: false })

    try {
      const supabase = getSupabaseClient()
      if (!supabase) {
        set({ 
          status: AppStatus.ERROR, 
          error: 'Supabase 不可用',
          hasInitialized: true 
        })
        return
      }

      // 檢查認證
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      
      if (authError) {
        set({ 
          status: AppStatus.ERROR, 
          error: `認證失敗: ${authError.message}`,
          hasInitialized: true 
        })
        return
      }
      
      if (!session) {
        console.log('🚫 用戶未認證')
        set({ 
          status: AppStatus.UNAUTHENTICATED, 
          fragments: [],
          hasInitialized: true 
        })
        return
      }

      const userId = session.user.id

      // 🎯 先嘗試從緩存載入
      const cachedFragments = FragmentsCacheService.getFragments(userId)
      
      if (cachedFragments) {
        // 緩存命中，立即顯示
        set({ 
          fragments: cachedFragments,
          status: cachedFragments.length > 0 ? AppStatus.READY : AppStatus.EMPTY,
          error: null,
          hasInitialized: true,
          loadSource: LoadSource.CACHE
        })
        
        // 🚀 後台更新
        set({ isBackgroundRefreshing: true })
        setTimeout(async () => {
          try {
            const networkFragments = await apiClient.getFragments()
            
            // 比較數據是否有變化
            const hasChanged = JSON.stringify(cachedFragments) !== JSON.stringify(networkFragments)
            
            if (hasChanged) {
              FragmentsCacheService.setFragments(userId, networkFragments)
              set({ 
                fragments: networkFragments,
                status: networkFragments.length > 0 ? AppStatus.READY : AppStatus.EMPTY
              })
              console.log('🔄 後台更新完成，數據已刷新')
            } else {
              console.log('✅ 數據無變化，緩存仍然有效')
            }
          } catch (error) {
            console.warn('後台更新失敗:', error)
          } finally {
            set({ isBackgroundRefreshing: false })
          }
        }, 1000)
        
      } else {
        // 緩存未命中，從網絡載入
        console.log('🌐 緩存未命中，從網絡載入')
        const fragments = await apiClient.getFragments()
        
        // 更新緩存
        FragmentsCacheService.setFragments(userId, fragments)
        
        set({ 
          fragments,
          status: fragments.length > 0 ? AppStatus.READY : AppStatus.EMPTY,
          error: null,
          hasInitialized: true,
          loadSource: LoadSource.NETWORK
        })
        
        console.log(`🎉 網絡載入完成！獲得 ${fragments.length} 個碎片`)
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '載入失敗'
      console.error('💥 載入錯誤:', error)
      
      set({ 
        status: AppStatus.ERROR,
        error: errorMessage,
        fragments: [],
        hasInitialized: true
      })
    }
  },

  // 重試操作方法
  retryOperation: async (fragmentId: string) => {
    const currentFragments = get().fragments
    if (!currentFragments) return

    const fragment = currentFragments.find(f => f.id === fragmentId)
    if (!fragment || !fragment._operationType) return

    console.log(`🔄 重試操作: ${fragment._operationType} for ${fragmentId}`)

    if (fragment._operationType === 'create') {
      const { content, tags, notes } = fragment
      
      set(state => ({
        fragments: state.fragments ? state.fragments.filter(f => f.id !== fragmentId) : []
      }))
      
      await get().addFragment(content, tags, notes)
      
    } else if (fragment._operationType === 'delete') {
      await get().deleteFragment(fragmentId)
    }
  },

  abandonOperation: (fragmentId: string) => {
    const currentFragments = get().fragments
    if (!currentFragments) return

    const fragment = currentFragments.find(f => f.id === fragmentId)
    if (!fragment || !fragment._operationType) return

    console.log(`❌ 放棄操作: ${fragment._operationType} for ${fragmentId}`)

    if (fragment._operationType === 'create') {
      set(state => ({
        fragments: state.fragments ? state.fragments.filter(f => f.id !== fragmentId) : []
      }))
    } else if (fragment._operationType === 'delete') {
      set(state => ({
        fragments: state.fragments ? state.fragments.map(f => 
          f.id === fragmentId ? {
            ...f,
            _operationStatus: undefined,
            _operationType: undefined,
            _failureReason: undefined,
            _pending: false
          } : f
        ) : []
      }))
    }
  },

  load: async () => {
    if (!isClient) return
    
    try {
      console.log('🔄 重新載入碎片...')
      set({ status: AppStatus.LOADING })
      
      const fragments = await apiClient.getFragments()
      
      // 🚀 更新緩存
      const userId = await getUserId()
      if (userId) {
        FragmentsCacheService.setFragments(userId, fragments)
      }
      
      set({ 
        fragments,
        status: fragments.length > 0 ? AppStatus.READY : AppStatus.EMPTY,
        error: null,
        hasInitialized: true,
        loadSource: LoadSource.NETWORK
      })
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '載入失敗'
      console.error('❌ 載入碎片失敗:', error)
      set({ 
        status: AppStatus.ERROR,
        error: errorMessage,
        fragments: [],
        hasInitialized: true
      })
    }
  },

  // === Setters（保持不變） ===
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
  setError: (error) => set({ error }),

  // === 🔧 修復的篩選方法 ===
  getFilteredFragments: () => {
    const {
      fragments,
      searchQuery,
      selectedTags,
      excludedTags,
      tagLogicMode,
      advancedSearch
    } = get()

    if (!fragments) return []

    // 🔧 傳統篩選邏輯
    console.log('🔍 useFragmentsStore.getFilteredFragments 被調用', {
      hasSearchQuery: !!searchQuery,
      hasSelectedTags: selectedTags.length > 0,
      hasExcludedTags: excludedTags.length > 0,
      hasAdvancedSearch: !!advancedSearch
    })

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

// 🚀 新增：統一的顯示碎片獲取方法（所有顯示模式都使用）
 getDisplayFragments: () => {
  const currentFragments = get().fragments
  if (!currentFragments) return []

  // 🎯 優先使用 SearchStore 的統一顯示邏輯
  let searchStoreState = null
  try {
    if (typeof window !== 'undefined' && (window as any).__SEARCH_STORE__) {
      searchStoreState = (window as any).__SEARCH_STORE__.getState()
    }
  } catch (error) {
    console.warn('🔧 無法訪問 SearchStore，使用傳統篩選邏輯')
  }

  if (searchStoreState) {
    // 🚀 使用 SearchStore 的統一顯示邏輯
    const displayFragments = searchStoreState.getDisplayFragments(currentFragments)
    
    console.log('🎯 Store 層協調：使用 SearchStore 統一邏輯', {
      isSearchActive: searchStoreState.isSearchActive,
      hasSearched: searchStoreState.hasSearched,
      keyword: searchStoreState.keyword,
      resultCount: displayFragments.length,
      originalCount: currentFragments.length
    })
    
    return displayFragments
  }

  // 🔧 回退到傳統篩選邏輯（如果 SearchStore 不可用）
  const {
    selectedTags,
    excludedTags,
    searchQuery,
    advancedSearch
  } = get()

  const hasTraditionalFilters = selectedTags.length > 0 || 
                                excludedTags.length > 0 || 
                                searchQuery.trim() !== '' || 
                                advancedSearch !== null

  if (hasTraditionalFilters) {
    const filtered = get().getFilteredFragments()
    console.log('🔍 Store 層協調：使用傳統篩選', {
      filteredCount: filtered.length,
      originalCount: currentFragments.length
    })
    return filtered
  }

  // 🔧 最後返回所有碎片
  console.log('📋 Store 層協調：顯示所有碎片', {
    count: currentFragments.length
  })
  return currentFragments
},

  getFilteredFragmentsByAdvancedSearch: () => {
    const { fragments, advancedSearch } = get()
    
    if (!fragments || !advancedSearch) return fragments || []
  
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

  // 🚀 樂觀更新 + 緩存同步
  addFragment: async (content, tags, notes) => {
    if (!isClient) return
    
    const currentFragments = get().fragments
    if (!currentFragments) {
      console.warn('碎片尚未載入，無法添加新碎片')
      return
    }
    
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const optimisticFragment: Fragment = {
      id: tempId,
      content,
      tags,
      notes,
      type: 'fragment',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      creator: 'current-user',
      lastEditor: 'current-user',
      childIds: [],
      relations: [],
      _optimistic: true,
      _pending: true
    } as Fragment

    // 立即更新 UI
    const newFragments = [optimisticFragment, ...currentFragments]
    set(() => ({
      fragments: newFragments,
      status: AppStatus.READY
    }))

    try {
      const newFragment = await apiClient.createFragment({
        content, tags, notes, type: 'fragment'
      })
      
      // 成功：替換為真實 Fragment
      const updatedFragments = newFragments.map(f => 
        f.id === tempId ? newFragment : f
      )
      
      set({ fragments: updatedFragments })

      // 🚀 更新緩存
      const userId = await getUserId()
      if (userId) {
        FragmentsCacheService.setFragments(userId, updatedFragments)
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '創建失敗'
      console.error('❌ 創建碎片失敗:', error)
      
      set(state => ({
        fragments: state.fragments ? state.fragments.filter(f => f.id !== tempId) : [],
        error: errorMessage
      }))
    }
  },

  deleteFragment: async (fragmentId: string) => {
    const currentFragments = get().fragments
    if (!currentFragments) return

    const originalFragment = currentFragments.find(f => f.id === fragmentId)
    if (!originalFragment) return

    // 樂觀刪除
    const filteredFragments = currentFragments.filter(f => f.id !== fragmentId)
    
    set(state => ({
      fragments: filteredFragments,
      selectedFragment: state.selectedFragment?.id === fragmentId ? null : state.selectedFragment
    }))

    try {
      await apiClient.deleteFragment(fragmentId)
      console.log(`✅ 刪除成功: ${fragmentId}`)
      
      // 🚀 更新緩存
      const userId = await getUserId()
      if (userId) {
        FragmentsCacheService.setFragments(userId, filteredFragments)
      }
      
    } catch (error) {
      console.error(`❌ 刪除失敗: ${fragmentId}`, error)
      
      set(state => ({
        fragments: state.fragments ? [originalFragment, ...state.fragments] : [originalFragment],
        error: error instanceof Error ? error.message : '刪除失敗'
      }))
    }
  },

  // === Note 操作（保持原有邏輯） ===
  addNoteToFragment: async (fragmentId, note) => {
    const currentFragments = get().fragments
    if (!currentFragments) return

    try {
      const addedNote = await apiClient.addNoteToFragment(fragmentId, note)
      set(state => ({
        fragments: state.fragments ? state.fragments.map(f =>
          f.id === fragmentId
            ? { ...f, notes: [...f.notes, addedNote], updatedAt: new Date().toISOString() }
            : f
        ) : []
      }))
    } catch (error) {
      console.error('添加筆記失敗:', error)
      set({ error: error instanceof Error ? error.message : '添加筆記失敗' })
    }
  },

  updateNoteInFragment: async (fragmentId, noteId, updates) => {
    const currentFragments = get().fragments
    if (!currentFragments) return

    try {
      await apiClient.updateNote(fragmentId, noteId, updates)
      set(state => ({
        fragments: state.fragments ? state.fragments.map(f =>
          f.id === fragmentId
            ? {
              ...f,
              notes: f.notes.map(n => n.id === noteId ? { ...n, ...updates } : n),
              updatedAt: new Date().toISOString()
            }
            : f
        ) : []
      }))
    } catch (error) {
      console.error('更新筆記失敗:', error)
      set({ error: error instanceof Error ? error.message : '更新筆記失敗' })
    }
  },

  removeNoteFromFragment: async (fragmentId, noteId) => {
    const currentFragments = get().fragments
    if (!currentFragments) return

    try {
      await apiClient.deleteNote(fragmentId, noteId)
      set(state => ({
        fragments: state.fragments ? state.fragments.map(f =>
          f.id === fragmentId
            ? {
              ...f,
              notes: f.notes.filter(n => n.id !== noteId),
              updatedAt: new Date().toISOString()
            }
            : f
        ) : []
      }))
    } catch (error) {
      console.error('刪除筆記失敗:', error)
      set({ error: error instanceof Error ? error.message : '刪除筆記失敗' })
    }
  },

  // === Tag 操作（保持原有邏輯） ===
  addTagToFragment: async (fragmentId, tag) => {
    const currentFragments = get().fragments
    if (!currentFragments) return

    try {
      await apiClient.addTagToFragment(fragmentId, tag)
      set(state => ({
        fragments: state.fragments ? state.fragments.map(f =>
          f.id === fragmentId && !f.tags.includes(tag)
            ? { ...f, tags: [...f.tags, tag], updatedAt: new Date().toISOString() }
            : f
        ) : []
      }))
    } catch (error) {
      console.error('添加標籤失敗:', error)
      set({ error: error instanceof Error ? error.message : '添加標籤失敗' })
    }
  },

  removeTagFromFragment: async (fragmentId, tag) => {
    const currentFragments = get().fragments
    if (!currentFragments) return

    try {
      await apiClient.removeTagFromFragment(fragmentId, tag)
      set(state => ({
        fragments: state.fragments ? state.fragments.map(f =>
          f.id === fragmentId
            ? { ...f, tags: f.tags.filter(t => t !== tag), updatedAt: new Date().toISOString() }
            : f
        ) : []
      }))
    } catch (error) {
      console.error('移除標籤失敗:', error)
      set({ error: error instanceof Error ? error.message : '移除標籤失敗' })
    }
  },
  
  clearCache: () => {
    getUserId().then(userId => {
      if (userId) {
        FragmentsCacheService.clearUserCache(userId)
        set({ loadSource: null })
      }
    })
  },

  getCacheStats: () => {
    return getUserId().then(userId => {
      if (!userId) return null
      return FragmentsCacheService.getCacheStats(userId)
    })
  }
}))

// 🎯 增強的狀態 Hook
export function useAppState() {
  const { 
    status, 
    error, 
    fragments, 
    hasInitialized, 
    loadSource,
    isBackgroundRefreshing,
    clearCache,
    getCacheStats
  } = useFragmentsStore()
  
  return {
    status,
    error,
    fragments,
    hasInitialized,
    loadSource,
    isBackgroundRefreshing,
    
    // 狀態檢查
    isLoading: status === AppStatus.LOADING,
    isReady: status === AppStatus.READY && hasInitialized,
    isEmpty: status === AppStatus.EMPTY && hasInitialized,
    needsAuth: status === AppStatus.UNAUTHENTICATED,
    hasError: status === AppStatus.ERROR,
    
    // 🚀 緩存相關狀態
    isFromCache: loadSource === LoadSource.CACHE,
    isFromNetwork: loadSource === LoadSource.NETWORK,
    
    // 數據狀態檢查
    isDataLoaded: hasInitialized && fragments !== null,
    hasFragments: hasInitialized && Array.isArray(fragments) && fragments.length > 0,
    
    // 便捷方法
    initialize: useFragmentsStore(state => state.initialize),
    clearCache,
    getCacheStats
  }
}