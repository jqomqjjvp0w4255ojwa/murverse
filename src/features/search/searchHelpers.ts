import { Fragment } from '@/features/fragments/types/fragment'

export type MatchMode = 'exact' | 'prefix' | 'substring'
export interface SearchToken {
  type: 'include' | 'exclude' | 'or' | 'wildcard' | 'exact' | 'text'
  value: string
}

export const escapeRegExp = (str: string) =>
  str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function parseQuery(query: string): SearchToken[] {
  const tokens: SearchToken[] = []
  const parts = query.match(/[+-]?[^\s]+/g) || []

  for (const part of parts) {
    if (part.startsWith('+')) {
      tokens.push({ type: 'include', value: part.slice(1) })
    } else if (part.startsWith('-')) {
      tokens.push({ type: 'exclude', value: part.slice(1) })
    } else {
      tokens.push({ type: 'text', value: part })
    }
  }

  return tokens
}

export function matchFragment(
  fragment: Fragment,
  tokens: SearchToken[],
  mode: MatchMode,
  scopes: ('fragment' | 'note' | 'tag')[]
): boolean {
  // 如果沒有 tokens，直接返回 true
  if (!tokens.length) return true;

  const normalTokens = tokens.filter(t => !['exclude', 'or'].includes(t.type))
  const excludeTokens = tokens.filter(t => t.type === 'exclude')
  const orTokens = tokens.filter(t => t.type === 'or')

  // 基於選定範圍創建要匹配的文本集合
  let textsToMatch: string[] = [];
  
  if (scopes.includes('fragment')) {
    textsToMatch.push(fragment.content || '');
  }
  
  if (scopes.includes('tag')) {
    textsToMatch.push((fragment.tags || []).join(' '));
  }
  
  if (scopes.includes('note')) {
    textsToMatch.push((fragment.notes || []).map(n => n.value).join(' '));
  }
  
  // 如果沒有要匹配的文本，返回 false
  if (textsToMatch.length === 0) return false;

  // 檢查是否所有正常 tokens 都匹配至少一個範圍內的文本
  const normalMatched = normalTokens.length === 0 || normalTokens.every(token => 
    textsToMatch.some(text => matchesSearchToken(text, token, mode))
  );

  // 檢查是否任何排除 token 匹配任何範圍內的文本
  // 修正：對於排除語法，我們應該檢查任何文本是否包含要排除的值
  const excluded = excludeTokens.some(token => 
    textsToMatch.some(text => {
      // 直接使用 matchText 來檢查是否包含要排除的值
      return matchText(text.toLowerCase(), token.value.toLowerCase(), mode);
    })
  );

  // 檢查是否沒有 OR tokens，或者至少有一個 OR token 匹配某個範圍內的文本
  const orMatched = orTokens.length === 0 || orTokens.some(token => 
    textsToMatch.some(text => matchesSearchToken(text, token, mode))
  );

  return normalMatched && !excluded && orMatched;
}

export function matchText(text: string, keyword: string, mode: MatchMode): boolean {
  const src = text.toLowerCase().trim()
  const key = keyword.toLowerCase().trim()

  if (!key) return false

  switch (mode) {
    case 'exact':
      if (/^\d+$/.test(key)) {
        // 如果是純數字，避免使用 \b 造成 miss
        return src.split(/\s+/).includes(key)
      } else {
        return new RegExp(`\\b${escapeRegExp(key)}\\b`).test(src)
      }
    case 'prefix':
      return src.startsWith(key)
    case 'substring':
      return src.includes(key)
    default:
      return false
  }
}

export function matchesSearchToken(
  text: string,
  token: SearchToken,
  mode: MatchMode
): boolean {
  const src = text.toLowerCase()
  const val = token.value.toLowerCase()

  switch (token.type) {
    case 'include':
    case 'text': // 視為同義
    case 'or':
      return matchText(src, val, mode)
    case 'exclude':
      return !matchText(src, val, mode)
    case 'exact':
      return src.includes(val)
    case 'wildcard': {
      const regex = new RegExp('^' + escapeRegExp(val).split('\\*').join('.*') + '$', 'i')
      return regex.test(text)
    }
    default:
      return false
  }
}
