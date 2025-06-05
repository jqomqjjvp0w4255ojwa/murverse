'use client'

import { Fragment } from '@/features/fragments/types/fragment'
import { apiClient } from '@/services/api-client'
// 使用統一的 API
import { loadGlobalTags, saveGlobalTag, loadRecentTags, saveRecentTags } from './SupabaseTagsService'

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
 * 修正版：使用 API 而不是直接操作 Store
 */
export class TagsService {
  /**
   * 從碎片集合中提取所有標籤及其使用頻率
   */
  static getTagsFromFragments(fragments: Fragment[]): Map<string, number> {
    const tagsMap = new Map<string, number>()
    
    fragments.forEach(fragment => {
      if (fragment.tags && Array.isArray(fragment.tags)) {
        fragment.tags.forEach(tag => {
          tagsMap.set(tag, (tagsMap.get(tag) || 0) + 1)
        })
      }
    })
    
    return tagsMap
  }
  
  /**
   * 從 Supabase 加載全域標籤
   */
  static async loadGlobalTags(): Promise<string[]> {
    try {
      const tags = await loadGlobalTags()
      return tags.map(t => t.name)
    } catch (error) {
      console.error('❌ 載入全域標籤時發生錯誤:', error)
      return []
    }
  }

  static async saveGlobalTags(tags: string[]): Promise<void> {
    try {
      // 保存全域標籤需要逐一處理
      for (const tag of tags) {
        await saveGlobalTag(tag)
      }
    } catch (error) {
      console.error('❌ 儲存全域標籤時發生錯誤:', error)
    }
  }

  /**
   * 從 Supabase 加載最近使用的標籤
   */
  static async loadRecentTags(): Promise<string[]> {
    try {
      return await loadRecentTags()
    } catch (error) {
      console.error('❌ 載入最近標籤時發生錯誤:', error)
      return []
    }
  }

  static async saveRecentTags(tags: string[]): Promise<void> {
    try {
      await saveRecentTags(tags)
    } catch (error) {
      console.error('❌ 儲存最近標籤時發生錯誤:', error)
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
      if (!fragment.updatedAt) return
      
      const date = new Date(fragment.updatedAt).getTime()
      const age = (now - date) / oneWeek // 以週為單位的年齡
      
      if (fragment.tags && Array.isArray(fragment.tags)) {
        fragment.tags.forEach(tag => {
          if (!metrics[tag]) {
            metrics[tag] = { usage: 0, recency: 0 }
          }
          
          metrics[tag].usage += 1
          
          // 按時間加權，越近的碎片加權越高
          metrics[tag].recency += 1 / (1 + age)
        })
      }
    })
    
