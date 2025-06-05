'use client'

import { Fragment } from '@/features/fragments/types/fragment'
import { useFragmentsStore } from '@/features/fragments/store/useFragmentsStore'
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
   * 將標籤添加到指定碎片 - 修正版本
   */
  static async addTagToFragment(fragmentId: string, tag: string): Promise<TagOperationResult> {
    try {
      // 使用 store 的異步方法
      await useFragmentsStore.getState().addTagToFragment(fragmentId, tag)
      
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
   * 從指定碎片中移除標籤 - 修正版本
   */
  static async removeTagFromFragment(fragmentId: string, tag: string): Promise<TagOperationResult> {
    try {
      // 使用 store 的異步方法
      await useFragmentsStore.getState().removeTagFromFragment(fragmentId, tag)
      
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
   * 批量處理標籤（添加到多個碎片）- 修正版本
   */
  static async batchAddTag(fragmentIds: string[], tag: string): Promise<TagOperationResult> {
    try {
      let successCount = 0
      let errorCount = 0
      
      // 逐一處理每個 fragment
      for (const fragmentId of fragmentIds) {
        try {
          await useFragmentsStore.getState().addTagToFragment(fragmentId, tag)
          successCount++
        } catch (error) {
          console.error(`❌ 無法為 fragment ${fragmentId} 添加標籤:`, error)
          errorCount++
        }
      }
      
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
   * 批量處理標籤（從多個碎片移除）- 修正版本
   */
  static async batchRemoveTag(fragmentIds: string[], tag: string): Promise<TagOperationResult> {
    try {
      let successCount = 0
      let errorCount = 0
      
      // 逐一處理每個 fragment
      for (const fragmentId of fragmentIds) {
        try {
          await useFragmentsStore.getState().removeTagFromFragment(fragmentId, tag)
          successCount++
        } catch (error) {
          console.error(`❌ 無法為 fragment ${fragmentId} 移除標籤:`, error)
          errorCount++
        }
      }
      
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
   * 重命名標籤（在所有碎片中）- 簡化版本
   * 注意：這個功能比較複雜，因為需要更新所有相關的 fragment
   * 暫時先實現基本邏輯，後續可以加強
   */
  static async renameTag(oldName: string, newName: string): Promise<TagOperationResult> {
    try {
      const { fragments } = useFragmentsStore.getState()
      
      // 檢查新名稱是否已存在
      const tagExists = fragments.some(f => f.tags.includes(newName))
      if (tagExists) {
        return { 
          success: false, 
          message: `標籤「${newName}」已存在` 
        }
      }
      
      // 找到包含舊標籤的所有 fragments
      const fragmentsWithTag = fragments.filter(f => f.tags.includes(oldName))
      
      if (fragmentsWithTag.length === 0) {
        return {
          success: false,
          message: `標籤「${oldName}」不存在`
        }
      }
      
      let successCount = 0
      
      // 對每個 fragment 進行標籤替換
      for (const fragment of fragmentsWithTag) {
        try {
          // 先移除舊標籤
          await useFragmentsStore.getState().removeTagFromFragment(fragment.id, oldName)
          // 再添加新標籤
          await useFragmentsStore.getState().addTagToFragment(fragment.id, newName)
          successCount++
        } catch (error) {
          console.error(`❌ 重命名 fragment ${fragment.id} 的標籤失敗:`, error)
        }
      }
      
      if (successCount > 0) {
        // 更新全域標籤
        try {
          const globalTags = await this.loadGlobalTags()
          const updatedTags = globalTags.map(t => t === oldName ? newName : t)
          await this.saveGlobalTags(updatedTags)
        } catch (e) {
          console.error('❌ 更新全域標籤失敗', e)
        }
      }
      
      return { 
        success: successCount > 0, 
        message: `已將標籤「${oldName}」重命名為「${newName}」，影響 ${successCount} 個碎片`, 
        affectedFragments: successCount 
      }

    } catch (error) {
      console.error('❌ 重命名標籤時發生錯誤:', error)
      return { success: false, message: '重命名標籤失敗' }
    }
  }
  
  /**
   * 刪除標籤（從所有碎片中移除）- 修正版本
   */
  static async deleteTag(tag: string): Promise<TagOperationResult> {
    try {
      const { fragments } = useFragmentsStore.getState()
      
      // 找到包含此標籤的所有 fragments
      const fragmentsWithTag = fragments.filter(f => f.tags.includes(tag))
      
      if (fragmentsWithTag.length === 0) {
        return {
          success: false,
          message: `標籤「${tag}」不存在於任何碎片中`
        }
      }
      
      let successCount = 0
      
      // 從每個 fragment 中移除標籤
      for (const fragment of fragmentsWithTag) {
        try {
          await useFragmentsStore.getState().removeTagFromFragment(fragment.id, tag)
          successCount++
        } catch (error) {
          console.error(`❌ 從 fragment ${fragment.id} 移除標籤失敗:`, error)
        }
      }
      
      if (successCount > 0) {
        // 從全域標籤中移除
        try {
          const globalTags = await this.loadGlobalTags()
          const updatedTags = globalTags.filter(t => t !== tag)
          await this.saveGlobalTags(updatedTags)
        } catch (e) {
          console.error('❌ 從全域標籤移除失敗', e)
        }
      }
      
      return { 
        success: successCount > 0, 
        message: `已從 ${successCount} 個碎片中刪除標籤「${tag}」`, 
        affectedFragments: successCount 
      }

    } catch (error) {
      console.error('❌ 刪除標籤時發生錯誤:', error)
      return { success: false, message: '刪除標籤失敗' }
    }
  }
}