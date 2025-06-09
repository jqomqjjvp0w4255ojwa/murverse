// hooks/useSearchStore.ts - 修復版：正確處理空搜尋結果

import { create } from 'zustand'
import { Fragment } from '@/features/fragments/types/fragment'
import { SearchService } from '@/features/search/SearchService'

export type SearchScope = 'fragment' | 'note' | 'tag'
export type MatchMode = 'exact' | 'prefix' | 'substring'
export type TimeRange = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'
export type TagLogicMode = 'AND' | 'OR'

export interface SearchOptions {
  keyword?: string;
  tokens?: any[];
  scopes?: SearchScope[];
  matchMode?: MatchMode;
  timeRange?: TimeRange;
  customStartDate?: Date;
  customEndDate?: Date;
  selectedTags?: string[];
  excludedTags?: string[];
  tagLogicMode?: TagLogicMode;
}

interface SearchState {
  // 基本搜索狀態
  keyword: string;
  matchMode: MatchMode;
  scopes: SearchScope[];
  timeRange: TimeRange;
  customDateRange: { start?: Date; end?: Date };
  
  // 標籤相關
  selectedTags: string[];
  excludedTags: string[];
  tagLogicMode: TagLogicMode;
  
  // 搜索模式
  searchMode: 'tag' | 'fragment';
  
  // 搜索結果
  searchResults: Fragment[];
  
  // 🚀 新增：搜尋狀態追蹤
  isSearchActive: boolean;  // 是否有活躍的搜尋
  hasSearched: boolean;     // 是否已經執行過搜尋
  
  // 🚀 新增：自動搜尋控制
  autoSearch: boolean;
  
  // === 統一的設置方法（自動觸發搜尋） ===
  setKeyword: (keyword: string, fragments?: Fragment[]) => void;
  setMatchMode: (mode: MatchMode, fragments?: Fragment[]) => void;
  setScopes: (scopes: SearchScope[], fragments?: Fragment[]) => void;
  setTimeRange: (range: TimeRange, fragments?: Fragment[]) => void;
  setCustomDateRange: (start?: Date, end?: Date, fragments?: Fragment[]) => void;
  setSelectedTags: (tags: string[], fragments?: Fragment[]) => void;
  setExcludedTags: (tags: string[], fragments?: Fragment[]) => void;
  setTagLogicMode: (mode: TagLogicMode, fragments?: Fragment[]) => void;
  setSearchMode: (mode: 'tag' | 'fragment') => void;
  setSearchResults: (results: Fragment[]) => void;
  
  // === 搜索方法 ===
  search: (fragments: Fragment[], options?: Partial<SearchOptions>) => Fragment[];
  executeSearch: (fragments: Fragment[]) => Fragment[];
  clearSearch: (fragments?: Fragment[]) => void;
  
  // === 控制方法 ===
  setAutoSearch: (enabled: boolean) => void;
  
  // === 便捷方法 ===
  searchWithKeyword: (keyword: string, fragments: Fragment[]) => Fragment[];
  getCurrentSearchOptions: () => SearchOptions;
  
  // 🚀 新增：判斷是否應該顯示結果
  shouldShowResults: () => boolean;
  getDisplayFragments: (allFragments: Fragment[]) => Fragment[];
}

