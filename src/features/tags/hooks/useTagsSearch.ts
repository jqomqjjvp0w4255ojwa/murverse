// hooks/useTagsSearch.ts - 重構版：簡化邏輯，使用統一搜尋
'use client'

import { useState, useCallback, useMemo } from 'react'
import { useSearch } from '@/features/search/useSearchStore'
import { useFragmentsStore } from '@/features/fragments/store/useFragmentsStore'
import { SearchService } from '@/features/search/SearchService'
import { MetaTag } from '@/features/tags/constants/metaTags'
import { Fragment } from '@/features/fragments/types/fragment'

export interface TagsSearchState {
  // 搜尋相關
  search: string
  searchMode: 'tag' | 'fragment'
  searchExecuted: boolean
  noResults: boolean
  searchedKeyword: string
  
  // 排序相關
  sortMode: string
  onlyShowSel: boolean
  
  // Meta 標籤
  selectedMetaTags: MetaTag[]
  showSpecialTags: boolean
  
  // 分頁
  visibleStartIndex: number
  itemsPerPage: number
}

export interface TagsSearchActions {
  setSearch: (value: string) => void
  setSearchMode: (mode: 'tag' | 'fragment') => void
  setSortMode: (mode: string) => void
  setOnlyShowSel: (value: boolean) => void
  addMetaTag: (tag: MetaTag) => void
  removeMetaTag: (tagId: string) => void
  executeFragmentSearch: (searchText?: string) => Fragment[]
  resetNoResults: () => void
  handleSearchModeChange: (newMode: 'tag' | 'fragment', isAddMode: boolean) => void
  handleAddMetaTag: (tag: MetaTag) => void
  handleRemoveMetaTag: (tagId: string) => void
  toggleSearchFocus: (focused: boolean) => void
}

