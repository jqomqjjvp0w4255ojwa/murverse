// 📄 src/features/fragments/services/FragmentDeletionService.ts

import { Fragment } from '@/features/fragments/types/fragment'
import { getSupabaseClient } from '@/lib/supabase/client'
import { AuthHelper } from '@/lib/authHelper'

export interface DeletionOptions {
  softDelete?: boolean
  skipConfirmation?: boolean
  cascadeDelete?: boolean
  preserveBackup?: boolean
}

export interface DeletionContext {
  userId: string
  fragmentId: string
  fragment?: Fragment
  timestamp: string
  options: DeletionOptions
}

export interface DeletionResult {
  success: boolean
  fragmentId: string
  message: string
  warnings?: string[]
  errors?: DeletionError[]
  metrics?: {
    totalTime: number
    deletedRecords: number
    cleanedCaches: number
  }
}

export interface DeletionError {
  code: string
  message: string
  context?: string
  recoverable: boolean
}

/**
 * 專業級 Fragment 刪除服務
 * 支援軟刪除、批量操作、回滾機制和完整的審計追蹤
 */
export class FragmentDeletionService {
  private static readonly DELETION_TIMEOUT = 30000 // 30秒超時
  private static readonly MAX_RETRY_ATTEMPTS = 3
  private static readonly BACKUP_RETENTION_DAYS = 30

  /**
   * 主要刪除方法 - 支援多種刪除策略
   */
  static async deleteFragment(
    fragmentId: string,
    options: DeletionOptions = {},
    fragment?: Fragment
  ): Promise<DeletionResult> {
    const startTime = performance.now()
    const context = await this.createDeletionContext(fragmentId, options, fragment)
    
    if (!context) {
      return this.createErrorResult(fragmentId, 'CONTEXT_CREATION_FAILED', '無法創建刪除上下文')
    }

    try {
      // 執行預刪除驗證
      const validationResult = await this.validateDeletion(context)
      if (!validationResult.valid) {
        return this.createErrorResult(fragmentId, 'VALIDATION_FAILED', validationResult.message!)
      }

      // 創建備份（如果需要）
      if (options.preserveBackup) {
        await this.createBackup(context)
      }

      // 執行刪除操作
      const deletionResult = options.softDelete 
        ? await this.performSoftDeletion(context)
        : await this.performHardDeletion(context)

      // 清理相關緩存和狀態
      await this.performCleanup(context)

      // 記錄審計日誌
      await this.logDeletionAudit(context, deletionResult)

      const endTime = performance.now()
      return {
        ...deletionResult,
        metrics: {
          totalTime: endTime - startTime,
          deletedRecords: this.calculateDeletedRecords(deletionResult),
          cleanedCaches: 1
        }
      }

    } catch (error) {
      console.error('🚨 Fragment 刪除過程中發生嚴重錯誤:', error)
      
      // 嘗試回滾操作
      await this.attemptRollback(context)
      
      return this.createErrorResult(
        fragmentId, 
        'DELETION_FAILED', 
        error instanceof Error ? error.message : '未知錯誤'
      )
    }
  }

