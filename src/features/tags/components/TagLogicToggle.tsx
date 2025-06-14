// components/fragments/tags/TagLogicToggle.tsx
/**
 * TagLogicToggle.tsx
 *
 * 📌 用途說明：
 * 標籤篩選的邏輯切換工具，讓使用者在 AND（交集）與 OR（聯集）模式間切換，
 * 並可一鍵清除選取的標籤。
 *
 * 🧩 功能特色：
 * - 支援「AND / OR」切換，改變標籤的篩選邏輯
 * - 根據當前模式（搜尋或添加）清除不同的標籤選擇（selected/excluded 或 pending）
 * - 顯示當前邏輯狀態提示
 *
 * ✅ 使用場景：
 * - 嵌入 `TagsFloatingWindow` 上方標籤篩選區域
 */


import React from 'react'
import type { TagLogicMode } from '@/features/fragments/store/useFragmentsStore'
import { useSearchStore } from '@/features/search/useSearchStore' // 引入 useSearchStore
import { useFragmentsStore } from '@/features/fragments/store/useFragmentsStore'

interface TagLogicToggleProps {
  tagLogicMode: TagLogicMode
  setTagLogicMode: (mode: TagLogicMode) => void
  mode: string
  pendingTags: string[]
  setPendingTags: (tags: string[]) => void
  selectedTags: string[]
  setSelectedTags: (tags: string[]) => void
  excludedTags: string[]
  setExcludedTags: (tags: string[]) => void
}

const TagLogicToggle: React.FC<TagLogicToggleProps> = ({
  tagLogicMode,
  setTagLogicMode,
  mode,
  pendingTags,
  setPendingTags,
  selectedTags,
  setSelectedTags,
  excludedTags,
  setExcludedTags
}) => {
  // 在組件中獲取 fragments 和 executeSearch 方法
  const fragments = useFragmentsStore.getState().fragments
  
    const handleClearSelection = () => {
    if (mode === 'add') {
      setPendingTags([])
    } else {
      // 清除選取標籤
      setSelectedTags([])
      setExcludedTags([])
      
      // 同步更新 SearchStore 的狀態
      const searchStore = useSearchStore.getState()
      searchStore.setSelectedTags([])
      searchStore.setExcludedTags([])
      
      // 🚀 修復：檢查 fragments 是否為 null
      if (fragments) {
        // 重新執行搜索以更新顯示的碎片
        searchStore.setKeyword('')
        searchStore.setScopes(['fragment'])
        searchStore.executeSearch(fragments)
      } else {
        console.warn('⚠️ fragments 為 null，無法執行搜尋')
      }
    }
  }

  return (
    <div className="flex justify-between items-center mb-3">
      <div className="flex items-center">
        <button
          onClick={() => setTagLogicMode('AND')}
          className={`text-xs px-2 py-1 rounded-l border ${tagLogicMode === 'AND' ? 'bg-blue-100 border-blue-300' : 'bg-gray-100 border-gray-300'}`}
          title="交集：同時符合所有選取的標籤"
        >
          AND
        </button>
        <button
          onClick={() => setTagLogicMode('OR')}
          className={`text-xs px-2 py-1 rounded-r border-t border-b border-r ${tagLogicMode === 'OR' ? 'bg-blue-100 border-blue-300' : 'bg-gray-100 border-gray-300'}`}
          title="聯集：符合任一選取的標籤"
        >
          OR
        </button>
        <span className="text-xs text-gray-500 ml-2">
          {tagLogicMode === 'AND' ? '交集模式:左鍵篩選 右鍵排除' : '聯集模式:左鍵符合 右鍵排除'}
        </span>
      </div>
      <button
        onClick={handleClearSelection}
        className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
      >
        清除選取
      </button>
    </div>
  )
}

export default TagLogicToggle