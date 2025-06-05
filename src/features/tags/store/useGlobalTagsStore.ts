'use client'
import { create } from 'zustand'
import { createRef, RefObject } from 'react'
import { persist } from 'zustand/middleware'
import {
  loadGlobalTags,
  saveGlobalTag,
  deleteGlobalTags,
  renameGlobalTag,
  loadRecentTags,
  saveRecentTags
} from '@/features/tags/services/SupabaseTagsService'

type TagMode = 'search' | 'add'

interface TagInfo {
  name: string;
  count: number;
}

interface TagsStoreState {
  /* 標籤管理 */
  globalTags: TagInfo[];
  recentlyUsedTags: string[];
  initializeFromFragments: (fragments: any[]) => Promise<void>;
  addGlobalTag: (tagName: string) => Promise<void>;
  removeGlobalTags: (tagNames: string[]) => Promise<void>;
  renameGlobalTag: (oldName: string, newName: string) => Promise<void>;
  recordTagUsage: (tagName: string) => Promise<void>;

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

  error: string | null;
  setError: (error: string | null) => void;
}

export const useGlobalTagsStore = create<TagsStoreState>()(
  persist(
    (set, get) => ({
      /* 標籤管理 */
      globalTags: [],
      recentlyUsedTags: [],
      error: null,
      
      setError: (error) => set({ error }),
      
      initializeFromFragments: async (fragments) => {
        try {
          set({ error: null })
          console.log('🔄 初始化標籤系統...')
          
          // 從 fragments 中計算標籤頻率
          const map = new Map<string, number>()
          fragments.forEach(f => f.tags.forEach((t: string) => map.set(t, (map.get(t) || 0) + 1)))

          try {
            // 從 Supabase 讀取全域標籤
            const remoteTags = await loadGlobalTags()
            console.log(`📥 從雲端載入 ${remoteTags.length} 個全域標籤`)
            
            // 合併本地和雲端標籤，使用較大的計數
            remoteTags.forEach(({ name, count }) => {
              map.set(name, Math.max(map.get(name) || 0, count))
            })

            // 讀取最近標籤
            const recentTags = await loadRecentTags()
            console.log(`📥 從雲端載入 ${recentTags.length} 個最近標籤`)
            set({ recentlyUsedTags: recentTags })
            
          } catch (supabaseError) {
            console.warn('⚠️ Supabase 標籤服務暫時不可用，使用本地數據:', supabaseError)
          }

          const globalTags = [...map.entries()].map(([name, count]) => ({ name, count }))
          set({ globalTags })

          console.log(`✅ 標籤系統初始化完成，共 ${globalTags.length} 個標籤`)
        } catch (error) {
          console.error('❌ 初始化標籤系統失敗:', error)
          set({ error: error instanceof Error ? error.message : '初始化標籤失敗' })
        }
      },
      
      addGlobalTag: async (tagName) => {
        try {
          const trimmedTag = tagName.trim()
          if (!trimmedTag) return

          const exists = get().globalTags.some(t => t.name === trimmedTag)
          if (exists) return

          // 保存到 Supabase
          const success = await saveGlobalTag(trimmedTag)
          if (!success) {
            throw new Error('保存標籤到雲端失敗')
          }

          set(state => ({
            globalTags: [...state.globalTags, { name: trimmedTag, count: 0 }],
            error: null
          }))

          console.log(`✅ 新增全域標籤: ${trimmedTag}`)
        } catch (error) {
          console.error('❌ 新增全域標籤失敗:', error)
          set({ error: error instanceof Error ? error.message : '新增標籤失敗' })
        }
      },
      
      removeGlobalTags: async (tagNames) => {
        try {
          if (tagNames.length === 0) return

          // 從 Supabase 刪除
          const success = await deleteGlobalTags(tagNames)
          if (!success) {
            throw new Error('從雲端刪除標籤失敗')
          }

          set(state => ({
            globalTags: state.globalTags.filter(tag => !tagNames.includes(tag.name)),
            error: null
          }))

          console.log(`✅ 刪除全域標籤: ${tagNames.join(', ')}`)
        } catch (error) {
          console.error('❌ 刪除全域標籤失敗:', error)
          set({ error: error instanceof Error ? error.message : '刪除標籤失敗' })
        }
      },
      
      renameGlobalTag: async (oldName, newName) => {
        try {
          newName = newName.trim()
          if (!newName || oldName === newName) return

          const exists = get().globalTags.some(tag => tag.name === newName)
          if (exists) {
            set({ error: `標籤「${newName}」已存在` })
            return
          }

          // 在 Supabase 中重命名
          const success = await renameGlobalTag(oldName, newName)
          if (!success) {
            throw new Error('雲端重命名標籤失敗')
          }

          set(state => ({
            globalTags: state.globalTags.map(tag =>
              tag.name === oldName ? { name: newName, count: tag.count } : tag
            ),
            recentlyUsedTags: state.recentlyUsedTags.map(tag => 
              tag === oldName ? newName : tag
            ),
            error: null
          }))

          console.log(`✅ 重命名全域標籤: ${oldName} → ${newName}`)
        } catch (error) {
          console.error('❌ 重命名全域標籤失敗:', error)
          set({ error: error instanceof Error ? error.message : '重命名標籤失敗' })
        }
      },
      
      recordTagUsage: async (tagName) => {
        try {
          const prev = get().recentlyUsedTags.filter(t => t !== tagName)
          const newList = [tagName, ...prev].slice(0, 50)

          // 保存到 Supabase
          const success = await saveRecentTags(newList)
          if (!success) {
            console.warn('⚠️ 保存最近標籤到雲端失敗，僅更新本地')
          }

          set({ recentlyUsedTags: newList, error: null })

          // 更新全域標籤的使用計數
          set(state => ({
            globalTags: state.globalTags.map(tag =>
              tag.name === tagName ? { ...tag, count: tag.count + 1 } : tag
            )
          }))

          console.log(`✅ 記錄標籤使用: ${tagName}`)
        } catch (error) {
          console.error('❌ 記錄標籤使用失敗:', error)
          // 記錄使用失敗不應該阻止用戶操作，所以不設置錯誤狀態
        }
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
        globalTags: state.globalTags,
        recentlyUsedTags: state.recentlyUsedTags,
        searchMode: state.searchMode
      })
    }
  )
)