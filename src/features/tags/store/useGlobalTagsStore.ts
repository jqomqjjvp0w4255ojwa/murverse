


//全局標籤管理（透過 Supabase）
//最近使用標籤
//UI 狀態（mode, searchMode, pulse 等）
//標籤選擇器控制
//pending tags 管理




'use client'
import { create } from 'zustand'
import { createRef, RefObject } from 'react'
import { persist } from 'zustand/middleware'
// import {
//   loadGlobalTags,
//   saveGlobalTag,
//   deleteGlobalTags,
//   renameGlobalTag,
//   loadRecentTags,
//   saveRecentTags
// } from '@/features/tags/services/SupabaseTagsService'
type TagMode = 'search' | 'add'

interface TagInfo {
  name: string;
  count: number;
}

interface TagsStoreState {
  /* 標籤管理 */
  // 全域標籤集合
  globalTags: TagInfo[];
  // 最近使用的標籤
  recentlyUsedTags: string[];
  // 初始化標籤數據
  initializeFromFragments: (fragments: any[]) => void;
  // 添加全域標籤
  addGlobalTag: (tagName: string) => void;
  // 移除全域標籤
  removeGlobalTags: (tagNames: string[]) => void;
  // 重命名全域標籤
  renameGlobalTag: (oldName: string, newName: string) => void;
  // 記錄標籤使用
  recordTagUsage: (tagName: string) => void;

  /* add 模式 */
  pendingTags: string[];
  selectedTags: string[];
  excludedTags: string[];
  setPendingTags: (tags: string[]) => void;
  addPendingTag: (tag: string) => void;
  removePendingTag: (tag: string) => void;
  clearPendingTags: () => void;

  /* 共用—讓別的元件抓得到標籤視窗位置 */
  tagsWindowRef: RefObject<HTMLDivElement | null>;

  /* 控制 */
  mode: TagMode;
  setMode: (m: TagMode) => void;

  searchMode: 'tag' | 'fragment';
  setSearchMode: (mode: 'tag' | 'fragment') => void;

  externalTagSelectorPosition: { x: number; y: number } | null;
  openTagSelector: (pos?: { x: number; y: number }) => void;
  resetExternalTagSelectorPosition: () => void;

  pulse: number;
  triggerPulse: () => void;

  isConnected: boolean;
  setConnected: (connected: boolean) => void;
}

export const useGlobalTagsStore = create<TagsStoreState>()(
  persist(
    (set, get) => ({
      /* 標籤管理 */
      globalTags: [],
      recentlyUsedTags: [],
      
      initializeFromFragments: async (fragments) => {
      const map = new Map<string, number>()
      fragments.forEach(f => f.tags.forEach((t: string) => map.set(t, (map.get(t) || 0) + 1)))

      // 從 Supabase 讀 globalTags
      // const remote = await loadGlobalTags()
      const remote: { name: string; count: number }[] = [] // 暫時使用空陣列
      remote.forEach(({ name, count }) => map.set(name, Math.max(map.get(name) || 0, count)))

      set({ globalTags: [...map.entries()].map(([name, count]) => ({ name, count })) })

      // 讀最近標籤
      // const recentTags = await loadRecentTags()
        const recentTags: string[] = [] // 暫時使用空陣列
      set({ recentlyUsedTags: recentTags })
      },
      
      addGlobalTag: async (tagName) => {
      const trimmedTag = tagName.trim()
      if (!trimmedTag) return

      const exists = get().globalTags.some(t => t.name === trimmedTag)
      if (exists) return

      // await saveGlobalTag(trimmedTag)
      console.log('Tag saved locally, API sync to be implemented')

      set(state => ({
        globalTags: [...state.globalTags, { name: trimmedTag, count: 0 }]
      }))
    },
      
      removeGlobalTags: async (tagNames) => {
      if (tagNames.length === 0) return

      // await renameGlobalTag(oldName, newName)
      console.log('Tag renamed locally, API sync to be implemented')

      set(state => ({
        globalTags: state.globalTags.filter(tag => !tagNames.includes(tag.name))
      }))
    },
      
      renameGlobalTag: async (oldName, newName) => {
      newName = newName.trim()
      if (!newName || oldName === newName) return

      const exists = get().globalTags.some(tag => tag.name === newName)
      if (exists) return

      // await renameGlobalTag(oldName, newName)
      console.log('Tag renamed locally, API sync to be implemented')

      set(state => ({
        globalTags: state.globalTags.map(tag =>
          tag.name === oldName ? { name: newName, count: tag.count } : tag
        )
      }))
    },
      
      recordTagUsage: async (tagName) => {
      const prev = get().recentlyUsedTags.filter(t => t !== tagName)
      const newList = [tagName, ...prev].slice(0, 50)

      // await saveRecentTags(newList)
      console.log('Tag usage recorded locally, API sync to be implemented')

      set({ recentlyUsedTags: newList })
    },


      /* add 狀態 - 保留原有邏輯 */
      pendingTags: [],
      selectedTags: [],
      excludedTags: [],

      setPendingTags: tags => set({ pendingTags: [...new Set(tags)] }),
      addPendingTag: tag => {
        // 同時記錄使用頻率
        get().recordTagUsage(tag);
        set(s => (s.pendingTags.includes(tag) ? {} : { pendingTags: [...s.pendingTags, tag] }));
      },
      removePendingTag: tag => set(s => ({ pendingTags: s.pendingTags.filter(t => t !== tag) })),
      clearPendingTags: () => set({ pendingTags: [] }),

      /* 共用 ref - 保留原有邏輯 */
      tagsWindowRef: createRef<HTMLDivElement | null>(),

      /* 模式控制 - 保留原有邏輯 */
      mode: 'search',
      setMode: mode => set({ mode }),

      searchMode: 'tag',
      setSearchMode: mode => set({ searchMode: mode }),

      /* 標籤視窗位置 - 保留原有邏輯 */
      externalTagSelectorPosition: null,
      openTagSelector: pos => {
        if (pos) set({ externalTagSelectorPosition: pos, mode: 'add', searchMode: 'tag' });
        else set({ mode: 'add', searchMode: 'tag' });
        get().triggerPulse();
      },
      resetExternalTagSelectorPosition: () => set({ externalTagSelectorPosition: null }),

      /* pulse - 保留原有邏輯 */
      pulse: 0,
      triggerPulse: () => set(s => ({ pulse: s.pulse + 1 })),

       isConnected: false,
    setConnected: (connected: boolean) => {
        set({ isConnected: connected });
        if (!connected) {
          set({ mode: 'search' });
        }
      },
    }),
    {
      name: 'tags-storage',
      partialize: (state) => ({
        // 只持久化需要的部分
        globalTags: state.globalTags,
        recentlyUsedTags: state.recentlyUsedTags,
        searchMode: state.searchMode
      })
    }
  )
)