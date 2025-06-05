'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { loadCollectedTags, saveCollectedTags } from '@/features/tags/services/TagCollectionService'

interface TagCollectionState {
  collectedTags: string[]
  error: string | null

  load: () => Promise<void>
  isCollected: (tag: string) => boolean
  addTag: (tag: string) => Promise<void>
  removeTag: (tag: string) => Promise<void>
  addTags: (tags: string[]) => Promise<void>
  removeTags: (tags: string[]) => Promise<void>
  clearTags: () => Promise<void>
  setError: (error: string | null) => void
}

export const useTagCollectionStore = create<TagCollectionState>()(
  persist(
    (set, get) => ({
      collectedTags: [],
      error: null,

      setError: (error) => set({ error }),

      load: async () => {
        try {
          set({ error: null })
          console.log('🔄 載入收藏標籤...')
          
          const tags = await loadCollectedTags()
          set({ collectedTags: tags })
          
          console.log(`✅ 收藏標籤載入完成，共 ${tags.length} 個`)
        } catch (error) {
          console.error('❌ 載入收藏標籤失敗:', error)
          set({ error: error instanceof Error ? error.message : '載入收藏標籤失敗' })
        }
      },

      isCollected: (tag: string) => {
        const { collectedTags } = get()
        return collectedTags.some(t => t.toLowerCase() === tag.toLowerCase())
      },

      addTag: async (tag: string) => {
        try {
          const { collectedTags, isCollected } = get()
          const tagToAdd = tag.trim()
          if (!tagToAdd || isCollected(tagToAdd)) return

          const newTags = [...collectedTags, tagToAdd]
          
          // 先保存到 Supabase
          const success = await saveCollectedTags(newTags)
          if (!success) {
            throw new Error('保存收藏標籤到雲端失敗')
          }
          
          set({ collectedTags: newTags, error: null })
          console.log(`✅ 新增收藏標籤: ${tagToAdd}`)
        } catch (error) {
          console.error('❌ 新增收藏標籤失敗:', error)
          set({ error: error instanceof Error ? error.message : '新增收藏標籤失敗' })
        }
      },

      removeTag: async (tag: string) => {
        try {
          const tagToRemove = tag.trim()
          if (!tagToRemove) return

          const { collectedTags } = get()
          const newTags = collectedTags.filter(t => t.toLowerCase() !== tagToRemove.toLowerCase())
          
          if (newTags.length !== collectedTags.length) {
            // 保存到 Supabase
            const success = await saveCollectedTags(newTags)
            if (!success) {
              throw new Error('從雲端移除收藏標籤失敗')
            }
            
            set({ collectedTags: newTags, error: null })
            console.log(`✅ 移除收藏標籤: ${tagToRemove}`)
          }
        } catch (error) {
          console.error('❌ 移除收藏標籤失敗:', error)
          set({ error: error instanceof Error ? error.message : '移除收藏標籤失敗' })
        }
      },

      addTags: async (tags: string[]) => {
        try {
          const { collectedTags, isCollected } = get()
          const newTags = [...collectedTags]

          let hasChanges = false
          tags.forEach(tag => {
            const tagToAdd = tag.trim()
            if (tagToAdd && !isCollected(tagToAdd)) {
              newTags.push(tagToAdd)
              hasChanges = true
            }
          })

          if (hasChanges) {
            // 保存到 Supabase
            const success = await saveCollectedTags(newTags)
            if (!success) {
              throw new Error('批量保存收藏標籤到雲端失敗')
            }
            
            set({ collectedTags: newTags, error: null })
            console.log(`✅ 批量新增收藏標籤: ${tags.join(', ')}`)
          }
        } catch (error) {
          console.error('❌ 批量新增收藏標籤失敗:', error)
          set({ error: error instanceof Error ? error.message : '批量新增收藏標籤失敗' })
        }
      },

      removeTags: async (tags: string[]) => {
        try {
          const { collectedTags } = get()
          const tagsToRemove = new Set(tags.map(t => t.toLowerCase()))
          const newTags = collectedTags.filter(t => !tagsToRemove.has(t.toLowerCase()))

          if (newTags.length !== collectedTags.length) {
            // 保存到 Supabase
            const success = await saveCollectedTags(newTags)
            if (!success) {
              throw new Error('批量移除收藏標籤從雲端失敗')
            }
            
            set({ collectedTags: newTags, error: null })
            console.log(`✅ 批量移除收藏標籤: ${tags.join(', ')}`)
          }
        } catch (error) {
          console.error('❌ 批量移除收藏標籤失敗:', error)
          set({ error: error instanceof Error ? error.message : '批量移除收藏標籤失敗' })
        }
      },

      clearTags: async () => {
        try {
          // 保存到 Supabase
          const success = await saveCollectedTags([])
          if (!success) {
            throw new Error('清空雲端收藏標籤失敗')
          }
          
          set({ collectedTags: [], error: null })
          console.log('✅ 清空收藏標籤')
        } catch (error) {
          console.error('❌ 清空收藏標籤失敗:', error)
          set({ error: error instanceof Error ? error.message : '清空收藏標籤失敗' })
        }
      }
    }),
    {
      name: 'tag-collection-storage',
      partialize: (state) => ({
        collectedTags: state.collectedTags
      })
    }
  )
)