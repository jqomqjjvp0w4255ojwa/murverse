// services/TagsService.ts

import { Fragment } from '@/types/fragment'

/**
 * 標籤服務 - 負責標籤相關操作和計算
 */
export class TagsService {
  /**
   * 從碎片集合中提取所有標籤及其使用頻率
   */
  static getTagsFromFragments(fragments: Fragment[]): Map<string, number> {
    const tagsMap = new Map<string, number>()
    
    fragments.forEach(fragment => {
      fragment.tags.forEach(tag => {
        tagsMap.set(tag, (tagsMap.get(tag) || 0) + 1)
      })
    })
    
    return tagsMap
  }
  
  /**
   * 從 localStorage 加載全域標籤
   */
  static loadGlobalTags(): string[] {
    try {
      return JSON.parse(localStorage.getItem('mur_tags_global') || '[]')
    } catch (e) {
      console.error('Error loading global tags', e)
      return []
    }
  }
  
  /**
   * 將全域標籤保存到 localStorage
   */
  static saveGlobalTags(tags: string[]): void {
    try {
      localStorage.setItem('mur_tags_global', JSON.stringify(tags))
    } catch (e) {
      console.error('Error saving global tags', e)
    }
  }
  
  /**
   * 從 localStorage 加載最近使用的標籤
   */
  static loadRecentTags(): string[] {
    try {
      return JSON.parse(localStorage.getItem('mur_recent_tags') || '[]')
    } catch (e) {
      console.error('Error loading recent tags', e)
      return []
    }
  }
  
  /**
   * 將最近使用的標籤保存到 localStorage
   */
  static saveRecentTags(tags: string[]): void {
    try {
      localStorage.setItem('mur_recent_tags', JSON.stringify(tags))
    } catch (e) {
      console.error('Error saving recent tags', e)
    }
  }
  
  /**
   * 計算標籤使用率和熱門度
   */
  static calculateTagMetrics(fragments: Fragment[]): { [key: string]: { usage: number, recency: number } } {
    const metrics: { [key: string]: { usage: number, recency: number } } = {}
    const now = Date.now()
    const oneWeek = 7 * 24 * 60 * 60 * 1000
    
    fragments.forEach(fragment => {
      const date = new Date(fragment.updatedAt).getTime()
      const age = (now - date) / oneWeek // 以週為單位的年齡
      
      fragment.tags.forEach(tag => {
        if (!metrics[tag]) {
          metrics[tag] = { usage: 0, recency: 0 }
        }
        
        metrics[tag].usage += 1
        
        // 按時間加權，越近的碎片加權越高
        metrics[tag].recency += 1 / (1 + age)
      })
    })
    
    return metrics
  }
  
  /**
   * 查找與給定標籤相似的標籤
   */
  static findSimilarTags(targetTag: string, allTags: string[]): string[] {
    const targetLower = targetTag.toLowerCase()
    const similar: [string, number][] = []
    
    allTags.forEach(tag => {
      if (tag === targetTag) return
      
      const tagLower = tag.toLowerCase()
      
      // 簡單的相似度計算 - 檢查是否包含
      if (tagLower.includes(targetLower) || targetLower.includes(tagLower)) {
        similar.push([tag, 1])
        return
      }
      
      // 計算 Levenshtein 距離
      const distance = this.levenshteinDistance(targetLower, tagLower)
      const maxLength = Math.max(targetLower.length, tagLower.length)
      const similarity = 1 - (distance / maxLength)
      
      if (similarity > 0.6) {
        similar.push([tag, similarity])
      }
    })
    
    return similar.sort((a, b) => b[1] - a[1]).map(s => s[0])
  }
  
  /**
   * 計算 Levenshtein 距離 (編輯距離)
   */
  private static levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length
    if (b.length === 0) return a.length
    
    const matrix = []
    
    // 初始化矩陣
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i]
    }
    
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j
    }
    
    // 填充矩陣
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        const cost = a[j - 1] === b[i - 1] ? 0 : 1
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // 刪除
          matrix[i][j - 1] + 1, // 插入
          matrix[i - 1][j - 1] + cost // 替換
        )
      }
    }
    
    return matrix[b.length][a.length]
  }
}