export function useTagsSearch(
  allTags: { name: string; count: number }[],
  recentlyUsedTags: string[],
  mode: string,
  selectedTags: string[],
  excludedTags: string[]
) {
  // 本地狀態管理（非搜尋相關）
  const [state, setState] = useState<TagsSearchState>({
    search: '',
    searchMode: 'tag',
    searchExecuted: false,
    noResults: false,
    searchedKeyword: '',
    sortMode: 'desc_freq',
    onlyShowSel: false,
    selectedMetaTags: [],
    showSpecialTags: false,
    visibleStartIndex: 0,
    itemsPerPage: 50
  })

  const { fragments } = useFragmentsStore()
  
  // 🚀 重構：直接使用統一的搜尋 Store
  const {
    keyword,
    searchResults,
    setKeyword,
    search,
    setAutoSearch,
    clearSearch
  } = useSearch()

  // 更新狀態的通用方法
  const updateState = useCallback((updates: Partial<TagsSearchState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  // 🚀 大幅簡化：執行碎片搜尋
  const executeFragmentSearch = useCallback((searchText = state.search): Fragment[] => {
    const trimmed = searchText.trim()
    
    if (!trimmed) {
      console.log("🔁 沒有輸入關鍵字，顯示全部碎片")
      if (fragments) {
        clearSearch(fragments)
      }
      updateState({
        noResults: false,
        searchedKeyword: '',
        searchExecuted: false
      })
      return fragments || []
    }

    console.log(`🔍 執行碎片搜尋: "${trimmed}"`)
    updateState({ searchExecuted: true })

    if (!fragments) {
      console.warn('⚠️ fragments 為 null，無法執行搜尋')
      updateState({
        noResults: true,
        searchedKeyword: trimmed
      })
      return []
    }

    // 🚀 簡化：直接使用統一搜尋方法
    setKeyword(trimmed, fragments)
    const results = search(fragments)

    updateState({
      noResults: results.length === 0,
      searchedKeyword: trimmed
    })

    console.log(`✅ TagsSearch 搜尋完成，找到 ${results.length} 個結果`)

    return results
  }, [state.search, fragments, setKeyword, search, clearSearch, updateState])

  // 🚀 簡化：處理搜尋模式變更
  const handleSearchModeChange = useCallback((
    newMode: 'tag' | 'fragment', 
    isAddMode: boolean
  ) => {
    console.log(`搜尋模式變更: ${newMode}, 是否為添加模式: ${isAddMode}`)
    
    // 清除搜尋狀態
    if (fragments) {
      clearSearch(fragments)
    }

    updateState({ 
      searchMode: newMode,
      search: '',
      noResults: false,
      searchedKeyword: '',
      searchExecuted: false
    })
  }, [fragments, clearSearch, updateState])

  // 過濾並排序標籤（保持原邏輯）
  const getShownTags = useMemo(() => {
    const tokens = SearchService.parseSearchQuery(state.search, 'substring')
    
    return allTags
      .filter(t => {
        if (!tokens.length) return true
        
        return tokens.some(token => {
          const tag = t.name.toLowerCase()
          const val = token.value.toLowerCase()
          
          if (token.type === 'include' || token.type === 'text') {
            return tag.includes(val)
          } else if (token.type === 'exact') {
            return tag === val
          } else if (token.type === 'wildcard') {
            return tag.includes(val.replace(/\*/g, ''))
          }
          return false
        })
      })
      .filter(t => {
        return mode === 'add'
          ? true
          : (state.onlyShowSel ? selectedTags.includes(t.name) || excludedTags.includes(t.name) : true)
      })
      .sort((a, b) => {
        const baseMode = state.sortMode.replace('asc_', '').replace('desc_', '')
        const isDesc = state.sortMode.startsWith('desc_')
        
        if (baseMode === 'az') {
          return isDesc ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name)
        } else if (baseMode === 'freq') {
          return isDesc ? b.count - a.count : a.count - b.count
        } else if (baseMode === 'recent') {
          const aIndex = recentlyUsedTags.indexOf(a.name)
          const bIndex = recentlyUsedTags.indexOf(b.name)
          const aRecentIndex = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex
          const bRecentIndex = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex
          return isDesc ? bRecentIndex - aRecentIndex : aRecentIndex - bRecentIndex
        }
        return 0
      })
  }, [state.search, state.sortMode, state.onlyShowSel, allTags, recentlyUsedTags, mode, selectedTags, excludedTags])

  // Meta 標籤操作（保持原邏輯）
  const addMetaTag = useCallback((tag: MetaTag) => {
    updateState({
      selectedMetaTags: state.selectedMetaTags.some(t => t.id === tag.id)
        ? state.selectedMetaTags.filter(t => t.id !== tag.id)
        : [...state.selectedMetaTags, tag],
      showSpecialTags: false
    })
  }, [state.selectedMetaTags, updateState])

  const removeMetaTag = useCallback((tagId: string) => {
    updateState({
      selectedMetaTags: state.selectedMetaTags.filter(tag => tag.id !== tagId)
    })
  }, [state.selectedMetaTags, updateState])

  // 🚀 重構後的 Actions 對象
  const actions: TagsSearchActions = {
    setSearch: (value: string) => updateState({ search: value }),
    setSearchMode: (mode: 'tag' | 'fragment') => updateState({ searchMode: mode }),
    setSortMode: (mode: string) => updateState({ sortMode: mode }),
    setOnlyShowSel: (value: boolean) => updateState({ onlyShowSel: value }),
    addMetaTag,
    removeMetaTag,
    executeFragmentSearch,
    resetNoResults: () => updateState({ noResults: false, searchedKeyword: '', searchExecuted: false }),
    handleSearchModeChange,
    handleAddMetaTag: addMetaTag,
    handleRemoveMetaTag: removeMetaTag,
    toggleSearchFocus: (focused: boolean) => updateState({ showSpecialTags: focused })
  }

  return {
    state,
    actions,
    derived: {
      shownTags: getShownTags
    },
    // 🚀 新增：暴露統一搜尋狀態
    search: {
      keyword,
      results: searchResults,
      isSearching: keyword.trim() !== ''
    }
  }
}