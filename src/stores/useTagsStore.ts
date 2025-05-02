import { create } from 'zustand'
import { createRef, RefObject } from 'react'
import { persist } from 'zustand/middleware'

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

  externalTagSelectorPosition: { x: number; y: number } | null;
  openTagSelector: (pos?: { x: number; y: number }) => void;
  resetExternalTagSelectorPosition: () => void;

  pulse: number;
  triggerPulse: () => void;
}

export const useTagsStore = create<TagsStoreState>()(
  persist(
    (set, get) => ({
      /* 標籤管理 */
      globalTags: [],
      recentlyUsedTags: [],
      
      initializeFromFragments: (fragments) => {
        const map = new Map<string, number>();
        fragments.forEach(f => f.tags.forEach((t: string) => map.set(t, (map.get(t) || 0) + 1)));
        
        try {
          const extra = JSON.parse(localStorage.getItem('mur_tags_global') || '[]') as string[];
          extra.forEach(t => map.set(t, map.get(t) || 0));
        } catch (e) {
          console.error('Error loading tags', e);
        }
        
        set({ globalTags: [...map.entries()].map(([name, count]) => ({ name, count })) });
        
        // 載入最近使用標籤
        try {
          const recentTags = JSON.parse(localStorage.getItem('mur_recent_tags') || '[]');
          set({ recentlyUsedTags: recentTags });
        } catch (e) {
          console.error('Error loading recent tags', e);
        }
      },
      
      addGlobalTag: (tagName) => {
        const trimmedTag = tagName.trim();
        if (!trimmedTag) return;
        
        set(state => {
          // 檢查是否已存在
          if (state.globalTags.some(t => t.name === trimmedTag)) {
            return state;
          }
          
          // 新增到 globalTags
          const newGlobalTags = [...state.globalTags, { name: trimmedTag, count: 0 }];
          
          // 儲存到 localStorage
          try {
            const stored = JSON.parse(localStorage.getItem('mur_tags_global') || '[]') as string[];
            if (!stored.includes(trimmedTag)) {
              localStorage.setItem('mur_tags_global', JSON.stringify([...stored, trimmedTag]));
            }
          } catch (e) {
            console.error('Error saving tags', e);
          }
          
          return { globalTags: newGlobalTags };
        });
      },
      
      removeGlobalTags: (tagNames) => {
        if (tagNames.length === 0) return;
        
        set(state => {
          const newGlobalTags = state.globalTags.filter(tag => !tagNames.includes(tag.name));
          
          // 從 localStorage 中移除
          try {
            const stored = JSON.parse(localStorage.getItem('mur_tags_global') || '[]') as string[];
            localStorage.setItem('mur_tags_global', JSON.stringify(
              stored.filter(t => !tagNames.includes(t))
            ));
          } catch (e) {
            console.error('Error removing tags', e);
          }
          
          return { globalTags: newGlobalTags };
        });
      },
      
      renameGlobalTag: (oldName, newName) => {
        newName = newName.trim();
        if (!newName || oldName === newName) return;
        
        set(state => {
          // 檢查新名稱是否已存在
          if (state.globalTags.some(tag => tag.name === newName && tag.name !== oldName)) {
            return state;
          }
          
          // 更新 globalTags
          const newGlobalTags = state.globalTags.map(tag => 
            tag.name === oldName ? { name: newName, count: tag.count } : tag
          );
          
          // 更新 localStorage
          try {
            const stored = JSON.parse(localStorage.getItem('mur_tags_global') || '[]') as string[];
            localStorage.setItem('mur_tags_global', JSON.stringify([
              ...stored.filter(t => t !== oldName),
              newName
            ]));
          } catch (e) {
            console.error('Error renaming tag', e);
          }
          
          return { globalTags: newGlobalTags };
        });
      },
      
      recordTagUsage: (tagName) => {
        set(state => {
          const filtered = state.recentlyUsedTags.filter(t => t !== tagName);
          const newRecentlyUsedTags = [tagName, ...filtered].slice(0, 50);
          
          // 保存到 localStorage
          try {
            localStorage.setItem('mur_recent_tags', JSON.stringify(newRecentlyUsedTags));
          } catch (e) {
            console.error('Error saving recent tags', e);
          }
          
          return { recentlyUsedTags: newRecentlyUsedTags };
        });
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

      /* 標籤視窗位置 - 保留原有邏輯 */
      externalTagSelectorPosition: null,
      openTagSelector: pos => {
        if (pos) set({ externalTagSelectorPosition: pos, mode: 'add' });
        else set({ mode: 'add' });
        get().triggerPulse();
      },
      resetExternalTagSelectorPosition: () => set({ externalTagSelectorPosition: null }),

      /* pulse - 保留原有邏輯 */
      pulse: 0,
      triggerPulse: () => set(s => ({ pulse: s.pulse + 1 })),
    }),
    {
      name: 'tags-storage',
      partialize: (state) => ({
        // 只持久化需要的部分
        globalTags: state.globalTags,
        recentlyUsedTags: state.recentlyUsedTags
      })
    }
  )
)