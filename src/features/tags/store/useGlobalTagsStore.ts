// src/features/tags/store/useGlobalTagsStore.ts

'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface GlobalTag {
  id: string;       // 唯一ID
  name: string;     // 標籤名稱
  count: number;    // 使用次數
  createdBy: string; // 創建者ID
  createdAt: string; // 創建時間
  updatedAt: string; // 更新時間
}

interface GlobalTagsState {
  /**
   * 多用戶模式開關
   * 默認為 false，即單用戶模式
   */
  isMultiUserMode: boolean;
  
  /**
   * 真正的全域標籤
   * 在多用戶模式下，這些是所有用戶共享的標籤
   */
  globalTags: GlobalTag[];
  
  /**
   * 載入全域標籤
   * 單用戶模式：從 localStorage 讀取
   * 多用戶模式：從服務器 API 獲取
   */
  loadGlobalTags: () => Promise<void>;
  
  /**
   * 添加全域標籤
   * @param tag 標籤名稱
   */
  addGlobalTag: (tag: string) => Promise<void>;
  
  /**
   * 移除全域標籤
   * @param tagId 標籤 ID
   */
  removeGlobalTag: (tagId: string) => Promise<void>;
  
  /**
   * 重命名全域標籤
   * @param tagId 標籤 ID
   * @param newName 新標籤名稱
   */
  renameGlobalTag: (tagId: string, newName: string) => Promise<void>;
  
  /**
   * 系統設置
   */
  settings: {
    allowNonAdminAddGlobalTags: boolean; // 是否允許非管理員添加全域標籤
    defaultView: 'personal' | 'global';   // 默認視圖
  };
  
  /**
   * 更新設置
   */
  updateSettings: (newSettings: Partial<GlobalTagsState['settings']>) => void;
  
  /**
   * 切換多用戶模式
   */
  toggleMultiUserMode: (enabled: boolean) => void;
}

// 創建真正的全局標籤 store
export const useGlobalTagsStore = create<GlobalTagsState>()(
  persist(
    (set, get) => ({
      // 默認為單用戶模式
      isMultiUserMode: false,
      
      // 全域標籤列表
      globalTags: [],
      
      // 載入全域標籤
      loadGlobalTags: async () => {
        try {
          if (get().isMultiUserMode) {
            // 在多用戶模式下，應該從服務器獲取
            // TODO: 從 API 獲取
            console.log('從服務器加載全域標籤');
          } else {
            // 在單用戶模式下，從本地存儲讀取
            const storedTags = localStorage.getItem('murverse_global_tags');
            if (storedTags) {
              set({ globalTags: JSON.parse(storedTags) });
            }
          }
        } catch (e) {
          console.error('無法加載全域標籤', e);
        }
      },
      
      addGlobalTag: async (tagName) => {
        const { globalTags, isMultiUserMode } = get();
                
        // 標籤名稱處理
        const cleanTagName = tagName.trim();
        if (!cleanTagName) return;
        
        // 檢查標籤是否已存在（大小寫不敏感）
        if (globalTags.some(t => t.name.toLowerCase() === cleanTagName.toLowerCase())) {
            return; // 標籤已存在，不重複添加
        }
        
        // 創建新標籤，記錄創建者信息
        const newTag: GlobalTag = {
            id: Date.now().toString(), // 使用時間戳作為臨時ID
            name: cleanTagName,
            count: 0, // 初始使用次數為0
            createdBy: 'current-user', // 未來將使用實際用戶ID
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        if (isMultiUserMode) {
            // TODO: 發送到 API
            console.log(`向服務器添加全域標籤: ${cleanTagName}`);
        }
        
        // 添加到 store
        const updatedTags = [...globalTags, newTag];
        set({ globalTags: updatedTags });
        
        // 保存到 localStorage (單用戶模式)
        if (!isMultiUserMode) {
            localStorage.setItem('murverse_global_tags', JSON.stringify(updatedTags));
        }
        },
            
      // 移除全域標籤
      removeGlobalTag: async (tagId) => {
        const { globalTags, isMultiUserMode } = get();
        
        if (isMultiUserMode) {
          // TODO: 發送到 API
          console.log('從服務器移除全域標籤');
        }
        
        const updatedTags = globalTags.filter(tag => tag.id !== tagId);
        set({ globalTags: updatedTags });
        
        // 保存到 localStorage (單用戶模式)
        if (!isMultiUserMode) {
          localStorage.setItem('murverse_global_tags', JSON.stringify(updatedTags));
        }
      },
      
      // 重命名全域標籤
      renameGlobalTag: async (tagId, newName) => {
        const { globalTags, isMultiUserMode } = get();
        
        // 檢查新名稱是否已存在
        if (globalTags.some(t => t.name.toLowerCase() === newName.toLowerCase())) {
          console.error('標籤名稱已存在');
          return;
        }
        
        if (isMultiUserMode) {
          // TODO: 發送到 API
          console.log('在服務器上重命名全域標籤');
        }
        
        const updatedTags = globalTags.map(tag => {
          if (tag.id === tagId) {
            return {
              ...tag,
              name: newName,
              updatedAt: new Date().toISOString()
            };
          }
          return tag;
        });
        
        set({ globalTags: updatedTags });
        
        // 保存到 localStorage (單用戶模式)
        if (!isMultiUserMode) {
          localStorage.setItem('murverse_global_tags', JSON.stringify(updatedTags));
        }
      },
      
      // 系統設置
      settings: {
        allowNonAdminAddGlobalTags: true,
        defaultView: 'personal'
      },
      
      // 更新設置
      updateSettings: (newSettings) => {
        set(state => ({
          settings: {
            ...state.settings,
            ...newSettings
          }
        }));
      },
      
      // 切換多用戶模式
      toggleMultiUserMode: (enabled) => {
        set({ isMultiUserMode: enabled });
        console.log(`${enabled ? '啟用' : '禁用'}多用戶模式`);
      }
    }),
    {
      name: 'murverse-global-tags-storage'
    }
  )
);