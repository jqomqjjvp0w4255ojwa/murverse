// src/features/fragments/layout/getRelevanceMap.ts
import { RelevanceMap } from '../types/gridTypes'
import { Fragment } from '../types/fragment'

/**
 * 計算碎片與選定標籤的相關性
 * 
 * @param fragments 碎片陣列
 * @param selectedTags 選定的標籤陣列
 * @returns 相關性映射 (碎片ID -> 相關性分數)
 */
export function getRelevanceMap(
  fragments: Pick<Fragment, 'id' | 'tags'>[],
  selectedTags: string[]
): RelevanceMap {
  // 如果沒有選擇標籤，返回空映射
  if (!selectedTags.length) return {}
  
  const tagSet = new Set(selectedTags)
  const map: RelevanceMap = {}

  for (const fragment of fragments) {
    const hitCount = fragment.tags.filter(tag => tagSet.has(tag)).length
    if (hitCount > 0) {
      // 相關性計算：匹配的標籤數量 / 該碎片的總標籤數量
      map[fragment.id] = hitCount / Math.max(1, fragment.tags.length) // 避免除以零
    }
  }

  return map
}