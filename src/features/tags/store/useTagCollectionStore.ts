'use client'

import { create } from 'zustand'
import { loadCollectedTags, saveCollectedTags } from '@/features/tags/services/TagCollectionService'

interface TagCollectionState {
  collectedTags: string[]

  // 初始化：從 Supabase 載入
  load: () => Promise<void>

  isCollected: (tag: string) => boolean
  addTag: (tag: string) => void
  removeTag: (tag: string) => void
  addTags: (tags: string[]) => void
  removeTags: (tags: string[]) => void
  clearTags: () => void
}

export const useTagCollectionStore = create<TagCollectionState>()((set, get) => ({
  collectedTags: [],

  load: async () => {
    const tags = await loadCollectedTags()
    set({ collectedTags: tags })
  },

  isCollected: (tag: string) => {
    const { collectedTags } = get()
    return collectedTags.some(t => t.toLowerCase() === tag.toLowerCase())
  },

  addTag: (tag: string) => {
    const { collectedTags, isCollected } = get()
    const tagToAdd = tag.trim()
    if (!tagToAdd || isCollected(tagToAdd)) return

    const newTags = [...collectedTags, tagToAdd]
    set({ collectedTags: newTags })
    saveCollectedTags(newTags)
  },

  removeTag: (tag: string) => {
    const tagToRemove = tag.trim()
    if (!tagToRemove) return

    const { collectedTags } = get()
    const newTags = collectedTags.filter(t => t.toLowerCase() !== tagToRemove.toLowerCase())
    if (newTags.length !== collectedTags.length) {
      set({ collectedTags: newTags })
      saveCollectedTags(newTags)
    }
  },

  addTags: (tags: string[]) => {
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
      set({ collectedTags: newTags })
      saveCollectedTags(newTags)
    }
  },

  removeTags: (tags: string[]) => {
    const { collectedTags } = get()
    const tagsToRemove = new Set(tags.map(t => t.toLowerCase()))
    const newTags = collectedTags.filter(t => !tagsToRemove.has(t.toLowerCase()))

    if (newTags.length !== collectedTags.length) {
      set({ collectedTags: newTags })
      saveCollectedTags(newTags)
    }
  },

  clearTags: () => {
    set({ collectedTags: [] })
    saveCollectedTags([])
  }
}))
