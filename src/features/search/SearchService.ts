// services/SearchService.ts
import { Fragment } from '@/features/fragments/types/fragment'
import { SearchToken, MatchMode, matchesSearchToken, matchText } from '@/features/search/searchHelpers'

export type SearchScope = 'fragment' | 'note' | 'tag'

export interface SearchOptions {
  keyword?: string;
  tokens?: SearchToken[];
  scopes?: SearchScope[];
  matchMode?: MatchMode;
  timeRange?: string;
  customStartDate?: Date;
  customEndDate?: Date;
  selectedTags?: string[];
  excludedTags?: string[];
  tagLogicMode?: 'AND' | 'OR';
}

export class SearchService {
  // 主要搜索方法 - 統一入口點
  static search(fragments: Fragment[], options: SearchOptions): Fragment[] {
    const { 
      keyword, 
      tokens = [], 
      scopes = ['fragment'], 
      matchMode = 'substring',
      timeRange = 'all',
      customStartDate,
      customEndDate,
      selectedTags = [],
      excludedTags = [], 
      tagLogicMode = 'AND'
    } = options;
    
    console.log("🔍 SearchService.search 開始執行:", {
      keyword, 
      matchMode, 
      scopes, 
      tokensLength: tokens.length,
      fragmentsCount: fragments.length
    });
      
    return fragments.filter(fragment => {
      // 1. 時間範圍檢查
      if (!this.isDateInRange(fragment.updatedAt || fragment.createdAt, timeRange, customStartDate, customEndDate)) {
        return false;
      }
      
      // 2. 標籤檢查
      if (!this.matchesTags(fragment, selectedTags, excludedTags, tagLogicMode)) {
        return false;
      }
      
      // 3. 關鍵字檢查
      if (keyword && keyword.trim() !== '') {
        // 🔧 **關鍵修復**：只有在沒有 tokens 或者 tokens 只是簡單文字時才使用 keyword 匹配
        const hasComplexTokens = tokens.some(token => 
          ['include', 'exclude', 'or', 'wildcard', 'exact'].includes(token.type)
        );
        
        if (!hasComplexTokens) {
          const result = this.matchKeyword(fragment, keyword, scopes, matchMode);
          console.log(`🔍 關鍵字匹配結果 - 碎片:"${fragment.content?.substring(0, 30)}..." 關鍵字:"${keyword}" 模式:${matchMode} 結果:${result}`);
          return result;
        }
      }
      
      // 4. 高級語法檢查（只有複雜 tokens 時才使用）
      if (tokens.length > 0) {
        console.log(`🔧 使用 tokens 匹配模式, tokens:`, tokens);
        return this.matchTokens(fragment, tokens, scopes, matchMode);
      }
      
      // 如果沒有搜索條件，則返回所有碎片
      console.log(`⚠️ 沒有搜索條件，返回所有碎片`);
      return true;
    });
  }
  
  // 檢查標籤匹配
  static matchesTags(fragment: Fragment, selectedTags: string[], excludedTags: string[], tagLogicMode: 'AND' | 'OR'): boolean {
    // 排除標籤檢查
    if (excludedTags.length > 0 && excludedTags.some(tag => fragment.tags.includes(tag))) {
      return false;
    }
    
    // 如果沒有選中標籤，返回所有碎片
    if (selectedTags.length === 0) return true;
    
    // 根據標籤邏輯模式檢查
    return tagLogicMode === 'AND'
      ? selectedTags.every(tag => fragment.tags.includes(tag))
      : selectedTags.some(tag => fragment.tags.includes(tag));
  }