export const useSearchStore = create<SearchState>((set, get) => ({
  // === 默認狀態 ===
  keyword: '',
  matchMode: 'substring',
  scopes: ['fragment', 'note'],
  timeRange: 'all',
  customDateRange: {},
  selectedTags: [],
  excludedTags: [],
  tagLogicMode: 'AND',
  searchMode: 'tag',
  searchResults: [],
  autoSearch: true,
  isSearchActive: false,
  hasSearched: false,
  
  // === 🚀 統一的搜尋方法 ===
  search: (fragments, optionOverrides = {}) => {
    const state = get();
    
    // 合併選項
    const searchOptions: SearchOptions = {
      keyword: state.keyword,
      tokens: state.keyword ? SearchService.parseSearchQuery?.(state.keyword, state.matchMode) || [] : [],
      scopes: state.scopes,
      matchMode: state.matchMode,
      timeRange: state.timeRange,
      customStartDate: state.customDateRange.start,
      customEndDate: state.customDateRange.end,
      selectedTags: state.selectedTags,
      excludedTags: state.excludedTags,
      tagLogicMode: state.tagLogicMode,
      ...optionOverrides
    };
    
    // 🔧 判斷是否有搜尋條件
    const hasKeyword = searchOptions.keyword && searchOptions.keyword.trim() !== '';
    const hasTagFilters = (searchOptions.selectedTags && searchOptions.selectedTags.length > 0) ||
                         (searchOptions.excludedTags && searchOptions.excludedTags.length > 0);
    const hasTimeFilter = searchOptions.timeRange !== 'all';
    
    const isSearchActive = hasKeyword || hasTagFilters || hasTimeFilter;
    
    console.log('🔍 統一搜尋執行:', {
      keyword: searchOptions.keyword,
      matchMode: searchOptions.matchMode,
      scopes: searchOptions.scopes,
      fragmentsCount: fragments.length,
      isSearchActive,
      hasKeyword,
      hasTagFilters,
      hasTimeFilter
    });
    
    let results: Fragment[];
    
    if (isSearchActive) {
      // 有搜尋條件：執行搜尋
      results = SearchService.search(fragments, searchOptions);
      console.log(`✅ 搜尋完成，找到 ${results.length} 個結果`);
    } else {
      // 沒有搜尋條件：返回所有碎片
      results = fragments;
      console.log(`📋 無搜尋條件，顯示所有 ${results.length} 個碎片`);
    }
    
    // 更新狀態
    set(state => ({ 
      ...state, 
      searchResults: results,
      isSearchActive,
      hasSearched: true
    }));
    
    return results;
  },
  
  // === 🚀 自動搜尋的設置器 ===
  setKeyword: (keyword, fragments) => {
    console.log('🔧 設置關鍵字:', keyword);
    set(state => ({ ...state, keyword }));
    
    if (get().autoSearch && fragments) {
      setTimeout(() => get().search(fragments), 0);
    }
  },
  
  setMatchMode: (matchMode, fragments) => {
    console.log('🔧 設置比對模式:', matchMode);
    set(state => ({ ...state, matchMode }));
    
    if (get().autoSearch && fragments) {
      setTimeout(() => get().search(fragments), 0);
    }
  },
  
  setScopes: (scopes, fragments) => {
    console.log('🔧 設置搜尋範圍:', scopes);
    set(state => ({ ...state, scopes }));
    
    if (get().autoSearch && fragments) {
      setTimeout(() => get().search(fragments), 0);
    }
  },
  
  setTimeRange: (timeRange, fragments) => {
    console.log('🔧 設置時間範圍:', timeRange);
    set(state => ({ ...state, timeRange }));
    
    if (get().autoSearch && fragments) {
      setTimeout(() => get().search(fragments), 0);
    }
  },
  
  setCustomDateRange: (start, end, fragments) => {
    set(state => ({ ...state, customDateRange: { start, end } }));
    
    if (get().autoSearch && fragments) {
      setTimeout(() => get().search(fragments), 0);
    }
  },
  
  setSelectedTags: (selectedTags, fragments) => {
    set(state => ({ ...state, selectedTags }));
    
    if (get().autoSearch && fragments) {
      setTimeout(() => get().search(fragments), 0);
    }
  },
  
  setExcludedTags: (excludedTags, fragments) => {
    set(state => ({ ...state, excludedTags }));
    
    if (get().autoSearch && fragments) {
      setTimeout(() => get().search(fragments), 0);
    }
  },
  
  setTagLogicMode: (tagLogicMode, fragments) => {
    set(state => ({ ...state, tagLogicMode }));
    
    if (get().autoSearch && fragments) {
      setTimeout(() => get().search(fragments), 0);
    }
  },
  
  // === 非搜尋相關的設置器 ===
  setSearchMode: (searchMode) => {
    set(state => ({ ...state, searchMode }));
  },
  
  setSearchResults: (results) => {
    set(state => ({ 
      ...state, 
      searchResults: results,
      hasSearched: true,
      isSearchActive: true 
    }));
  },
  
  // === 執行搜索（向後兼容） ===
  executeSearch: (fragments) => {
    return get().search(fragments);
  },
  
  // === 🔧 修復：清除搜索 ===
  clearSearch: (fragments) => {
    console.log('🧹 清除搜尋狀態');
    set(state => ({
      ...state,
      keyword: '',
      matchMode: 'substring',
      scopes: ['fragment', 'note'],
      timeRange: 'all',
      customDateRange: {},
      selectedTags: [],
      excludedTags: [],
      searchResults: fragments || [],
      tagLogicMode: 'AND',
      isSearchActive: false,
      hasSearched: false
    }));
  },
  
  // === 控制方法 ===
  setAutoSearch: (enabled) => {
    set(state => ({ ...state, autoSearch: enabled }));
  },
  
  // === 便捷方法 ===
  searchWithKeyword: (keyword, fragments) => {
    const state = get();
    return state.search(fragments, { keyword });
  },
  
  getCurrentSearchOptions: () => {
    const state = get();
    return {
      keyword: state.keyword,
      tokens: state.keyword ? SearchService.parseSearchQuery?.(state.keyword, state.matchMode) || [] : [],
      scopes: state.scopes,
      matchMode: state.matchMode,
      timeRange: state.timeRange,
      customStartDate: state.customDateRange.start,
      customEndDate: state.customDateRange.end,
      selectedTags: state.selectedTags,
      excludedTags: state.excludedTags,
      tagLogicMode: state.tagLogicMode
    };
  },
  
  // 🚀 新增：判斷是否應該顯示結果
  shouldShowResults: () => {
    const state = get();
    return !state.isSearchActive || state.searchResults.length > 0;
  },
  
  // 🚀 新增：獲取應該顯示的碎片
  getDisplayFragments: (allFragments) => {
    const state = get();
    
    console.log('🎯 getDisplayFragments 狀態檢查:', {
      isSearchActive: state.isSearchActive,
      hasSearched: state.hasSearched,
      searchResultsCount: state.searchResults.length,
      allFragmentsCount: allFragments.length,
      keyword: state.keyword
    });
    
    if (!state.isSearchActive && !state.hasSearched) {
      // 沒有搜尋條件且未搜尋過：顯示所有碎片
      console.log('📋 顯示所有碎片（無搜尋條件）');
      return allFragments;
    }
    
    if (state.isSearchActive) {
      // 有搜尋條件：顯示搜尋結果（可能為空陣列）
      console.log(`🔍 顯示搜尋結果 (${state.searchResults.length} 個)`);
      return state.searchResults;
    }
    
    // 其他情況：顯示所有碎片
    console.log('📋 顯示所有碎片（預設）');
    return allFragments;
  }
}));

