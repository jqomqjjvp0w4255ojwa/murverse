// 📄 src/features/fragments/store/useFragmentsStore.ts - 修復的刪除功能優化

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

// 刪除相關的介面定義
export interface DeletionOptions {
  softDelete?: boolean
  skipConfirmation?: boolean
  cascadeDelete?: boolean
  preserveBackup?: boolean
}

export interface DeletionError {
  code: string
  message: string
  context?: string
  recoverable: boolean
}

export interface DeletionResult {
  success: boolean
  fragmentId: string
  message: string
  warnings?: string[]
  errors?: DeletionError[]
  metrics?: {
    totalTime: number
    deletedRecords: number
    cleanedCaches: number
  }
}

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
  retryOperation: (fragmentId: string) => Promise<void>
  abandonOperation: (fragmentId: string) => void

  // 刪除相關狀態
  deletionInProgress: Set<string>
  deletionResults: Map<string, DeletionResult>

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

  // Fragment 操作
  addFragment: (content: string, tags: string[], notes: Note[]) => Promise<void>
  deleteFragment: (fragmentId: string, options?: DeletionOptions) => Promise<DeletionResult>
  deleteBatch: (fragmentIds: string[], options?: DeletionOptions) => Promise<DeletionResult[]>
  addNoteToFragment: (fragmentId: string, note: Note) => Promise<void>
  updateNoteInFragment: (fragmentId: string, noteId: string, updates: Partial<Note>) => Promise<void>
  removeNoteFromFragment: (fragmentId: string, noteId: string) => Promise<void>
  reorderNotesInFragment: (fragmentId: string, newOrder: string[]) => void
  addTagToFragment: (fragmentId: string, tag: string) => Promise<void>
  removeTagFromFragment: (fragmentId: string, tag: string) => Promise<void>

  // 刪除相關方法
  clearDeletionResult: (fragmentId: string) => void
  isDeletionInProgress: (fragmentId: string) => boolean
  getDeletionResult: (fragmentId: string) => DeletionResult | undefined

  // 通知系統
  showNotification?: (type: 'success' | 'error' | 'warning', message: string) => void
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
  isLoading: false,
  error: null,

  // 刪除相關狀態初始化
  deletionInProgress: new Set(),
  deletionResults: new Map(),

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

  // 儲存碎片資料
  save: () => {
    console.log('Save function called - fragments are now saved immediately via API')
  },

  // 設置整個碎片陣列
  setFragments: (fragments) => {
    set({ fragments })
  },

  // 其他 setter 方法
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

  // 篩選方法
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
   * 🚀 樂觀添加新碎片
   */
  /**
 * 🚀 樂觀添加新碎片 - 含狀態管理
 */
  addFragment: async (content, tags, notes) => {
    if (!isClient) return
    
    // 🎯 創建臨時 Fragment（立即顯示，loading 狀態）
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
      // 🚀 設置操作狀態
      _optimistic: true,
      _pending: true,
      _operationStatus: 'creating',
      _operationType: 'create',
    } as Fragment

    // 🚀 立即更新 UI
    set(state => ({
      fragments: [optimisticFragment, ...state.fragments],
      error: null,
    }))

    try {
      console.log('🆕 開始創建新碎片...')
      
      // 發送 API 請求
      const newFragment = await apiClient.createFragment({
        content,
        tags,
        notes,
        type: 'fragment'
      })
      
      // 🔄 成功：替換臨時 Fragment 為真實 Fragment
      set(state => ({
        fragments: state.fragments.map(f => 
          f.id === tempId ? {
            ...newFragment,
            _operationStatus: 'normal' // 清除狀態
          } : f
        ),
        error: null,
      }))

      console.log('✅ 碎片創建成功:', newFragment.id)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add fragment'
      console.error('❌ 碎片創建失敗:', error)
      
      // 🔄 失敗：標記為失敗狀態（不刪除，顯示紅毛球）
      set(state => ({
        fragments: state.fragments.map(f => 
          f.id === tempId ? {
            ...f,
            _operationStatus: 'create_failed',
            _failureReason: errorMessage,
            _pending: false
          } : f
        ),
        error: errorMessage,
      }))
    }
  },


    /**
 * 🚀 樂觀刪除 Fragment 方法 - 含狀態管理
 */
    deleteFragment: async (fragmentId: string, options: DeletionOptions = {}) => {
      const state = get()
      
      // 防止重複刪除
      if (state.deletionInProgress.has(fragmentId)) {
        return {
          success: false,
          fragmentId,
          message: '刪除操作正在進行中',
          errors: [{
            code: 'DELETION_IN_PROGRESS',
            message: '該 Fragment 正在被刪除',
            recoverable: false
          }]
        }
      }

      // 🎯 保存原始 Fragment（用於回滾）
      const originalFragment = state.fragments.find(f => f.id === fragmentId)
      if (!originalFragment) {
        return {
          success: false,
          fragmentId,
          message: 'Fragment 不存在',
          errors: [{
            code: 'FRAGMENT_NOT_FOUND',
            message: 'Fragment 不存在',
            recoverable: false
          }]
        }
      }

      // 🚀 立即更新 UI（樂觀刪除）
      set(prevState => ({
        fragments: prevState.fragments.filter(f => f.id !== fragmentId),
        selectedFragment: prevState.selectedFragment?.id === fragmentId 
          ? null 
          : prevState.selectedFragment,
        deletionInProgress: new Set([...prevState.deletionInProgress, fragmentId]),
        error: null
      }))

      try {
        console.log(`🗑️ 開始刪除 Fragment: ${fragmentId}`)
        
        // 發送 API 請求（在背景執行）
        await apiClient.deleteFragment(fragmentId)

        const result: DeletionResult = {
          success: true,
          fragmentId,
          message: 'Fragment 刪除成功',
          metrics: {
            totalTime: 0,
            deletedRecords: 1,
            cleanedCaches: 1
          }
        }

        console.log(`✅ Fragment ${fragmentId} 刪除成功`)
        return result

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '刪除過程發生未知錯誤'
        
        console.error(`❌ Fragment ${fragmentId} 刪除失敗:`, error)
        
        // 🔄 失敗時恢復 Fragment（帶失敗狀態）
        set(prevState => ({
          fragments: [{
            ...originalFragment,
            _operationStatus: 'delete_failed',
            _operationType: 'delete',
            _failureReason: errorMessage,
            _pending: false
          }, ...prevState.fragments],
          selectedFragment: prevState.selectedFragment,
          error: errorMessage
        }))

        const failureResult: DeletionResult = {
          success: false,
          fragmentId,
          message: errorMessage,
          errors: [{
            code: 'DELETION_FAILED',
            message: errorMessage,
            recoverable: false
          }]
        }

        return failureResult

      } finally {
        // 清理進行中狀態
        set(prevState => {
          const newInProgress = new Set(prevState.deletionInProgress)
          newInProgress.delete(fragmentId)
          
          return {
            deletionInProgress: newInProgress,
            isLoading: newInProgress.size > 0
          }
        })
      }
    },

    // 🚀 新增：重試方法
    retryOperation: async (fragmentId: string) => {
      const fragment = get().fragments.find(f => f.id === fragmentId)
      if (!fragment || !fragment._operationType) return

      // 根據操作類型重試
      if (fragment._operationType === 'create') {
        // 重新創建
        await get().addFragment(fragment.content, fragment.tags, fragment.notes)
        // 移除失敗的臨時 fragment
        set(state => ({
          fragments: state.fragments.filter(f => f.id !== fragmentId)
        }))
      } else if (fragment._operationType === 'delete') {
        // 重新刪除
        await get().deleteFragment(fragmentId)
      }
    },

    // 🚀 新增：放棄操作方法
    abandonOperation: (fragmentId: string) => {
      const fragment = get().fragments.find(f => f.id === fragmentId)
      if (!fragment) return

      if (fragment._operationType === 'create') {
        // 放棄創建：直接移除
        set(state => ({
          fragments: state.fragments.filter(f => f.id !== fragmentId)
        }))
      } else if (fragment._operationType === 'delete') {
        // 放棄刪除：恢復正常狀態
        set(state => ({
          fragments: state.fragments.map(f => 
            f.id === fragmentId ? {
              ...f,
              _operationStatus: 'normal',
              _operationType: undefined,
              _failureReason: undefined,
              _pending: false
            } : f
          )
        }))
      }
    },

  /**
   * 批量刪除 Fragments
   */
  deleteBatch: async (fragmentIds: string[], options: DeletionOptions = {}) => {
    const state = get()
    
    // 過濾掉正在刪除的 Fragments
    const availableIds = fragmentIds.filter(id => !state.deletionInProgress.has(id))
    
    if (availableIds.length === 0) {
      return fragmentIds.map(id => ({
        success: false,
        fragmentId: id,
        message: '所有選定的 Fragments 都在刪除中',
        errors: [{
          code: 'BATCH_DELETION_SKIPPED',
          message: 'Fragment 正在被刪除',
          recoverable: false
        }]
      }))
    }

    console.log(`🗑️ 開始批量刪除 ${availableIds.length} 個 Fragments`)
    
    // 設置批量刪除狀態
    set(prevState => ({
      deletionInProgress: new Set([...prevState.deletionInProgress, ...availableIds]),
      isLoading: true,
      error: null
    }))

    try {
      // 逐個刪除（可以後續優化為真正的批量 API）
      const results: DeletionResult[] = []
      
      for (const fragmentId of availableIds) {
        try {
          await apiClient.deleteFragment(fragmentId)
          results.push({
            success: true,
            fragmentId,
            message: 'Fragment 刪除成功'
          })
        } catch (error) {
          results.push({
            success: false,
            fragmentId,
            message: error instanceof Error ? error.message : '刪除失敗',
            errors: [{
              code: 'DELETION_FAILED',
              message: error instanceof Error ? error.message : '刪除失敗',
              recoverable: false
            }]
          })
        }
      }

      // 處理批量刪除結果
      const successfulDeletions = results
        .filter(r => r.success)
        .map(r => r.fragmentId)

      if (successfulDeletions.length > 0) {
        // 從本地狀態移除成功刪除的 Fragments
        set(prevState => ({
          fragments: prevState.fragments.filter(f => !successfulDeletions.includes(f.id)),
          selectedFragment: successfulDeletions.includes(prevState.selectedFragment?.id || '')
            ? null
            : prevState.selectedFragment
        }))

        console.log(`✅ 批量刪除成功: ${successfulDeletions.length}/${availableIds.length}`)
      }

      // 記錄所有結果
      const newResults = new Map(state.deletionResults)
      results.forEach(result => {
        newResults.set(result.fragmentId, result)
      })
      
      set({ deletionResults: newResults })

      // 顯示批量操作結果通知
      const successCount = results.filter(r => r.success).length
      const totalCount = results.length
      const { showNotification } = get()
      
      if (successCount === totalCount) {
        showNotification?.('success', `成功刪除 ${successCount} 個 Fragments`)
      } else if (successCount > 0) {
        showNotification?.('warning', `刪除了 ${successCount}/${totalCount} 個 Fragments`)
      } else {
        showNotification?.('error', '批量刪除失敗')
      }

      return results

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '批量刪除發生未知錯誤'
      
      console.error('💥 批量刪除異常:', error)
      
      set({ error: errorMessage })
      const { showNotification } = get()
      showNotification?.('error', `批量刪除失敗: ${errorMessage}`)

      // 返回所有失敗結果
      return availableIds.map(id => ({
        success: false,
        fragmentId: id,
        message: errorMessage,
        errors: [{
          code: 'BATCH_DELETION_ERROR',
          message: errorMessage,
          recoverable: false
        }]
      }))

    } finally {
      // 清理批量刪除進行中狀態
      set(prevState => {
        const newInProgress = new Set(prevState.deletionInProgress)
        availableIds.forEach(id => newInProgress.delete(id))
        
        return {
          deletionInProgress: newInProgress,
          isLoading: newInProgress.size > 0
        }
      })
    }
  },

  /**
   * 清理刪除結果
   */
  clearDeletionResult: (fragmentId: string) => {
    set(prevState => {
      const newResults = new Map(prevState.deletionResults)
      newResults.delete(fragmentId)
      return { deletionResults: newResults }
    })
  },

  /**
   * 檢查是否正在刪除
   */
  isDeletionInProgress: (fragmentId: string) => {
    return get().deletionInProgress.has(fragmentId)
  },

  /**
   * 獲取刪除結果
   */
  getDeletionResult: (fragmentId: string) => {
    return get().deletionResults.get(fragmentId)
  },

  /**
   * 添加筆記到碎片
   */
  addNoteToFragment: async (fragmentId, note) => {
    try {
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
   * 更新碎片中的筆記
   */
  updateNoteInFragment: async (fragmentId, noteId, updates) => {
    try {
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
   * 從碎片移除筆記
   */
  removeNoteFromFragment: async (fragmentId, noteId) => {
    try {
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
   * 重新排序碎片中的筆記
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
   * 添加標籤到碎片
   */
  addTagToFragment: async (fragmentId, tag) => {
    try {
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
   * 從碎片移除標籤
   */
  removeTagFromFragment: async (fragmentId, tag) => {
    try {
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

  // 通知系統（可選實現）
  showNotification: undefined,
}))

/**
 * 專用的刪除 Hook - 提供更便捷的刪除功能
 */
export function useFragmentDeletion() {
  const store = useFragmentsStore()
  
  return {
    // 基本刪除功能
    deleteFragment: store.deleteFragment,
    deleteBatch: store.deleteBatch,
    
    // 狀態查詢
    isDeletionInProgress: store.isDeletionInProgress,
    getDeletionResult: store.getDeletionResult,
    clearDeletionResult: store.clearDeletionResult,
    
    // 統計信息
    getPendingDeletions: () => Array.from(store.deletionInProgress),
    getFailedDeletions: () => {
      const results = Array.from(store.deletionResults.entries())
      return results
        .filter(([_, result]) => !result.success)
        .map(([id, result]) => ({ id, result }))
    },
    
    // 批量操作輔助
    deleteSelected: async (selectedIds: string[], options?: DeletionOptions) => {
      if (selectedIds.length === 0) return []
      
      if (selectedIds.length === 1) {
        return [await store.deleteFragment(selectedIds[0], options)]
      }
      
      return await store.deleteBatch(selectedIds, options)
    },
    
    // 安全刪除（帶確認）
    safeDelete: async (fragmentId: string, confirmCallback?: () => Promise<boolean>) => {
      if (confirmCallback) {
        const confirmed = await confirmCallback()
        if (!confirmed) {
          return {
            success: false,
            fragmentId,
            message: '用戶取消刪除操作',
            errors: [{
              code: 'USER_CANCELLED',
              message: '刪除操作被用戶取消',
              recoverable: true
            }]
          }
        }
      }
      
      return await store.deleteFragment(fragmentId, { preserveBackup: true })
    }
  }
}