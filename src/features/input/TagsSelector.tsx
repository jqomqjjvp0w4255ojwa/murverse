// components/fragments/TagsSelector.tsx
/**
 * TagsSelector.tsx
 *
 * 📌 用途說明：
 * 這是一個簡潔的標籤顯示與操作列元件，用於顯示目前選擇的標籤，
 * 並提供一個按鈕觸發開啟標籤選擇器（例如 TagsFloatingWindow）。
 *
 * 🧩 功能特色：
 * - 顯示所有已選擇的標籤（pendingTags）
 * - 每個標籤都可點擊刪除
 * - 透過按鈕觸發標籤選擇器（傳遞 `onOpenTagsWindow`）
 * - 支援 `ref` 用於定位連接線動畫（由 FloatingInputBar 呼叫）
 *
 * ✅ 使用場景範例：
 * - 整合於 FloatingInputBar 的標籤選擇列
 * - 作為獨立元件用於建立或編輯 fragment 時的標籤操作
 */



'use client'

import React, { RefObject } from 'react'

interface TagsSelectorProps {
  tags: string[]
  tagButtonRef: RefObject<HTMLButtonElement | null> // 修改這裡以接受 null 值
  onOpenTagsWindow: (e: React.MouseEvent) => void
  onRemoveTag: (tag: string) => void
}

export default function TagsSelector({
  tags,
  tagButtonRef,
  onOpenTagsWindow,
  onRemoveTag
}: TagsSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
        <button
        ref={tagButtonRef as RefObject<HTMLButtonElement>} // 使用類型轉換
        className="ml-8 mt-2 mb-2 px-3 py-1 bg-kraft rounded-lg text-sm font-medium border border-kraft/20 transition-all duration-200 hover:bg-kraft/80 hover:-translate-y-0.5"
        onClick={onOpenTagsWindow}
        style={{ color: '#4a5568' }}
        
      >
        #
      </button>
      {tags.map(tag => (
        <span
          key={tag}
          className="px-2 py-1 bg-kraft rounded-lg text-sm font-medium border border-kraft/20 transition-all duration-200 hover:bg-kraft/80 hover:-translate-y-0.5"
          onClick={() => onRemoveTag(tag)}
          style={{ color: '#4a5568' }}
        >
          #{tag}
          <span className="ml-1 text-xs hover:text-red-500">×</span>
        </span>
      ))}
    </div>
  )
}