// 🚀 全域引用支持
if (typeof window !== 'undefined') {
  (window as any).__SEARCH_STORE__ = useSearchStore;
}

// === 🚀 便捷 Hook ===
export function useSearch() {
  const store = useSearchStore();
  
  return {
    // 狀態
    keyword: store.keyword,
    matchMode: store.matchMode,
    scopes: store.scopes,
    timeRange: store.timeRange,
    customDateRange: store.customDateRange,
    selectedTags: store.selectedTags,
    excludedTags: store.excludedTags,
    tagLogicMode: store.tagLogicMode,
    searchMode: store.searchMode,
    searchResults: store.searchResults,
    autoSearch: store.autoSearch,
    isSearchActive: store.isSearchActive,
    hasSearched: store.hasSearched,
    
    // 便捷方法
    search: store.search,
    setKeyword: store.setKeyword,
    setMatchMode: store.setMatchMode,
    setScopes: store.setScopes,
    setTimeRange: store.setTimeRange,
    setCustomDateRange: store.setCustomDateRange,
    setSelectedTags: store.setSelectedTags,
    setExcludedTags: store.setExcludedTags,
    setTagLogicMode: store.setTagLogicMode,
    clearSearch: store.clearSearch,
    searchWithKeyword: store.searchWithKeyword,
    getCurrentSearchOptions: store.getCurrentSearchOptions,
    shouldShowResults: store.shouldShowResults,
    getDisplayFragments: store.getDisplayFragments,
    
    // 控制
    setAutoSearch: store.setAutoSearch
  };
}