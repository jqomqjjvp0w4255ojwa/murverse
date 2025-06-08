'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useSearchStore } from '@/features/search/useSearchStore'
import { useAdvancedSearch, SearchScope, MatchMode, TimeRange } from '@/features/search/useAdvancedSearch'
import { useFragmentsStore } from '@/features/fragments/store/useFragmentsStore'
import { SearchService } from '@/features/search/SearchService'

interface AdvancedSearchPanelProps {
  onSearch: (results: any) => void
  initialQuery?: string
  noResults?: boolean
  searchedKeyword?: string
  onResetNoResults?: () => void
  onClearLocalSearch?: () => void
}

const AdvancedSearchPanel: React.FC<AdvancedSearchPanelProps> = ({
  onSearch,
  initialQuery = '',
  noResults = false,
  searchedKeyword = '',
  onResetNoResults,
  onClearLocalSearch, 
}) => {

  const {
    query,
    scopes,
    matchMode,
    timeRange,
    customDateRange,
    setQuery,
    setScopes,
    setMatchMode,
    setTimeRange,
    setCustomTimeRange,
    executeSearch,
    clearSearch
  } = useAdvancedSearch()

  const searchOptionsRef = useRef<HTMLDivElement>(null)
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleExecuteSearch();
    }
  };

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery)
    }
  }, [initialQuery, setQuery])

  const handleExecuteSearch = () => {
    const fragments = useFragmentsStore.getState().fragments;
    const searchStore = useSearchStore.getState();
  
    // 🚀 修復：檢查 fragments 是否為 null 或空陣列
    if (!fragments || fragments.length === 0) {
      console.warn('⚠️ 沒有可搜尋的碎片數據')
      onSearch([])
      return
    }
  
    const tokens = SearchService.parseSearchQuery(query, matchMode);
  
    const searchOptions = {
      keyword: query,
      tokens,
      scopes,
      matchMode,
      timeRange,
      customStartDate: customDateRange.start,
      customEndDate: customDateRange.end,
      selectedTags: searchStore.selectedTags || [],
      excludedTags: searchStore.excludedTags || [],
      tagLogicMode: searchStore.tagLogicMode || 'AND'
    };
  
    console.log('🔍 執行搜尋 with:', searchOptions);
  
    // 🚀 修復：確保傳入的是 Fragment[] 而非 Fragment[] | null
    const results = SearchService.search(fragments, searchOptions);

  
    // 更新搜尋相關全域狀態
    useFragmentsStore.getState().setSearchKeyword(query);
    searchStore.setKeyword(query);
    searchStore.setScopes(scopes);
    searchStore.setMatchMode(matchMode);
    searchStore.setTimeRange(timeRange);
    if (timeRange === 'custom') {
      searchStore.setCustomDateRange(customDateRange.start, customDateRange.end);
    }
    searchStore.setSearchResults(results);
  
    console.log(`✅ 搜尋完成，共找到 ${results.length} 筆資料`);
  
    // 回傳結果給外部元件
    onSearch(results);
  };

  const handleClearSearch = () => {
    /* 1. 清空父層輸入框（TagsSearchBar） */
    onClearLocalSearch?.();
  
    /* 2. 一鍵還原 AdvancedSearch 內部全部狀態（含日期） */
    clearSearch();        // ← useAdvancedSearch 裡的 clearSearch
    setQuery('');
    setStartDate('');
    setEndDate('');
  
    /* 3. 一鍵還原全域 SearchStore（用 clearSearch） */
    useSearchStore.getState().clearSearch();
  
    /* 4. 告訴父層回復顯示全部碎片 */
    const allFragments = useFragmentsStore.getState().fragments;
    // 🚀 修復：確保傳入的是陣列而非 null
    onSearch(allFragments || []);          // 讓 TagsFloatingWindow 與 UI 立即拿到全資料
  
    /* 5. 關閉「沒有結果」提示 */
    onResetNoResults?.();
  };

  const toggleScope = (scope: SearchScope) => {
    if (scopes.includes(scope)) {
      if (scopes.length > 1) {
        const newScopes = scopes.filter(s => s !== scope);
        setScopes(newScopes);
        
        // 立即更新 SearchStore 中的範圍設置
        setTimeout(() => {
          useSearchStore.getState().setScopes(newScopes);
          console.log("更新搜索範圍為:", newScopes);
        }, 0);
      }
    } else {
      const newScopes = [...scopes, scope];
      setScopes(newScopes);
      
      // 立即更新 SearchStore 中的範圍設置
      setTimeout(() => {
        useSearchStore.getState().setScopes(newScopes);
        console.log("更新搜索範圍為:", newScopes);
      }, 0);
    }
  };

  return (
    <div className="w-full">
       {/* 搜尋提示 - 移到搜尋條件前 */}
       {noResults && searchedKeyword.trim() && (
      <div className="mb-2 flex items-center gap-2 px-3 py-2 bg-pink-50 text-pink-700 rounded-md">
        <svg
          className="w-4 h-4 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12A9 9 0 113 12a9 9 0 0118 0z" />
        </svg>
        <span className="text-xs">
          找不到符合「<span className="font-semibold">{searchedKeyword}</span>」的內容喔！
        </span>
      </div>
    )}
      
      <div ref={searchOptionsRef} className="mb-2 bg-white rounded-lg text-sm">
       
        {/* 搜尋設定列 */}
        <div className="mb-2 p-2 bg-gray-50 rounded-md space-y-3">
          <div className="text-sm font-bold text-gray-700">搜尋方式</div>
          <div className="flex flex-col gap-3">

            {/* 搜尋範圍 */}
            <div className="flex items-center gap-2 relative pb-2 mb-2 after:absolute after:left-0 after:bottom-0 after:w-full after:h-px after:bg-gray-200">
              <span className="text-sm font-medium text-gray-500 min-w-[36px]">範圍</span>
              {[{ label: '碎片', value: 'fragment' }, { label: '筆記', value: 'note' }, { label: '標籤', value: 'tag' }].map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => toggleScope(value as SearchScope)}
                  type="button"
                  className={`px-2 py-0.5 rounded-full border text-xs transition 
                    ${scopes.includes(value as SearchScope)
                      ? 'bg-pink-100 text-pink-700 border-pink-300'
                      : 'border-gray-300 text-gray-600 hover:border-pink-300 hover:text-pink-700'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* 比對方式（整合） */}
            <div className="flex items-center gap-2 relative pb-2 mb-2 after:absolute after:left-0 after:bottom-0 after:w-full after:h-px after:bg-gray-200">
              <span className="text-sm font-medium text-gray-500 min-w-[36px]">比對</span>
              {[{ label: '完全符合', value: 'exact' },
                { label: '開頭符合', value: 'prefix' },
                { label: '包含', value: 'substring' }].map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => setMatchMode(value as MatchMode)}
                  type="button"
                  className={`px-2 py-0.5 rounded-full border text-xs transition 
                    ${matchMode === value
                      ? 'bg-pink-100 text-pink-700 border-pink-300'
                      : 'border-gray-300 text-gray-600 hover:border-pink-300 hover:text-pink-700'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 時間範圍 */}
        <div className="mb-2 p-2 bg-gray-50 rounded-md">
          <div className="text-sm font-semibold text-gray-800 mb-1">時間範圍</div>
          <div className="flex gap-2 flex-wrap">
            {[{ label: '全部時間', value: 'all' }, { label: '今天', value: 'today' }, { label: '本週', value: 'week' }, { label: '本月', value: 'month' }, { label: '自訂範圍', value: 'custom' }].map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setTimeRange(value as TimeRange)}
                type="button"
                className={`px-2 py-0.5 rounded-full border text-xs transition 
                  ${timeRange === value
                    ? 'bg-pink-100 text-pink-700 border-pink-300'
                    : 'border-gray-300 text-gray-600 hover:border-pink-300 hover:text-pink-700'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {timeRange === 'custom' && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                type="date"
                value={startDate}
                className="w-full p-1.5 border border-gray-300 rounded text-sm"
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (e.target.value) {
                    const start = new Date(e.target.value);
                    setCustomTimeRange(start, endDate ? new Date(endDate) : undefined);
                  }
                }}
              />
              <input
                type="date"
                value={endDate}
                className="w-full p-1.5 border border-gray-300 rounded text-sm"
                onChange={(e) => {
                  setEndDate(e.target.value);
                  if (e.target.value) {
                    const end = new Date(e.target.value);
                    end.setHours(23, 59, 59, 999);
                    setCustomTimeRange(startDate ? new Date(startDate) : undefined, end);
                  }
                }}
              />
            </div>
          )}
        </div>

        {/* 操作按鈕 */}
        <div className="flex items-center pb-1">
          <button
            type="button"
            onClick={handleClearSearch}
            className="ml-auto px-3 py-0.5 text-gray-600 text-sm rounded hover:bg-gray-100"
          >
            清除條件
          </button>
        </div>
      </div>

      {/* 搜尋語法說明 
      <div className="mt-2 text-xs text-gray-600 border-t border-gray-200 pt-2 leading-relaxed">
        支援語法：
        <div className="mt-1">
          <span className="inline-block bg-gray-100 px-1 rounded font-mono text-[11px] font-medium">+</span> 包含｜
          <span className="inline-block bg-gray-100 px-1 rounded font-mono text-[11px] font-medium">-</span> 排除｜
          <span className="inline-block bg-gray-100 px-1 rounded font-mono text-[11px] font-medium">OR</span> 任一｜
          <span className="inline-block bg-gray-100 px-1 rounded font-mono text-[11px] font-medium">*</span> 萬用｜
          <span className="inline-block bg-gray-100 px-1 rounded font-mono text-[11px] font-medium">'...'</span> 精確比對
        </div>
      </div>*/}
    </div>
  );
};

export default AdvancedSearchPanel;