// 📄 src/features/fragments/services/FragmentDeletionService.ts

import { Fragment } from '@/features/fragments/types/fragment'
import { getSupabaseClient } from '@/lib/supabase/client'

export interface DeletionResult {
  success: boolean
  message: string
  errors?: string[]
}

/**
 * 處理碎片刪除的完整流程
 * 包括資料庫記錄、關聯資料、本地快取的清理
 */
export class FragmentDeletionService {
  
  /**
   * 刪除碎片的主要方法
   * @param fragmentId 要刪除的碎片ID
   * @param fragment 碎片物件（可選，用於更詳細的處理）
   */
  static async deleteFragment(
    fragmentId: string, 
    fragment?: Fragment
  ): Promise<DeletionResult> {
    const supabase = getSupabaseClient()
    if (!supabase) {
      return {
        success: false,
        message: 'Supabase 客戶端未初始化'
      }
    }

    const errors: string[] = []
    let mainDeletionSuccess = false

    try {
      // 1. 刪除關聯的筆記
      console.log(`🗑️ 開始刪除碎片 ${fragmentId} 的關聯筆記...`)
      await this.deleteFragmentNotes(fragmentId, supabase, errors)

      // 2. 清理標籤關聯（如果需要）
      console.log(`🗑️ 清理碎片 ${fragmentId} 的標籤關聯...`)
      await this.cleanupTagAssociations(fragmentId, fragment, supabase, errors)

      // 3. 刪除位置記錄
      console.log(`🗑️ 刪除碎片 ${fragmentId} 的位置記錄...`)
      await this.deletePositionRecord(fragmentId, supabase, errors)

      // 4. 刪除主要的碎片記錄
      console.log(`🗑️ 刪除主要碎片記錄 ${fragmentId}...`)
      const { error: fragmentError } = await supabase
        .from('fragments')
        .delete()
        .eq('id', fragmentId)

      if (fragmentError) {
        errors.push(`刪除碎片記錄失敗: ${fragmentError.message}`)
      } else {
        mainDeletionSuccess = true
        console.log(`✅ 成功刪除碎片記錄 ${fragmentId}`)
      }

      // 5. 清理本地儲存
      this.cleanupLocalStorage(fragmentId)

      // 6. 返回結果
      if (mainDeletionSuccess && errors.length === 0) {
        return {
          success: true,
          message: `成功刪除碎片 ${fragmentId}`
        }
      } else if (mainDeletionSuccess) {
        return {
          success: true,
          message: `碎片已刪除，但有部分清理操作失敗`,
          errors
        }
      } else {
        return {
          success: false,
          message: `刪除碎片失敗`,
          errors
        }
      }

    } catch (error) {
      console.error('刪除碎片時發生錯誤:', error)
      return {
        success: false,
        message: `刪除過程中發生未預期的錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`
      }
    }
  }

  /**
   * 刪除碎片的關聯筆記
   */
  private static async deleteFragmentNotes(
    fragmentId: string, 
    supabase: any, 
    errors: string[]
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('fragment_id', fragmentId)

      if (error) {
        errors.push(`刪除筆記失敗: ${error.message}`)
        console.warn(`⚠️ 刪除筆記失敗:`, error)
      } else {
        console.log(`✅ 成功刪除碎片 ${fragmentId} 的筆記`)
      }
    } catch (error) {
      const message = `刪除筆記時發生錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`
      errors.push(message)
      console.error(message, error)
    }
  }

  /**
   * 清理標籤關聯
   * 注意：不刪除標籤本身，只是清理關聯
   */
  private static async cleanupTagAssociations(
    fragmentId: string, 
    fragment: Fragment | undefined,
    supabase: any, 
    errors: string[]
  ): Promise<void> {
    try {
      // 如果有標籤關聯表，在此處理
      // 目前標籤是直接存在 fragments 表的 tags 欄位中，所以不需要額外處理
      
      if (fragment && fragment.tags && fragment.tags.length > 0) {
        console.log(`📝 碎片 ${fragmentId} 包含標籤: ${fragment.tags.join(', ')}`)
        // 這裡可以添加標籤使用計數的更新邏輯
        // 例如：減少這些標籤的使用次數
      }
      
    } catch (error) {
      const message = `清理標籤關聯時發生錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`
      errors.push(message)
      console.error(message, error)
    }
  }

  /**
   * 刪除位置記錄
   */
  private static async deletePositionRecord(
    fragmentId: string, 
    supabase: any, 
    errors: string[]
  ): Promise<void> {
    try {
      // 如果有獨立的位置表
      const { error } = await supabase
        .from('fragment_positions')
        .delete()
        .eq('fragment_id', fragmentId)

      if (error && error.code !== 'PGRST116') { // PGRST116 表示記錄不存在，這是正常的
        errors.push(`刪除位置記錄失敗: ${error.message}`)
        console.warn(`⚠️ 刪除位置記錄失敗:`, error)
      } else {
        console.log(`✅ 成功刪除碎片 ${fragmentId} 的位置記錄`)
      }
    } catch (error) {
      const message = `刪除位置記錄時發生錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`
      errors.push(message)
      console.error(message, error)
    }
  }

  /**
   * 清理本地儲存
   */
  private static cleanupLocalStorage(fragmentId: string): void {
    try {
      // 清理位置快取
      const STORAGE_KEY_POSITIONS = 'fragment_positions'
      const savedPositions = localStorage.getItem(STORAGE_KEY_POSITIONS)
      
      if (savedPositions) {
        const positions = JSON.parse(savedPositions)
        if (positions[fragmentId]) {
          delete positions[fragmentId]
          localStorage.setItem(STORAGE_KEY_POSITIONS, JSON.stringify(positions))
          console.log(`✅ 從本地儲存移除碎片 ${fragmentId} 的位置記錄`)
        }
      }

      // 清理其他可能的本地快取
      // 例如：草稿、暫存資料等
      
    } catch (error) {
      console.warn(`⚠️ 清理本地儲存時發生錯誤:`, error)
      // 本地儲存清理失敗不影響主要刪除流程
    }
  }

  /**
   * 批量刪除碎片
   */
  static async deleteMultipleFragments(
    fragmentIds: string[], 
    fragments?: Fragment[]
  ): Promise<DeletionResult> {
    const results: DeletionResult[] = []
    
    for (const fragmentId of fragmentIds) {
      const fragment = fragments?.find(f => f.id === fragmentId)
      const result = await this.deleteFragment(fragmentId, fragment)
      results.push(result)
    }

    const successCount = results.filter(r => r.success).length
    const totalCount = results.length

    if (successCount === totalCount) {
      return {
        success: true,
        message: `成功刪除 ${successCount} 個碎片`
      }
    } else {
      const allErrors = results.flatMap(r => r.errors || [])
      return {
        success: false,
        message: `刪除了 ${successCount}/${totalCount} 個碎片`,
        errors: allErrors
      }
    }
  }
}

export default FragmentDeletionService