    return metrics
  }
  
  /**
   * 將標籤添加到指定碎片 - 使用 API
   */
  static async addTagToFragment(fragmentId: string, tag: string): Promise<TagOperationResult> {
    try {
      await apiClient.addTagToFragment(fragmentId, tag)
      
      return { 
        success: true, 
        message: `已將標籤「${tag}」添加到碎片`, 
        affectedFragments: 1 
      }
    } catch (error) {
      console.error('❌ 添加標籤時發生錯誤:', error)
      return { 
        success: false, 
        message: error instanceof Error ? error.message : '添加標籤失敗'
      }
    }
  }
  
  /**
   * 從指定碎片中移除標籤 - 使用 API
   */
  static async removeTagFromFragment(fragmentId: string, tag: string): Promise<TagOperationResult> {
    try {
      await apiClient.removeTagFromFragment(fragmentId, tag)
      
      return { 
        success: true, 
        message: `已從碎片中移除標籤「${tag}」`, 
        affectedFragments: 1 
      }
    } catch (error) {
      console.error('❌ 移除標籤時發生錯誤:', error)
      return { 
        success: false, 
        message: error instanceof Error ? error.message : '移除標籤失敗'
      }
    }
  }
  
  /**
   * 尋找包含特定標籤的所有碎片
   */
  static findFragmentsByTag(fragments: Fragment[], tag: string): Fragment[] {
    return fragments.filter(fragment => 
      fragment.tags && fragment.tags.includes(tag)
    )
  }
  
  /**
   * 尋找相似標籤（基於共現頻率）
   * @param tag 目標標籤
   * @param fragments 碎片列表
   * @param limit 返回限制數量
   * @returns 相似標籤列表
   */
  static findSimilarTagsByCooccurrence(
    tag: string, 
    fragments: Fragment[], 
    limit = 5
  ): SimilarTag[] {
    const taggedFragments = fragments.filter(f => 
      f.tags && f.tags.includes(tag)
    )
    
    if (taggedFragments.length === 0) {
      return []
    }
    
    // 計算共現頻率
    const coOccurrences: Record<string, number> = {}
    taggedFragments.forEach(fragment => {
      if (fragment.tags) {
        fragment.tags.forEach(t => {
          if (t !== tag) {
            coOccurrences[t] = (coOccurrences[t] || 0) + 1
          }
        })
      }
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
   * 批量處理標籤（添加到多個碎片） - 使用 Promise.allSettled
   */
  static async batchAddTag(fragmentIds: string[], tag: string): Promise<TagOperationResult> {
    try {
      // 使用 Promise.allSettled 進行並發操作
      const results = await Promise.allSettled(
        fragmentIds.map(fragmentId => 
          apiClient.addTagToFragment(fragmentId, tag)
        )
      )
      
      const successCount = results.filter(r => r.status === 'fulfilled').length
      const errorCount = results.filter(r => r.status === 'rejected').length
      
      // 記錄失敗的詳細信息
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`❌ 為 fragment ${fragmentIds[index]} 添加標籤失敗:`, result.reason)
        }
      })
      
      return { 
        success: successCount > 0, 
        message: `已將標籤「${tag}」添加到 ${successCount} 個碎片${errorCount > 0 ? `，${errorCount} 個失敗` : ''}`, 
        affectedFragments: successCount 
      }
    } catch (error) {
      console.error('❌ 批量添加標籤時發生錯誤:', error)
      return { success: false, message: '批量添加標籤失敗' }
    }
  }
  
  /**
   * 批量處理標籤（從多個碎片移除） - 使用 Promise.allSettled
   */
  static async batchRemoveTag(fragmentIds: string[], tag: string): Promise<TagOperationResult> {
    try {
      // 使用 Promise.allSettled 進行並發操作
      const results = await Promise.allSettled(
        fragmentIds.map(fragmentId => 
          apiClient.removeTagFromFragment(fragmentId, tag)
        )
      )
      
      const successCount = results.filter(r => r.status === 'fulfilled').length
      const errorCount = results.filter(r => r.status === 'rejected').length
      
      // 記錄失敗的詳細信息
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`❌ 為 fragment ${fragmentIds[index]} 移除標籤失敗:`, result.reason)
        }
      })
      
      return { 
        success: successCount > 0, 
        message: `已從 ${successCount} 個碎片移除標籤「${tag}」${errorCount > 0 ? `，${errorCount} 個失敗` : ''}`, 
        affectedFragments: successCount 
      }
    } catch (error) {
      console.error('❌ 批量移除標籤時發生錯誤:', error)
      return { success: false, message: '批量移除標籤失敗' }
    }
  }
  
  /**
   * 計算標籤使用統計
   */
  static getTagStats(fragments: Fragment[]) {
    const tagCounts: Record<string, number> = {}
    
    fragments.forEach(fragment => {
      if (fragment.tags && Array.isArray(fragment.tags)) {
        fragment.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1
        })
      }
    })
    
    return Object.entries(tagCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }
  
  /**
   * 重命名標籤（在所有碎片中） - 改善版本，使用事務式操作
   */
  static async renameTag(
    oldName: string, 
    newName: string, 
    fragments: Fragment[]
  ): Promise<TagOperationResult> {
    try {
      // 檢查新名稱是否已存在
      const tagExists = fragments.some(f => 
        f.tags && f.tags.includes(newName)
      )
      if (tagExists) {
        return { 
          success: false, 
          message: `標籤「${newName}」已存在` 
        }
      }
      
      // 找到包含舊標籤的所有 fragments
      const fragmentsWithTag = fragments.filter(f => 
        f.tags && f.tags.includes(oldName)
      )
      
      if (fragmentsWithTag.length === 0) {
        return {
          success: false,
          message: `標籤「${oldName}」不存在`
        }
      }
      
      // 使用批量操作，提高效率和一致性
      const fragmentIds = fragmentsWithTag.map(f => f.id)
      
      // 先添加新標籤到所有相關 fragments
      const addResult = await this.batchAddTag(fragmentIds, newName)
      
      if (!addResult.success) {
        return {
          success: false,
          message: `添加新標籤「${newName}」失敗`
        }
      }
      
      // 然後移除舊標籤
      const removeResult = await this.batchRemoveTag(fragmentIds, oldName)
      
      if (!removeResult.success) {
        // 如果移除失敗，嘗試回滾（移除新添加的標籤）
        console.warn('移除舊標籤失敗，嘗試回滾...')
        await this.batchRemoveTag(fragmentIds, newName)
        
        return {
          success: false,
          message: `移除舊標籤「${oldName}」失敗，已回滾`
        }
      }
      
      // 更新全域標籤
      try {
        const globalTags = await this.loadGlobalTags()
        const updatedTags = globalTags.map(t => t === oldName ? newName : t)
        await this.saveGlobalTags(updatedTags)
      } catch (e) {
        console.warn('更新全域標籤失敗，但重命名操作已完成', e)
      }
      
      return { 
        success: true, 
        message: `已將標籤「${oldName}」重命名為「${newName}」，影響 ${addResult.affectedFragments} 個碎片`, 
        affectedFragments: addResult.affectedFragments 
      }

    } catch (error) {
      console.error('❌ 重命名標籤時發生錯誤:', error)
      return { success: false, message: '重命名標籤失敗' }
    }
  }
  
  /**
   * 刪除標籤（從所有碎片中移除） - 使用批量操作
   */
  static async deleteTag(tag: string, fragments: Fragment[]): Promise<TagOperationResult> {
    try {
      // 找到包含此標籤的所有 fragments
      const fragmentsWithTag = fragments.filter(f => 
        f.tags && f.tags.includes(tag)
      )
      
      if (fragmentsWithTag.length === 0) {
        return {
          success: false,
          message: `標籤「${tag}」不存在於任何碎片中`
        }
      }
      
      const fragmentIds = fragmentsWithTag.map(f => f.id)
      
      // 使用批量移除
      const removeResult = await this.batchRemoveTag(fragmentIds, tag)
      
      if (removeResult.success) {
        // 從全域標籤中移除
        try {
          const globalTags = await this.loadGlobalTags()
          const updatedTags = globalTags.filter(t => t !== tag)
          await this.saveGlobalTags(updatedTags)
        } catch (e) {
          console.warn('從全域標籤移除失敗，但刪除操作已完成', e)
        }
      }
      
      return removeResult

    } catch (error) {
      console.error('❌ 刪除標籤時發生錯誤:', error)
      return { success: false, message: '刪除標籤失敗' }
    }
  }
}