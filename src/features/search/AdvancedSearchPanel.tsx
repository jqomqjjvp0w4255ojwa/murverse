'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useSearch } from '@/features/search/useSearchStore'
import { useFragmentsStore } from '@/features/fragments/store/useFragmentsStore'

// 🚀 簡化：直接使用 useSearchStore 的類型
export type SearchScope = 'fragment' | 'note' | 'tag'
export type MatchMode = 'exact' | 'prefix' | 'substring'
export type TimeRange = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'

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

  // 🚀 重構：統一使用 useSearch
  const {
    keyword,
    scopes,
    matchMode,
    timeRange,
    customDateRange,
    setKeyword,
    setScopes,
    setMatchMode,
    setTimeRange,
    setCustomDateRange,
    clearSearch,
    search,
    setAutoSearch
  } = useSearch();

  const { fragments } = useFragmentsStore();
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // 🚀 初始化時關閉自動搜尋，避免不必要的觸發
  useEffect(() => {
    setAutoSearch(false);
    
    if (initialQuery) {
      setKeyword(initialQuery);
    }
    
    return () => {
      setAutoSearch(true); // 組件卸載時恢復自動搜尋
    };
  }, [initialQuery, setKeyword, setAutoSearch]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleExecuteSearch();
    }
  };

  // 🚀 大幅簡化：直接執行搜尋
  const handleExecuteSearch = () => {
    if (!fragments || fragments.length === 0) {
      console.warn('⚠️ 沒有可搜尋的碎片數據');
      onSearch([]);
      return;
    }

    console.log('🔍 執行進階搜尋:', {
      keyword,
      matchMode,
      scopes,
      timeRange
    });

    // 🚀 直接使用統一的搜尋方法
    const results = search(fragments);
    
    console.log(`✅ 搜尋完成，共找到 ${results.length} 筆資料`);
    
    // 回傳結果給外部元件
    onSearch(results);
  };

  // 🚀 大幅簡化：清除搜尋
  const handleClearSearch = () => {
    onClearLocalSearch?.();
    
    setStartDate('');
    setEndDate('');
    
    if (fragments) {
      clearSearch(fragments);
    }
    
    onSearch(fragments || []);
    onResetNoResults?.();
  };

  // 🚀 簡化：範圍切換
  const toggleScope = (scope: SearchScope) => {
    if (scopes.includes(scope)) {
      if (scopes.length > 1) {
        const newScopes = scopes.filter(s => s !== scope);
        setScopes(newScopes, fragments || undefined);
      }
    } else {
      const newScopes = [...scopes, scope];
      setScopes(newScopes, fragments || undefined);
    }
  };

  // 🚀 簡化：比對方式變更
  const handleMatchModeChange = (mode: MatchMode) => {
    console.log('🔧 變更比對方式為:', mode);
    setMatchMode(mode, fragments || undefined);
  };

  // 🚀 簡化：時間範圍變更
  const handleTimeRangeChange = (range: TimeRange) => {
    console.log('🔧 變更時間範圍為:', range);
    setTimeRange(range, fragments || undefined);
  };

  // 🚀 簡化：自訂日期處理
  const handleStartDateChange = (dateValue: string) => {
    setStartDate(dateValue);
    if (dateValue) {
      const start = new Date(dateValue);
      setCustomDateRange(start, endDate ? new Date(endDate) : undefined, fragments || undefined);
    }
  };

  const handleEndDateChange = (dateValue: string) => {
    setEndDate(dateValue);
    if (dateValue) {
      const end = new Date(dateValue);
      end.setHours(23, 59, 59, 999);
      setCustomDateRange(startDate ? new Date(startDate) : undefined, end, fragments || undefined);
    }
  };

  return (
    <div className="w-full">
          <div className="flex justify-end mb-2">
      <button
        type="button"
        onClick={handleClearSearch}
        className="px-3 py-0.5 text-gray-600 text-sm rounded hover:bg-gray-100"
      >
        重置條件
      </button>
    </div>
       {/* 搜尋提示 */}
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
      
      <div className="mb-2 bg-white rounded-lg text-sm">
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

            {/* 比對方式 */}
            <div className="flex items-center gap-2 relative pb-2 mb-2 after:absolute after:left-0 after:bottom-0 after:w-full after:h-px after:bg-gray-200">
              <span className="text-sm font-medium text-gray-500 min-w-[36px]">比對</span>
              {[{ label: '完全符合', value: 'exact' },
                { label: '開頭符合', value: 'prefix' },
                { label: '包含', value: 'substring' }].map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => handleMatchModeChange(value as MatchMode)}
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
                onClick={() => handleTimeRangeChange(value as TimeRange)}
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
                onChange={(e) => handleStartDateChange(e.target.value)}
              />
              <input
                type="date"
                value={endDate}
                className="w-full p-1.5 border border-gray-300 rounded text-sm"
                onChange={(e) => handleEndDateChange(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvancedSearchPanel;