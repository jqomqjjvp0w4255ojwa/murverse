'use client'

import React, { forwardRef } from 'react'
import TagItem from './TagItem'
import {
  isSystemTag,
  isDisplaySystemTag,
  SYSTEM_TAG_MAP
} from '@/features/tags/constants/systemTags'

interface TagsListProps {
  isFullScreen: boolean
  editMode: boolean
  mode: string
  tags: { name: string; count: number }[]
  itemsPerPage: number
  totalTagsCount: number
  shown: { name: string; count: number }[]
  selectedTagsToDelete: string[]
  editingTag: string | null
  editValue: string
  sortMode: string
  onScroll: () => void
  onTagSelect: (tag: string) => void
  onTagExclude: (tag: string) => void
  onTagSelectionToggle: (tag: string) => void
  onSetEditingTag: (tag: string | null) => void
  onEditValueChange: (value: string) => void
  onTagRename: (oldName: string, newName: string) => void
  isPos: (tag: string) => boolean
  isNeg: (tag: string) => boolean
}

const TagsList = forwardRef<HTMLDivElement, TagsListProps>(({
  isFullScreen,
  editMode,
  mode,
  tags,
  itemsPerPage,
  totalTagsCount,
  shown,
  selectedTagsToDelete,
  editingTag,
  editValue,
  sortMode,
  onScroll,
  onTagSelect,
  onTagExclude,
  onTagSelectionToggle,
  onSetEditingTag,
  onEditValueChange,
  onTagRename,
  isPos,
  isNeg
}, ref) => {
  return (
    <div
      ref={ref}
      onScroll={onScroll}
      className={`flex flex-col gap-2 ${isFullScreen ? 'max-h-[calc(100vh-200px)]' : 'max-h-64'} overflow-y-auto custom-scrollbar pr-1`}
    >
      {/* 系統標籤區塊 - 僅在非編輯模式下顯示 */}
      {!editMode && (
        <div className="flex flex-wrap gap-2 mb-2 pb-2 border-b border-dashed border-gray-200">
          {Object.keys(SYSTEM_TAG_MAP).map(systemTag => (
            <div
              key={systemTag}
              className={`inline-flex items-center px-2 py-1 border ${
                isPos(systemTag)
                  ? 'border-green-500 bg-green-200'
                  : isNeg(systemTag)
                  ? 'border-pink-500 bg-pink-200'
                  : 'border-gray-300'
              } rounded-full text-sm cursor-pointer bg-gray-50 hover:bg-gray-100`}
              onClick={() => onTagSelect(systemTag)}
              onContextMenu={e => {
                e.preventDefault()
                onTagExclude(systemTag)
              }}
            >
              {systemTag}
            </div>
          ))}
        </div>
      )}

      {/* 一般標籤區塊 */}
      <div className="flex flex-wrap gap-2">
        {shown
          .filter(tag => !isSystemTag(tag.name) || isDisplaySystemTag(tag.name))
          .slice(0, itemsPerPage)
          .map(tag => {
            const disabled = isSystemTag(tag.name)

            return (
              <TagItem
                key={tag.name}
                tag={tag}
                isSelected={isPos(tag.name)}
                isExcluded={isNeg(tag.name)}
                editMode={editMode}
                isInDeleteSelection={selectedTagsToDelete.includes(tag.name)}
                isEditing={editingTag === tag.name}
                editValue={editValue}
                sortMode={sortMode}
                onEditValueChange={onEditValueChange}
                onTagClick={(e) => {
                  if (disabled) return
                  if (editMode) {
                    if (e.ctrlKey || e.metaKey) {
                      onTagSelectionToggle(tag.name)
                    } else {
                      onSetEditingTag(tag.name)
                      onEditValueChange(tag.name)
                    }
                  } else {
                    onTagSelect(tag.name)
                  }
                }}
                onTagContextMenu={(e) => {
                  if (!editMode && !disabled) {
                    e.preventDefault()
                    onTagExclude(tag.name)
                  }
                }}
                onToggleSelection={() => !disabled && onTagSelectionToggle(tag.name)}
                onRenameConfirm={() => onTagRename(tag.name, editValue)}
                onEditCancel={() => onSetEditingTag(null)}
                disabled={disabled}
              />
            )
          })}

        {/* 加載提示 */}
        {totalTagsCount > itemsPerPage && (
          <div className="w-full text-center text-xs text-gray-500 py-1">
            滾動加載更多...
          </div>
        )}
      </div>
    </div>
  )
})

TagsList.displayName = 'TagsList'

export default TagsList
