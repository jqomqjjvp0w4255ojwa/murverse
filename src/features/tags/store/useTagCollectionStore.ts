// src/features/tags/store/useTagCollectionStore.ts'use client'
/**
 * 收藏的標籤列表
 * 
 * 單用戶模式：存儲在本地 localStorage
 * 多用戶模式：TODO - 從用戶私有存儲加載，與用戶 ID 關聯
 */
//collectedTags: [],

/**
 * 添加標籤到收藏
 * 
 * 單用戶模式：直接添加到本地存儲
 * 多用戶模式：TODO - 添加到用戶私有存儲並同步到服務器
 */
//addTag: (tag: string) => {
  // 現有實現...
//},

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface TagCollectionState {
  // 收藏的標籤
  collectedTags: string[]
  
  // 檢查標籤是否已收藏
  isCollected: (tag: string) => boolean
  
  // 添加標籤到收藏
  addTag: (tag: string) => void
  
  // 從收藏中移除標籤
  removeTag: (tag: string) => void
  
  // 批量添加標籤
  addTags: (tags: string[]) => void
  
  // 批量移除標籤
  removeTags: (tags: string[]) => void
  
  // 清空所有收藏
  clearTags: () => void
}

// 改進後的 useTagCollectionStore 實現
export const useTagCollectionStore = create<TagCollectionState>()(
  persist(
    (set, get) => ({
      // 收藏的標籤列表
      collectedTags: [],
      
      // 檢查標籤是否已收藏 - 修正比較邏輯，忽略大小寫
      isCollected: (tag: string) => {
        const { collectedTags } = get()
        // 先嘗試精確匹配
        if (collectedTags.includes(tag)) {
          return true
        }
        
        // 然後嘗試忽略大小寫的匹配
        return collectedTags.some(t => t.toLowerCase() === tag.toLowerCase())
      },
      
      // 添加標籤到收藏
      addTag: (tag: string) => {
        if (!tag) return
        
        const tagToAdd = tag.trim()
        if (!tagToAdd) return
        
        const { isCollected, collectedTags } = get()
        
        // 檢查是否已收藏 - 使用 isCollected 方法確保一致性
        if (isCollected(tagToAdd)) {
          return // 已收藏，不重複添加
        }
        
        // 添加到收藏列表
        set({ collectedTags: [...collectedTags, tagToAdd] })
        
        // 存入 localStorage 作為備份
        try {
          localStorage.setItem('mur_tag_collection', JSON.stringify([...collectedTags, tagToAdd]))
        } catch (e) {
          console.error('保存收藏標籤失敗', e)
        }
      },
      
      // 從收藏中移除標籤
      removeTag: (tag: string) => {
        if (!tag) return
        
        const tagToRemove = tag.trim()
        if (!tagToRemove) return
        
        const { collectedTags } = get()
        
        // 嘗試精確匹配和忽略大小寫匹配
        const exactIndex = collectedTags.indexOf(tagToRemove)
        if (exactIndex !== -1) {
          // 精確匹配成功
          const newTags = [...collectedTags]
          newTags.splice(exactIndex, 1)
          set({ collectedTags: newTags })
          
          // 更新 localStorage
          try {
            localStorage.setItem('mur_tag_collection', JSON.stringify(newTags))
          } catch (e) {
            console.error('保存收藏標籤失敗', e)
          }
          return
        }
        
        // 嘗試忽略大小寫匹配
        const lowerCaseIndex = collectedTags.findIndex(t => t.toLowerCase() === tagToRemove.toLowerCase())
        if (lowerCaseIndex !== -1) {
          // 忽略大小寫匹配成功
          const newTags = [...collectedTags]
          newTags.splice(lowerCaseIndex, 1)
          set({ collectedTags: newTags })
          
          // 更新 localStorage
          try {
            localStorage.setItem('mur_tag_collection', JSON.stringify(newTags))
          } catch (e) {
            console.error('保存收藏標籤失敗', e)
          }
        }
      },
      
      // 批量添加標籤
      addTags: (tags: string[]) => {
        if (!tags.length) return
        
        const { collectedTags, isCollected } = get()
        const newTags = [...collectedTags]
        let hasChanges = false
        
        // 過濾已收藏的標籤
        tags.forEach(tag => {
          const tagToAdd = tag.trim()
          if (tagToAdd && !isCollected(tagToAdd)) {
            newTags.push(tagToAdd)
            hasChanges = true
          }
        })
        
        if (hasChanges) {
          set({ collectedTags: newTags })
          
          // 更新 localStorage
          try {
            localStorage.setItem('mur_tag_collection', JSON.stringify(newTags))
          } catch (e) {
            console.error('保存收藏標籤失敗', e)
          }
        }
      },
      
      // 批量移除標籤
      removeTags: (tags: string[]) => {
        if (!tags.length) return
        
        const { collectedTags } = get()
        // 將要移除的標籤轉為小寫集合，便於比較
        const tagsToRemoveSet = new Set(tags.map(t => t.toLowerCase()))
        
        // 過濾掉要移除的標籤
        const newTags = collectedTags.filter(tag => !tagsToRemoveSet.has(tag.toLowerCase()))
        
        // 檢查是否有變更
        if (newTags.length !== collectedTags.length) {
          set({ collectedTags: newTags })
          
          // 更新 localStorage
          try {
            localStorage.setItem('mur_tag_collection', JSON.stringify(newTags))
          } catch (e) {
            console.error('保存收藏標籤失敗', e)
          }
        }
      },
      
      // 清空所有收藏
      clearTags: () => {
        set({ collectedTags: [] })
        
        // 更新 localStorage
        try {
          localStorage.setItem('mur_tag_collection', '[]')
        } catch (e) {
          console.error('清空收藏標籤失敗', e)
        }
      }
    }),
    {
      name: 'tag-collection-storage'
    }
  )
)