'use client'

import { Fragment } from '@/features/fragments/types/fragment'

/**
 * 相似標籤類型定義
 */
export interface SimilarTag {
  name: string
  count: number
  percentage?: number
}

/**
 * 標籤操作結果
 */
export interface TagOperationResult {
  success: boolean
  message?: string
  affectedFragments?: number
}

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
   * 將標籤添加到指定碎片
   */
  static addTagToFragment(fragmentId: string, tag: string): TagOperationResult {
    const { fragments, setFragments, save } = useFragmentsStore.getState()
    
    // 尋找目標碎片
    const fragment = fragments.find(f => f.id === fragmentId)
    if (!fragment) {
      return { 
        success: false, 
        message: '找不到指定碎片' 
      }
    }
    
    // 檢查標籤是否已存在
    if (fragment.tags.includes(tag)) {
      return { 
        success: false, 
        message: '標籤已存在於此碎片' 
      }
    }
    
    // 更新碎片
    const updatedFragments = fragments.map(f => {
      if (f.id === fragmentId) {
        return {
          ...f,
          tags: [...f.tags, tag],
          updatedAt: new Date().toISOString()
        }
      }
      return f
    })
    
    setFragments(updatedFragments)
    save()
    
    return { 
      success: true, 
      message: `已將標籤「${tag}」添加到碎片`, 
      affectedFragments: 1 
    }
  }
  
  /**
   * 從指定碎片中移除標籤
   */
  static removeTagFromFragment(fragmentId: string, tag: string): TagOperationResult {
    const { fragments, setFragments, save } = useFragmentsStore.getState()
    
    // 尋找目標碎片
    const fragment = fragments.find(f => f.id === fragmentId)
    if (!fragment) {
      return { 
        success: false, 
        message: '找不到指定碎片' 
      }
    }
    
    // 檢查標籤是否存在
    if (!fragment.tags.includes(tag)) {
      return { 
        success: false, 
        message: '此碎片不含該標籤' 
      }
    }
    
    // 更新碎片
    const updatedFragments = fragments.map(f => {
      if (f.id === fragmentId) {
        return {
          ...f,
          tags: f.tags.filter(t => t !== tag),
          updatedAt: new Date().toISOString()
        }
      }
      return f
    })
    
    setFragments(updatedFragments)
    save()
    
    return { 
      success: true, 
      message: `已從碎片中移除標籤「${tag}」`, 
      affectedFragments: 1 
    }
  }
  
  /**
   * 尋找包含特定標籤的所有碎片
   */
  static findFragmentsByTag(tag: string): Fragment[] {
    const { fragments } = useFragmentsStore.getState()
    return fragments.filter(fragment => fragment.tags.includes(tag))
  }
  
  /**
   * 尋找相似標籤（基於共現頻率）
   * @param tag 目標標籤
   * @param limit 返回限制數量
   * @returns 相似標籤列表
   */
  static findSimilarTagsByCooccurrence(tag: string, limit = 5): SimilarTag[] {
    const { fragments } = useFragmentsStore.getState()
    const taggedFragments = fragments.filter(f => f.tags.includes(tag))
    
    if (taggedFragments.length === 0) {
      return []
    }
    
    // 計算共現頻率
    const coOccurrences: Record<string, number> = {}
    taggedFragments.forEach(fragment => {
      fragment.tags.forEach(t => {
        if (t !== tag) {
          coOccurrences[t] = (coOccurrences[t] || 0) + 1
        }
      })
    })
    
    // 計算相似百分比
    const totalFragmentsWithTag = taggedFragments.length
    const similarTags = Object.entries(coOccurrences).map(([name, count]) => {
      const percentage = Math.round((count / totalFragmentsWithTag) * 100)
      return { name, count, percentage }
    })
    
    // 按共現次數排序並限制返回數量
    return similarTags
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  }
  
  /**
   * 查找與給定標籤相似的標籤（基於文本相似度）
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
  
  /**
   * 批量處理標籤（添加到多個碎片）
   */
  static batchAddTag(fragmentIds: string[], tag: string): TagOperationResult {
    const { fragments, setFragments, save } = useFragmentsStore.getState()
    
    let affectedCount = 0
    const updatedFragments = fragments.map(fragment => {
      if (fragmentIds.includes(fragment.id) && !fragment.tags.includes(tag)) {
        affectedCount++
        return {
          ...fragment,
          tags: [...fragment.tags, tag],
          updatedAt: new Date().toISOString()
        }
      }
      return fragment
    })
    
    if (affectedCount > 0) {
      setFragments(updatedFragments)
      save()
    }
    
    return { 
      success: true, 
      message: `已將標籤「${tag}」添加到 ${affectedCount} 個碎片`, 
      affectedFragments: affectedCount 
    }
  }
  
  /**
   * 批量處理標籤（從多個碎片移除）
   */
  static batchRemoveTag(fragmentIds: string[], tag: string): TagOperationResult {
    const { fragments, setFragments, save } = useFragmentsStore.getState()
    
    let affectedCount = 0
    const updatedFragments = fragments.map(fragment => {
      if (fragmentIds.includes(fragment.id) && fragment.tags.includes(tag)) {
        affectedCount++
        return {
          ...fragment,
          tags: fragment.tags.filter(t => t !== tag),
          updatedAt: new Date().toISOString()
        }
      }
      return fragment
    })
    
    if (affectedCount > 0) {
      setFragments(updatedFragments)
      save()
    }
    
    return { 
      success: true, 
      message: `已從 ${affectedCount} 個碎片移除標籤「${tag}」`, 
      affectedFragments: affectedCount 
    }
  }
  
  /**
   * 計算標籤使用統計
   */
  static getTagStats() {
    const { fragments } = useFragmentsStore.getState()
    const tagCounts: Record<string, number> = {}
    
    fragments.forEach(fragment => {
      fragment.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      })
    })
    
    return Object.entries(tagCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }
  
  /**
   * 重命名標籤（在所有碎片中）
   */
  static renameTag(oldName: string, newName: string): TagOperationResult {
    const { fragments, setFragments, save } = useFragmentsStore.getState()
    
    // 檢查新名稱是否已存在
    const tagExists = fragments.some(f => f.tags.includes(newName))
    if (tagExists) {
      return { 
        success: false, 
        message: `標籤「${newName}」已存在` 
      }
    }
    
    let affectedCount = 0
    const updatedFragments = fragments.map(fragment => {
      if (fragment.tags.includes(oldName)) {
        affectedCount++
        return {
          ...fragment,
          tags: fragment.tags.map(t => t === oldName ? newName : t),
          updatedAt: new Date().toISOString()
        }
      }
      return fragment
    })
    
    if (affectedCount > 0) {
      setFragments(updatedFragments)
      save()
      
      // 更新本地儲存的全局標籤列表
      try {
        const storedTags = JSON.parse(localStorage.getItem('mur_tags_global') || '[]')
        if (storedTags.includes(oldName)) {
          const updatedStoredTags = storedTags.map((t: string) => t === oldName ? newName : t)
          localStorage.setItem('mur_tags_global', JSON.stringify(updatedStoredTags))
        }
      } catch (e) {
        console.error('更新本地儲存標籤失敗', e)
      }
    }
    
    return { 
      success: true, 
      message: `已將標籤「${oldName}」重命名為「${newName}」`, 
      affectedFragments: affectedCount 
    }
  }
  
  /**
   * 刪除標籤（從所有碎片中移除）
   */
  static deleteTag(tag: string): TagOperationResult {
    const { fragments, setFragments, save } = useFragmentsStore.getState()
    
    let affectedCount = 0
    const updatedFragments = fragments.map(fragment => {
      if (fragment.tags.includes(tag)) {
        affectedCount++
        return {
          ...fragment,
          tags: fragment.tags.filter(t => t !== tag),
          updatedAt: new Date().toISOString()
        }
      }
      return fragment
    })
    
    if (affectedCount > 0) {
      setFragments(updatedFragments)
      save()
      
      // 從本地儲存的全局標籤列表中移除
      try {
        const storedTags = JSON.parse(localStorage.getItem('mur_tags_global') || '[]')
        if (storedTags.includes(tag)) {
          const updatedStoredTags = storedTags.filter((t: string) => t !== tag)
          localStorage.setItem('mur_tags_global', JSON.stringify(updatedStoredTags))
        }
      } catch (e) {
        console.error('從本地儲存移除標籤失敗', e)
      }
    }
    
    return { 
      success: true, 
      message: `已從 ${affectedCount} 個碎片中刪除標籤「${tag}」`, 
      affectedFragments: affectedCount 
    }
  }
}

import { useFragmentsStore } from '@/features/fragments/store/useFragmentsStore'