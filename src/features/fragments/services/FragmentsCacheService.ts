// 📄 FragmentsCacheService.ts - 簡化版緩存服務
// 放在: src/features/fragments/services/FragmentsCacheService.ts

import { Fragment } from '@/features/fragments/types/fragment'

interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
}

/**
 * 簡化版碎片緩存服務
 * 專注於核心功能：TTL + 本地存儲
 */
export class FragmentsCacheService {
  private static readonly DEFAULT_TTL = 5 * 60 * 1000 // 5分鐘
  private static readonly CACHE_PREFIX = 'fragments_cache_'
  
  private static readonly KEYS = {
    FRAGMENTS_LIST: 'fragments_list',
    USER_ID: 'user_id'
  }

  // 🚀 獲取碎片列表緩存
  static getFragments(userId: string): Fragment[] | null {
    try {
      const key = this.getCacheKey(this.KEYS.FRAGMENTS_LIST, userId)
      const cached = this.getFromStorage<Fragment[]>(key)
      
      if (cached && this.isValid(cached)) {
        console.log(`🎯 緩存命中！載入 ${cached.data.length} 個碎片`)
        return cached.data
      }
      
      console.log('❌ 緩存未命中或已過期')
      return null
    } catch (error) {
      console.warn('緩存讀取失敗:', error)
      return null
    }
  }

  // 🚀 設置碎片列表緩存
  static setFragments(userId: string, fragments: Fragment[], ttl = this.DEFAULT_TTL): void {
    try {
      const key = this.getCacheKey(this.KEYS.FRAGMENTS_LIST, userId)
      const item: CacheItem<Fragment[]> = {
        data: fragments,
        timestamp: Date.now(),
        ttl
      }
      
      this.saveToStorage(key, item)
      console.log(`✅ 緩存 ${fragments.length} 個碎片，TTL: ${Math.round(ttl/1000/60)}分鐘`)
    } catch (error) {
      console.warn('緩存保存失敗:', error)
    }
  }

  // 🚀 清除用戶緩存
  static clearUserCache(userId: string): void {
    try {
      const key = this.getCacheKey(this.KEYS.FRAGMENTS_LIST, userId)
      localStorage.removeItem(key)
      console.log('🗑️ 用戶緩存已清除')
    } catch (error) {
      console.warn('清除緩存失敗:', error)
    }
  }

  // 🚀 檢查緩存狀態
  static getCacheStats(userId: string): {
    hasCache: boolean
    itemCount: number
    cacheAge: number
    isExpired: boolean
  } {
    try {
      const key = this.getCacheKey(this.KEYS.FRAGMENTS_LIST, userId)
      const cached = this.getFromStorage<Fragment[]>(key)
      
      if (!cached) {
        return { hasCache: false, itemCount: 0, cacheAge: 0, isExpired: true }
      }
      
      const age = Date.now() - cached.timestamp
      const isExpired = !this.isValid(cached)
      
      return {
        hasCache: true,
        itemCount: cached.data.length,
        cacheAge: Math.round(age / 1000 / 60), // 分鐘
        isExpired
      }
    } catch (error) {
      return { hasCache: false, itemCount: 0, cacheAge: 0, isExpired: true }
    }
  }

  // 🚀 公開清理方法
  static cleanup(): void {
    try {
      const keysToRemove: string[] = []
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(this.CACHE_PREFIX)) {
          const item = this.getFromStorage(key)
          if (!item || !this.isValid(item)) {
            keysToRemove.push(key)
          }
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key))
      console.log(`🧹 清理了 ${keysToRemove.length} 個過期緩存項`)
    } catch (error) {
      console.warn('緩存清理失敗:', error)
    }
  }

  // === 私有工具方法 ===
  
  private static getCacheKey(type: string, userId: string): string {
    return `${this.CACHE_PREFIX}${type}_${userId}`
  }

  private static isValid(item: CacheItem<any>): boolean {
    return Date.now() - item.timestamp < item.ttl
  }

  private static getFromStorage<T>(key: string): CacheItem<T> | null {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : null
    } catch (error) {
      localStorage.removeItem(key) // 清除損壞的緩存
      return null
    }
  }

  private static saveToStorage<T>(key: string, item: CacheItem<T>): void {
    try {
      localStorage.setItem(key, JSON.stringify(item))
    } catch (error) {
      // 存儲空間不足時，清理舊緩存
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        this.cleanup()
        // 再次嘗試保存
        try {
          localStorage.setItem(key, JSON.stringify(item))
        } catch (retryError) {
          console.warn('緩存保存失敗，存儲空間不足')
        }
      }
    }
  }
}

// 🚀 自動清理定時器（每小時執行一次）
if (typeof window !== 'undefined') {
  setInterval(() => {
    FragmentsCacheService.cleanup()
  }, 60 * 60 * 1000)
}