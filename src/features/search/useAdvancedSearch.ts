// hooks/useAdvancedSearch.ts
'use client'

import { useState, useEffect, useCallback } from 'react'

// 定義可搜尋的範圍類型
export type SearchScope = 'fragment' | 'note' | 'tag'

// 定義搜尋比對方式
export type MatchMode = 'exact' | 'prefix' | 'substring'
// 定義搜尋時間範圍
export type TimeRange = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'

// 定義一個搜尋紀錄物件
export interface SearchHistoryItem {
  query: string
  scopes: SearchScope[]
  matchMode: MatchMode
  timeRange: TimeRange
  timestamp: Date
}

// 定義搜尋 token 的類型
export type TokenType = 'include' | 'exclude' | 'or' | 'wildcard' | 'exact' | 'text'

// 解析後的搜尋 token
export interface SearchToken {
  type: TokenType
  value: string
}

// 解析完成的搜尋條件
export interface ParsedSearch {
  tokens: SearchToken[]
  scopes: SearchScope[]
  matchMode: MatchMode
  timeRange: TimeRange
  customStartDate?: Date
  customEndDate?: Date
}

interface UseAdvancedSearchProps {
  maxHistoryItems?: number
  defaultScopes?: SearchScope[]
  defaultMatchMode?: MatchMode
  defaultTimeRange?: TimeRange
}


/**
 * 高級搜尋 Hook
 */
