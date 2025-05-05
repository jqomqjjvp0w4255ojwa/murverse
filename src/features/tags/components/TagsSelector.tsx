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
        className="px-2 py-1 bg-pink-50 text-pink-500 border border-pink-300 rounded-full text-sm"
        onClick={onOpenTagsWindow}
      >
        添加標籤：
      </button>
      {tags.map(tag => (
        <span
          key={tag}
          className="px-2 py-1 bg-green-100 border border-green-400 text-green-700 rounded-full text-sm flex items-center gap-1 cursor-pointer hover:bg-green-200"
          onClick={() => onRemoveTag(tag)}
        >
          #{tag}
          <span className="ml-1 text-xs hover:text-red-500">×</span>
        </span>
      ))}
    </div>
  )
}