  static parseSearchQuery(searchQuery: string, matchMode: MatchMode = 'substring'): SearchToken[] {
    const tokens: SearchToken[] = [];
    let buffer = '';
    let inExactMatch = false;
    
    for (let i = 0; i < searchQuery.length; i++) {
      const char = searchQuery[i];
      
      // 處理精確匹配（引號內的內容）
      if (char === "'") {
        if (inExactMatch) {
          // 結束精確匹配
          if (buffer) {
            tokens.push({ type: 'exact', value: buffer });
            buffer = '';
          }
          inExactMatch = false;
        } else {
          // 開始精確匹配，但先將當前緩衝區處理完
          if (buffer) {
            tokens.push({ type: 'text', value: buffer });
            buffer = '';
          }
          inExactMatch = true;
        }
        continue;
      }
      
      if (inExactMatch) {
        buffer += char;
        continue;
      }
      
      // 處理特殊字符
      if (['+', '-', '*'].includes(char) && (i === 0 || searchQuery[i-1] === ' ')) {
        // 處理前一個緩衝區
        if (buffer) {
          tokens.push({ type: 'text', value: buffer });
          buffer = '';
        }
        
        // 查看下一個字符
        if (i + 1 < searchQuery.length && searchQuery[i+1] !== ' ') {
          // 收集操作符之後的文本
          let tempBuffer = '';
          let j = i + 1;
          
          while (j < searchQuery.length && searchQuery[j] !== ' ' && 
                 !['+', '-', '*'].includes(searchQuery[j])) {
            tempBuffer += searchQuery[j];
            j++;
          }
          
          if (tempBuffer) {
            if (char === '+') tokens.push({ type: 'include', value: tempBuffer });
            else if (char === '-') tokens.push({ type: 'exclude', value: tempBuffer });
            else if (char === '*') tokens.push({ type: 'wildcard', value: tempBuffer });
            
            i = j - 1; // 跳過已處理的字符
          }
        }
        continue;
      }
      
      // 處理 OR 操作符
      if (i + 2 < searchQuery.length && 
          searchQuery.substring(i, i+2).toUpperCase() === 'OR' &&
          (i === 0 || searchQuery[i-1] === ' ') && 
          (i+2 === searchQuery.length || searchQuery[i+2] === ' ')) {
        
        // 處理前一個緩衝區
        if (buffer) {
          tokens.push({ type: 'text', value: buffer });
          buffer = '';
        }
        
        // 收集 OR 操作符之後的文本
        let tempBuffer = '';
        let j = i + 3;
        
        while (j < searchQuery.length && searchQuery[j] !== ' ' && 
               !['+', '-', '*'].includes(searchQuery[j])) {
          tempBuffer += searchQuery[j];
          j++;
        }
        
        if (tempBuffer) {
          tokens.push({ type: 'or', value: tempBuffer });
          i = j - 1; // 跳過已處理的字符
        }
        
        continue;
      }
      
      // 其他字符添加到緩衝區
      buffer += char;
    }
    
    // 處理最後的緩衝區
    if (buffer) {
      if (inExactMatch) {
        tokens.push({ type: 'exact', value: buffer });
      } else {
        tokens.push({ type: 'text', value: buffer.trim() });
      }
    }
    
    // 根據 matchMode 調整文本類型 token
    return tokens
      .filter(token => token.value.trim() !== '')
      .map(token => {
        if (matchMode === 'exact' && token.type === 'text') {
          return { ...token, type: 'exact' as const };
        }
        return token;
      });
  }

  // 🔧 修復：關鍵字匹配方法，正確實現不同比對模式
  private static matchKeyword(fragment: Fragment, keyword: string, scopes: SearchScope[], matchMode: MatchMode): boolean {
    // 如果沒有指定範圍，返回 false
    if (!scopes || scopes.length === 0) return false;
    
    const keywordLower = keyword.toLowerCase();
    
    console.log(`🎯 matchKeyword 開始 - 關鍵字:"${keyword}" 模式:${matchMode} 範圍:${scopes.join(',')}`);
    
    // 依據選擇的範圍進行搜索
    let matchResults = {
      fragment: false,
      tag: false,
      note: false
    };
    
    // 🚀 核心修復：正確實現不同的比對模式
    const testMatch = (text: string, textType: string): boolean => {
      const textLower = text.toLowerCase().trim();
      
      let result = false;
      switch (matchMode) {
        case 'exact':
          // 完全符合：整個文字必須與搜尋詞一模一樣
          result = textLower === keywordLower;
          break;
        case 'prefix':
          // 開頭符合：文字必須以關鍵字開頭
          result = textLower.startsWith(keywordLower);
          break;
        case 'substring':
        default:
          // 包含：文字中包含關鍵字即可
          result = textLower.includes(keywordLower);
          break;
      }
      
      console.log(`  📝 ${textType} 測試: "${textLower}" vs "${keywordLower}" [${matchMode}] = ${result}`);
      return result;
    };
    
    // 檢查選擇的範圍
    if (scopes.includes('fragment')) {
      const content = fragment.content || '';
      matchResults.fragment = matchText(content, keyword, matchMode);
    }

    if (scopes.includes('tag')) {
      matchResults.tag = fragment.tags?.some(tag => 
        matchText(tag, keyword, matchMode)
      ) ?? false;
    }

    if (scopes.includes('note')) {
      matchResults.note = (fragment.notes || []).some(note => 
        matchText(note.value || '', keyword, matchMode)
      ) ?? false;
    }
    
    // 如果任何一個選擇的範圍有匹配，則返回 true
    const finalResult = scopes.some(scope => matchResults[scope]);
    
    console.log(`  ✅ matchKeyword 結果:`, {
      keyword,
      matchMode,
      scopes,
      activeResults: Object.fromEntries(
        Object.entries(matchResults).filter(([key]) => scopes.includes(key as SearchScope))
      ),
      finalResult
    });
    
    return finalResult;
  }
  