export function useAdvancedSearch({
  maxHistoryItems = 10,
  defaultScopes = ['fragment', 'note'],
  defaultMatchMode = 'substring',
  defaultTimeRange = 'all'
}: UseAdvancedSearchProps = {}) {
  // 搜尋字串
  const [query, setQuery] = useState('')
  
  // 搜尋設定
  const [scopes, setScopes] = useState<SearchScope[]>(defaultScopes)
  const [matchMode, setMatchMode] = useState<MatchMode>(defaultMatchMode)
  const [timeRange, setTimeRange] = useState<TimeRange>(defaultTimeRange)
  const [customDateRange, setCustomDateRange] = useState<{ start?: Date; end?: Date }>({})
  
  // 搜尋歷史紀錄
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([])
  
  // 解析後的搜尋條件
  const [parsedSearch, setParsedSearch] = useState<ParsedSearch>({
    tokens: [],
    scopes,
    matchMode,
    timeRange
  })

  // 載入搜尋歷史紀錄
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('mur_search_history')
      if (storedHistory) {
        const parsed = JSON.parse(storedHistory)
        setSearchHistory(
          parsed.map((item: any) => ({
            ...item,
            timestamp: new Date(item.timestamp)
          }))
        )
      }
    } catch (e) {
      console.error('Error loading search history:', e)
    }
  }, [])

  // 解析搜尋語法
  const parseSearchQuery = useCallback((searchQuery: string): SearchToken[] => {
    const tokens: SearchToken[] = []
    let buffer = ''
    let inExactMatch = false
    
    for (let i = 0; i < searchQuery.length; i++) {
      const char = searchQuery[i]
      
      // 處理精確匹配（引號內的內容）
      if (char === "'") {
        if (inExactMatch) {
          // 結束精確匹配
          if (buffer) {
            tokens.push({ type: 'exact', value: buffer })
            buffer = ''
          }
          inExactMatch = false
        } else {
          // 開始精確匹配，但先將當前緩衝區處理完
          if (buffer) {
            tokens.push({ type: 'text', value: buffer })
            buffer = ''
          }
          inExactMatch = true
        }
        continue
      }
      
      if (inExactMatch) {
        buffer += char
        continue
      }
      
      // 處理特殊字符
      if (['+', '-', '*'].includes(char) && (i === 0 || searchQuery[i-1] === ' ')) {
        // 處理前一個緩衝區
        if (buffer) {
          tokens.push({ type: 'text', value: buffer })
          buffer = ''
        }
        
        // 查看下一個字符
        if (i + 1 < searchQuery.length && searchQuery[i+1] !== ' ') {
          // 收集操作符之後的文本
          let tempBuffer = ''
          let j = i + 1
          
          while (j < searchQuery.length && searchQuery[j] !== ' ' && 
                 !['+', '-', '*'].includes(searchQuery[j])) {
            tempBuffer += searchQuery[j]
            j++
          }
          
          if (tempBuffer) {
            if (char === '+') tokens.push({ type: 'include', value: tempBuffer })
            else if (char === '-') tokens.push({ type: 'exclude', value: tempBuffer })
            else if (char === '*') tokens.push({ type: 'wildcard', value: tempBuffer })
            
            i = j - 1 // 跳過已處理的字符
          }
        }
        continue
      }
      
      // 處理 OR 操作符
      if (i + 2 < searchQuery.length && 
          searchQuery.substring(i, i+2).toUpperCase() === 'OR' &&
          (i === 0 || searchQuery[i-1] === ' ') && 
          (i+2 === searchQuery.length || searchQuery[i+2] === ' ')) {
        
        // 處理前一個緩衝區
        if (buffer) {
          tokens.push({ type: 'text', value: buffer })
          buffer = ''
        }
        
        // 收集 OR 操作符之後的文本
        let tempBuffer = ''
        let j = i + 3
        
        while (j < searchQuery.length && searchQuery[j] !== ' ' && 
               !['+', '-', '*'].includes(searchQuery[j])) {
          tempBuffer += searchQuery[j]
          j++
        }
        
        if (tempBuffer) {
          tokens.push({ type: 'or', value: tempBuffer })
          i = j - 1 // 跳過已處理的字符
        }
        
        continue
      }
      
      // 其他字符添加到緩衝區
      buffer += char
    }
    
    // 處理最後的緩衝區
    if (buffer) {
      if (inExactMatch) {
        tokens.push({ type: 'exact', value: buffer })
      } else {
        tokens.push({ type: 'text', value: buffer.trim() })
      }
    }
    
    return tokens.filter(token => token.value.trim() !== '')
  }, [])

  // 當查詢或設定改變時，更新解析結果
  useEffect(() => {
    const parsedTokens: SearchToken[] = parseSearchQuery(query).map(token => {
      if ((matchMode === 'exact') && token.type === 'text') {
        return { ...token, type: 'exact' as const }
      }
      return token
    })
    
    
    setParsedSearch({
      tokens: parsedTokens,
      scopes,
      matchMode,
      timeRange,
      ...(timeRange === 'custom' && {
        customStartDate: customDateRange.start,
        customEndDate: customDateRange.end
      })
    })
  }, [query, scopes, matchMode, timeRange, customDateRange, parseSearchQuery])

  // 執行搜尋並記錄歷史
  const executeSearch = useCallback(() => {
    const parsedTokens = parseSearchQuery(query).map(token => {
      if ((matchMode === 'exact') && token.type === 'text') {
        return { ...token, type: 'exact' as const }
      }
      return token
    })
  
    const parsed: ParsedSearch = {
      tokens: parsedTokens,
      scopes,
      matchMode,
      timeRange,
      ...(timeRange === 'custom' && {
        customStartDate: customDateRange.start,
        customEndDate: customDateRange.end
      })
    }
  
    setParsedSearch(parsed)
  
    // ✅ 即使 query 為空，也紀錄條件進歷史
    const historyItem = {
      query,
      scopes,
      matchMode,
      timeRange,
      timestamp: new Date()
    }
  
    setSearchHistory(prev => {
      const filtered = prev.filter(item => item.query !== query)
      const updated = [historyItem, ...filtered].slice(0, maxHistoryItems)
      try {
        localStorage.setItem('mur_search_history', JSON.stringify(updated))
      } catch (e) {
        console.error('Error saving search history:', e)
      }
      return updated
    })
  
    return parsed
  }, [query, scopes, matchMode, timeRange, customDateRange, maxHistoryItems, parseSearchQuery])

  // 清除搜尋歷史
  const clearSearchHistory = useCallback(() => {
    setSearchHistory([])
    localStorage.removeItem('mur_search_history')
  }, [])

  // 從歷史紀錄套用搜尋
  const applyFromHistory = useCallback((historyItem: SearchHistoryItem) => {
    setQuery(historyItem.query)
    setScopes(historyItem.scopes)
    setMatchMode(historyItem.matchMode)
    setTimeRange(historyItem.timeRange)
  }, [])

  // 設定自訂日期範圍
  const setCustomTimeRange = useCallback((start?: Date, end?: Date) => {
    setCustomDateRange({ start, end })
    setTimeRange('custom')
  }, [])

  // 清除搜尋
  const clearSearch = useCallback(() => {
    setQuery('')
    setScopes(defaultScopes)
    setMatchMode(defaultMatchMode)
    setTimeRange(defaultTimeRange)
    setCustomDateRange({})
  }, [defaultScopes, defaultTimeRange])

  return {
    // 狀態
    query,
    scopes,
    matchMode,
    timeRange,
    customDateRange,
    searchHistory,
    parsedSearch,
  
    // 設定函數
    setQuery,
    setScopes,
    setMatchMode,
    setTimeRange,
    setCustomTimeRange,
  
    // 操作函數
    executeSearch,
    clearSearch,
    applyFromHistory,
    clearSearchHistory
  }
}