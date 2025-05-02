// components/fragments/TagsSelector.tsx
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