  private static isDateInRange(dateStr: string, timeRange: string, customStart?: Date, customEnd?: Date): boolean {
    const date = new Date(dateStr);
    const now = new Date();
    
    // 重置當前時間為當天開始（00:00:00）
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch(timeRange) {
      case 'today':
        return date >= today;
      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return date >= yesterday && date < today;
      }
      case 'week': {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay()); // 設為本週日（一週的開始）
        return date >= weekStart;
      }
      case 'month': {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return date >= monthStart;
      }
      case 'custom':
        return (
          (!customStart || date >= customStart) && 
          (!customEnd || date <= customEnd)
        );
      case 'all':
      default:
        return true;
    }
  }
  
  private static matchTokens(fragment: Fragment, tokens: SearchToken[], scopes: SearchScope[], matchMode: MatchMode): boolean {
    // 基於選定範圍創建要匹配的文本集合
    let textsToMatch: { scope: string, text: string }[] = [];
    
    if (scopes.includes('fragment')) {
      textsToMatch.push({ scope: 'fragment', text: fragment.content || '' });
    }
    
    if (scopes.includes('tag')) {
      textsToMatch.push({ scope: 'tag', text: (fragment.tags || []).join(' ') });
    }
    
    if (scopes.includes('note')) {
      textsToMatch.push({ scope: 'note', text: (fragment.notes || []).map(n => n.value).join(' ') });
    }
    
    if (textsToMatch.length === 0) return false;

    const normalTokens = tokens.filter(t => !['exclude', 'or'].includes(t.type));
    const excludeTokens = tokens.filter(t => t.type === 'exclude');
    const orTokens = tokens.filter(t => t.type === 'or');

    // 檢查是否所有正常 tokens 都匹配至少一個範圍內的文本
    const normalMatched = normalTokens.length === 0 || normalTokens.every(token => 
      textsToMatch.some(item => matchesSearchToken(item.text, token, matchMode))
    );

    // 修正排除邏輯：直接檢查是否包含要排除的內容
    const excluded = excludeTokens.some(token => {
      return textsToMatch.some(item => {
        const lowerText = item.text.toLowerCase().trim();
        const lowerVal = token.value.toLowerCase();
        
        // 根據當前匹配模式選擇適當的匹配方法
        switch (matchMode) {
          case 'exact':
            // 完全符合：整個文字必須一模一樣
            return lowerText === lowerVal;
          case 'prefix':
            return lowerText.startsWith(lowerVal);
          case 'substring':
          default:
            return lowerText.includes(lowerVal);
        }
      });
    });

    // 檢查是否沒有 OR tokens，或者至少有一個 OR token 匹配某個範圍內的文本
    const orMatched = orTokens.length === 0 || orTokens.some(token => 
      textsToMatch.some(item => matchesSearchToken(item.text, token, matchMode))
    );

    return normalMatched && !excluded && orMatched;
  }
  
  // 添加輔助函數 - 用於轉義正則表達式中的特殊字符
  private static escapeRegExp(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
}