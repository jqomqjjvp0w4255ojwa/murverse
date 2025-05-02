// components/fragments/tags/TagLogicToggle.tsx
'use client'

import React from 'react'
import type { TagLogicMode } from '@/stores/useFragmentsStore'

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
        onClick={() => {
          if (mode === 'add') {
            setPendingTags([])
          } else {
            setSelectedTags([])
            setExcludedTags([])
          }
        }}
        className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
      >
        清除選取
      </button>
    </div>
  )
}

export default TagLogicToggle
