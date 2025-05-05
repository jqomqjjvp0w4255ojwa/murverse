// components/fragments/tags/TagsList.tsx
/**
 * TagsList.tsx
 *
 * 📌 用途說明：
 * 顯示所有標籤的清單，支援篩選、排序、編輯、選取、排除、重命名與刪除操作。
 *
 * 🧩 功能特色：
 * - 顯示一般與系統標籤（如「今日」、「無標籤」）
 * - 點擊標籤可選取，右鍵排除（搜尋模式）
 * - 編輯模式下支援多選刪除、名稱編輯、排序指標顯示
 * - 滾動加載更多標籤
 *
 * ✅ 使用場景：
 * - `TagsFloatingWindow` 的核心顯示區域
 */



'use client'

import React, { forwardRef } from 'react';
import TagItem from './TagItem';

interface TagsListProps {
  isFullScreen: boolean;
  editMode: boolean;
  mode: string;
  tags: { name: string; count: number }[];
  itemsPerPage: number;
  totalTagsCount: number;
  shown: { name: string; count: number }[];
  selectedTagsToDelete: string[];
  editingTag: string | null;
  editValue: string;
  sortMode: string;
  onScroll: () => void;
  onTagSelect: (tag: string) => void;
  onTagExclude: (tag: string) => void;
  onTagSelectionToggle: (tag: string) => void;
  onSetEditingTag: (tag: string | null) => void;
  onEditValueChange: (value: string) => void;
  onTagRename: (oldName: string, newName: string) => void;
  isPos: (tag: string) => boolean;
  isNeg: (tag: string) => boolean;
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
  // 系統標籤
  const systemTags = ['今日', '本周', '本月', '熱門', '無標籤'];

  return (
    <div 
      ref={ref}
      onScroll={onScroll}
      className={`flex flex-col gap-2 ${isFullScreen ? 'max-h-[calc(100vh-200px)]' : 'max-h-64'} overflow-y-auto custom-scrollbar pr-1`}
    >
      {/* 系統標籤區塊 - 僅在非編輯模式下顯示 */}
      {!editMode && (
        <div className="flex flex-wrap gap-2 mb-2 pb-2 border-b border-dashed border-gray-200">
          {systemTags.map(systemTag => (
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
                e.preventDefault();
                onTagExclude(systemTag);
              }}
            >
              <span>
                {systemTag === '今日' ? '' : 
                systemTag === '本周' ? '' : 
                systemTag === '本月' ? '' : 
                systemTag === '熱門' ? '' : ''}
                {systemTag}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 一般標籤區塊 */}
      <div className="flex flex-wrap gap-2">
        {shown.slice(0, itemsPerPage).map(tag => (
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
              if (editMode) {
                if (e.ctrlKey || e.metaKey) {
                  // Ctrl/Cmd+點擊選中標籤用於刪除
                  onTagSelectionToggle(tag.name);
                } else {
                  // 普通點擊進入編輯模式
                  onSetEditingTag(tag.name);
                  onEditValueChange(tag.name);
                }
              } else {
                onTagSelect(tag.name);
              }
            }}
            onTagContextMenu={(e) => {
              if (!editMode) {
                e.preventDefault();
                onTagExclude(tag.name);
              }
            }}
            onToggleSelection={() => onTagSelectionToggle(tag.name)}
            onRenameConfirm={() => onTagRename(tag.name, editValue)}
            onEditCancel={() => onSetEditingTag(null)}
          />
        ))}

        {/* 加載提示 */}
        {totalTagsCount > itemsPerPage && (
          <div className="w-full text-center text-xs text-gray-500 py-1">
            滾動加載更多...
          </div>
        )}
      </div>
    </div>
  );
});

TagsList.displayName = 'TagsList';

export default TagsList;