// hooks/useSearchStore.ts

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
  
  // 操作方法
  setKeyword: (keyword: string) => void;
  setMatchMode: (mode: MatchMode) => void;
  setScopes: (scopes: SearchScope[]) => void;
  setTimeRange: (range: TimeRange) => void;
  setCustomDateRange: (start?: Date, end?: Date) => void;
  setSelectedTags: (tags: string[]) => void;
  setExcludedTags: (tags: string[]) => void;
  setTagLogicMode: (mode: TagLogicMode) => void;
  setSearchMode: (mode: 'tag' | 'fragment') => void;
  setSearchResults: (results: Fragment[]) => void; // 添加設置搜索結果的方法
  
  // 搜索方法
  executeSearch: (fragments: Fragment[]) => Fragment[];
  clearSearch: () => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  // 默認狀態
  keyword: '',
  matchMode: 'substring',
  scopes: ['fragment'],
  timeRange: 'all',
  customDateRange: {},
  selectedTags: [],
  excludedTags: [],
  tagLogicMode: 'AND',
  searchMode: 'tag',
  searchResults: [],
  
  // 設置器
  setKeyword: (keyword) =>
    set((state) => ({ ...state, keyword })),
  
  setMatchMode: (matchMode) =>
    set((state) => ({ ...state, matchMode })),
  
  setScopes: (scopes) =>
    set((state) => ({ ...state, scopes })),
  
  setTimeRange: (timeRange) =>
    set((state) => ({ ...state, timeRange })),
  
  setCustomDateRange: (start, end) =>
    set((state) => ({ ...state, customDateRange: { start, end } })),
  
  setSelectedTags: (selectedTags) =>
    set((state) => ({ ...state, selectedTags })),
  
  setExcludedTags: (excludedTags) =>
    set((state) => ({ ...state, excludedTags })),
  
  setTagLogicMode: (tagLogicMode) =>
    set((state) => ({ ...state, tagLogicMode })),
  
  setSearchMode: (searchMode) =>
    set((state) => ({ ...state, searchMode })),
  
  setSearchResults: (results) =>
    set((state) => ({ ...state, searchResults: results })),
  
  // 執行搜索
  executeSearch: (fragments) => {
    const {
      keyword,
      matchMode,
      scopes,
      timeRange,
      customDateRange,
      selectedTags,
      excludedTags,
      tagLogicMode
    } = get();
    
    console.log("搜索執行中，使用範圍:", scopes, "關鍵字:", keyword);
    
    // 使用 SearchService 的工具函數解析關鍵字中的特殊語法
    // 這需要在 SearchService 中添加一個公共方法
    const tokens = keyword 
      ? SearchService.parseSearchQuery?.(keyword, matchMode) || []
      : [];
    
    console.log("執行搜索，範圍:", scopes, "，關鍵字:", keyword, "，解析後的 tokens:", tokens);

    
    
    // 創建符合 SearchService.SearchOptions 的參數物件
    const searchOptions = {
      keyword,
      tokens,
      scopes,
      matchMode,
      timeRange,
      customStartDate: customDateRange.start,
      customEndDate: customDateRange.end,
      selectedTags,
      excludedTags,
      tagLogicMode
    };
    
    // 使用統一的SearchService執行搜索
    const results = SearchService.search(fragments, searchOptions);
    console.log(`搜索返回 ${results.length} 個結果`);
    
    set((state) => ({ ...state, searchResults: results }));
    return results;
  },
  
  // 清除搜索
  clearSearch: () =>
  set((state) => ({
    ...state,
    keyword: '',
    matchMode: 'substring',
    scopes: ['fragment'],
    timeRange: 'all',
    customDateRange: {},
    selectedTags: [],
    excludedTags: [],
    searchResults: []
  }))
}));