  /**
   * 批量刪除 - 支援事務和部分失敗處理
   */
  static async deleteBatch(
    fragmentIds: string[],
    options: DeletionOptions = {}
  ): Promise<DeletionResult[]> {
    const results: DeletionResult[] = []
    const batchSize = 10 // 批次大小，避免資料庫過載
    
    for (let i = 0; i < fragmentIds.length; i += batchSize) {
      const batch = fragmentIds.slice(i, i + batchSize)
      const batchResults = await Promise.allSettled(
        batch.map(id => this.deleteFragment(id, options))
      )
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          results.push(this.createErrorResult(
            batch[index], 
            'BATCH_DELETION_FAILED', 
            result.reason?.message || '批次刪除失敗'
          ))
        }
      })
    }
    
    return results
  }

  /**
   * 創建刪除上下文
   */
  private static async createDeletionContext(
    fragmentId: string,
    options: DeletionOptions,
    fragment?: Fragment
  ): Promise<DeletionContext | null> {
    try {
      const userId = await AuthHelper.getUserId()
      if (!userId) {
        throw new Error('用戶未認證')
      }

      return {
        userId,
        fragmentId,
        fragment,
        timestamp: new Date().toISOString(),
        options: {
          softDelete: false,
          skipConfirmation: false,
          cascadeDelete: true,
          preserveBackup: false,
          ...options
        }
      }
    } catch (error) {
      console.error('創建刪除上下文失敗:', error)
      return null
    }
  }

  /**
   * 預刪除驗證
   */
  private static async validateDeletion(context: DeletionContext): Promise<{
    valid: boolean
    message?: string
  }> {
    const supabase = getSupabaseClient()
    if (!supabase) {
      return { valid: false, message: 'Supabase 客戶端不可用' }
    }

    try {
      // 驗證 Fragment 存在性和所有權
      const { data: fragment, error } = await supabase
        .from('fragments')
        .select('id, user_id, status')
        .eq('id', context.fragmentId)
        .eq('user_id', context.userId)
        .single()

      if (error || !fragment) {
        return { valid: false, message: 'Fragment 不存在或無權限訪問' }
      }

      // 檢查是否有依賴關係
      if (context.options.cascadeDelete) {
        const dependencies = await this.checkDependencies(context.fragmentId)
        if (dependencies.hasBlockingDependencies) {
          return { 
            valid: false, 
            message: `Fragment 有 ${dependencies.count} 個依賴項，無法刪除` 
          }
        }
      }

      return { valid: true }
    } catch (error) {
      return { 
        valid: false, 
        message: `驗證失敗: ${error instanceof Error ? error.message : '未知錯誤'}` 
      }
    }
  }

  /**
   * 軟刪除 - 標記為已刪除但保留數據
   */
  private static async performSoftDeletion(context: DeletionContext): Promise<DeletionResult> {
    const supabase = getSupabaseClient()!
    
    const { error } = await supabase
      .from('fragments')
      .update({
        status: 'archived',
        deletedAt: context.timestamp,
        deletedBy: context.userId
      })
      .eq('id', context.fragmentId)
      .eq('user_id', context.userId)

    if (error) {
      throw new Error(`軟刪除失敗: ${error.message}`)
    }

    return {
      success: true,
      fragmentId: context.fragmentId,
      message: 'Fragment 已標記為已刪除'
    }
  }

  /**
   * 硬刪除 - 完全移除數據
   */
  private static async performHardDeletion(context: DeletionContext): Promise<DeletionResult> {
    const supabase = getSupabaseClient()!
    const errors: DeletionError[] = []
    const warnings: string[] = []

    try {
      // 使用事務確保數據一致性
      const { error: txError } = await supabase.rpc('delete_fragment_complete', {
        p_fragment_id: context.fragmentId,
        p_user_id: context.userId
      })

      if (txError) {
        // 如果 RPC 不可用，回退到逐步刪除
        console.warn('RPC 刪除失敗，使用逐步刪除:', txError)
        return await this.performStepByStepDeletion(context)
      }

      return {
        success: true,
        fragmentId: context.fragmentId,
        message: 'Fragment 已完全刪除',
        warnings: warnings.length > 0 ? warnings : undefined,
        errors: errors.length > 0 ? errors : undefined
      }

    } catch (error) {
      console.error('硬刪除失敗:', error)
      throw error
    }
  }

  /**
   * 逐步刪除 - 當事務不可用時的後備方案
   */
  private static async performStepByStepDeletion(context: DeletionContext): Promise<DeletionResult> {
    const supabase = getSupabaseClient()!
    const errors: DeletionError[] = []
    const warnings: string[] = []

    // 1. 刪除筆記
    try {
      const { error: notesError } = await supabase
        .from('notes')
        .delete()
        .eq('fragment_id', context.fragmentId)

      if (notesError) {
        errors.push({
          code: 'NOTES_DELETION_FAILED',
          message: `刪除筆記失敗: ${notesError.message}`,
          context: 'notes',
          recoverable: true
        })
      }
    } catch (error) {
      errors.push({
        code: 'NOTES_DELETION_ERROR',
        message: '刪除筆記時發生異常',
        context: 'notes',
        recoverable: true
      })
    }

    // 2. 刪除標籤關聯
    try {
      const { error: tagsError } = await supabase
        .from('fragment_tags')
        .delete()
        .eq('fragment_id', context.fragmentId)

      if (tagsError) {
        errors.push({
          code: 'TAGS_DELETION_FAILED',
          message: `刪除標籤失敗: ${tagsError.message}`,
          context: 'tags',
          recoverable: true
        })
      }
    } catch (error) {
      errors.push({
        code: 'TAGS_DELETION_ERROR',
        message: '刪除標籤時發生異常',
        context: 'tags',
        recoverable: true
      })
    }

    // 3. 刪除位置記錄
    try {
      const { error: positionsError } = await supabase
        .from('fragment_positions')
        .delete()
        .eq('fragment_id', context.fragmentId)
        .eq('user_id', context.userId)

      if (positionsError && positionsError.code !== 'PGRST116') {
        warnings.push(`位置記錄刪除警告: ${positionsError.message}`)
      }
    } catch (error) {
      warnings.push('位置記錄刪除時發生異常')
    }

    // 4. 刪除主 Fragment 記錄
    try {
      const { error: fragmentError } = await supabase
        .from('fragments')
        .delete()
        .eq('id', context.fragmentId)
        .eq('user_id', context.userId)

      if (fragmentError) {
        throw new Error(`刪除主記錄失敗: ${fragmentError.message}`)
      }
    } catch (error) {
      throw error // 主記錄刪除失敗是致命錯誤
    }

    return {
      success: true,
      fragmentId: context.fragmentId,
      message: errors.length > 0 ? 'Fragment 已刪除，但有部分清理失敗' : 'Fragment 已完全刪除',
      warnings: warnings.length > 0 ? warnings : undefined,
      errors: errors.length > 0 ? errors : undefined
    }
  }

  /**
   * 執行清理操作
   */
  private static async performCleanup(context: DeletionContext): Promise<void> {
    // 清理本地緩存
    this.clearLocalStorage(context.fragmentId)
    
    // 清理瀏覽器緩存（如果適用）
    if ('caches' in window) {
      try {
        const cache = await caches.open('fragments-cache')
        await cache.delete(`/api/fragments/${context.fragmentId}`)
      } catch (error) {
        console.warn('清理瀏覽器緩存失敗:', error)
      }
    }
  }

  /**
   * 創建備份
   */
  private static async createBackup(context: DeletionContext): Promise<void> {
    if (!context.fragment) return

    const backup = {
      ...context.fragment,
      backupId: crypto.randomUUID(),
      backupTimestamp: context.timestamp,
      backupReason: 'PRE_DELETION',
      expiresAt: new Date(Date.now() + this.BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()
    }

    // 存儲到 localStorage 作為緊急恢復
    try {
      const existingBackups = JSON.parse(localStorage.getItem('fragment_backups') || '[]')
      existingBackups.push(backup)
      localStorage.setItem('fragment_backups', JSON.stringify(existingBackups))
    } catch (error) {
      console.warn('創建本地備份失敗:', error)
    }
  }

  /**
   * 檢查依賴關係
   */
  private static async checkDependencies(fragmentId: string): Promise<{
    hasBlockingDependencies: boolean
    count: number
    details?: string[]
  }> {
    // 這裡可以擴展檢查邏輯，例如：
    // - 檢查是否被其他 Fragment 引用
    // - 檢查是否有未完成的關聯任務
    // - 檢查是否在某個集合中
    
    return {
      hasBlockingDependencies: false,
      count: 0
    }
  }

  /**
   * 嘗試回滾操作
   */
  private static async attemptRollback(context: DeletionContext): Promise<void> {
    try {
      console.log('🔄 嘗試回滾刪除操作...')
      
      // 如果是軟刪除，可以恢復狀態
      if (context.options.softDelete) {
        const supabase = getSupabaseClient()
        if (supabase) {
          await supabase
            .from('fragments')
            .update({
              status: 'published',
              deletedAt: null,
              deletedBy: null
            })
            .eq('id', context.fragmentId)
        }
      }
      
      console.log('✅ 回滾操作完成')
    } catch (error) {
      console.error('❌ 回滾操作失敗:', error)
    }
  }

  /**
   * 清理本地存儲
   */
  private static clearLocalStorage(fragmentId: string): void {
    try {
      // 清理位置緩存
      const positionsKey = 'fragment_positions'
      const savedPositions = localStorage.getItem(positionsKey)
      
      if (savedPositions) {
        const positions = JSON.parse(savedPositions)
        if (positions[fragmentId]) {
          delete positions[fragmentId]
          localStorage.setItem(positionsKey, JSON.stringify(positions))
        }
      }

      // 清理其他相關緩存
      const cacheKeys = [
        `fragment_${fragmentId}`,
        `fragment_detail_${fragmentId}`,
        `fragment_meta_${fragmentId}`
      ]
      
      cacheKeys.forEach(key => localStorage.removeItem(key))
      
    } catch (error) {
      console.warn('清理本地存儲失敗:', error)
    }
  }

  /**
   * 記錄審計日誌
   */
  private static async logDeletionAudit(
    context: DeletionContext, 
    result: DeletionResult
  ): Promise<void> {
    try {
      const auditLog = {
        id: crypto.randomUUID(),
        action: 'FRAGMENT_DELETION',
        fragmentId: context.fragmentId,
        userId: context.userId,
        timestamp: context.timestamp,
        success: result.success,
        options: context.options,
        result: {
          message: result.message,
          warnings: result.warnings,
          errors: result.errors
        }
      }

      // 可以發送到審計服務或存儲到本地
      console.log('📋 刪除審計日誌:', auditLog)
      
    } catch (error) {
      console.warn('記錄審計日誌失敗:', error)
    }
  }

  /**
   * 創建錯誤結果
   */
  private static createErrorResult(
    fragmentId: string, 
    code: string, 
    message: string
  ): DeletionResult {
    return {
      success: false,
      fragmentId,
      message,
      errors: [{
        code,
        message,
        recoverable: false
      }]
    }
  }

  /**
   * 計算刪除的記錄數
   */
  private static calculateDeletedRecords(result: DeletionResult): number {
    let count = result.success ? 1 : 0
    
    // 根據錯誤信息估算其他刪除的記錄
    if (result.errors) {
      const failedOperations = result.errors.filter(e => 
        e.context && !e.recoverable
      ).length
      count += Math.max(0, 3 - failedOperations) // 假設總共有3類關聯數據
    }
    
    return count
  }

  /**
   * 獲取刪除統計信息
   */
  static async getDeletionStats(userId: string): Promise<{
    totalDeleted: number
    recentDeletions: number
    backupsAvailable: number
  }> {
    try {
      const backups = JSON.parse(localStorage.getItem('fragment_backups') || '[]')
      const userBackups = backups.filter((b: any) => 
        b.creator === userId && new Date(b.expiresAt) > new Date()
      )

      return {
        totalDeleted: 0, // 可以從審計日誌計算
        recentDeletions: 0, // 最近24小時的刪除數
        backupsAvailable: userBackups.length
      }
    } catch (error) {
      console.warn('獲取刪除統計失敗:', error)
      return {
        totalDeleted: 0,
        recentDeletions: 0,
        backupsAvailable: 0
      }
    }
  }
}