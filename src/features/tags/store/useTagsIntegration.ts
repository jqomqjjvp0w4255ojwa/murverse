// hooks/useTagsIntegration.ts
'use client'

import { useTagsStore } from '@/features/tags/store/useTagsStore'
import { useCallback } from 'react'

export function useTagsIntegration() {
  const { 
    openTagSelector, 
    setMode, 
    setSearchMode,
    setConnected
  } = useTagsStore()

  // 這個函數將用於替換原有的 openTagSelector 函數
  const openTagSelectorEnhanced = useCallback((pos?: { x: number; y: number }) => {
    console.log('增強版開啟標籤選擇器被調用');
    
    // 明確強制設置搜尋模式為標籤模式
    setSearchMode('tag');
    // 設置為添加模式
    setMode('add');
    // 強制設置連線狀態
    setConnected(true);
    
    // 最後再打開標籤選擇器
    openTagSelector(pos);
    
    // 為確保更新到位，再次強制設置模式（有時可能因為渲染時序問題導致狀態設置不生效）
    setTimeout(() => {
      setSearchMode('tag');
      setMode('add');
    }, 20);
  }, [openTagSelector, setMode, setSearchMode, setConnected]);

  return {
    openTagSelector: openTagSelectorEnhanced
  }
}