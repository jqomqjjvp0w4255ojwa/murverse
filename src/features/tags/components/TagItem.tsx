// components/fragments/tags/TagItem.tsx
/**
 * TagItem.tsx
 *
 * 📌 用途說明：
 * 單一標籤的顯示元件，支援點選、排除、編輯、選取刪除等多種互動操作。
 *
 * 🧩 功能特色：
 * - 搜尋模式：
 *   - 點擊：選取標籤
 *   - 右鍵：排除標籤
 * - 編輯模式：
 *   - 點擊：進入名稱編輯狀態
 *   - Checkbox 勾選：加入刪除清單
 *   - 支援 Enter 確認、Esc 取消編輯
 * - 顯示排序參考資訊（如頻率）
 *
 * ✅ 使用場景：
 * - `TagsList.tsx` 中顯示所有標籤
 */



'use client'
import React from 'react';

interface TagItemProps {
  tag: { name: string; count: number };
  isSelected: boolean;
  isExcluded: boolean;
  editMode: boolean;
  isInDeleteSelection: boolean;
  isEditing: boolean;
  editValue: string;
  sortMode: string;
  onEditValueChange: (value: string) => void;
  onTagClick: (e: React.MouseEvent) => void;
  onTagContextMenu: (e: React.MouseEvent) => void;
  onToggleSelection: () => void;
  onRenameConfirm: () => void;
  onEditCancel: () => void;
}

const TagItem: React.FC<TagItemProps> = ({
  tag,
  isSelected,
  isExcluded,
  editMode,
  isInDeleteSelection,
  isEditing,
  editValue,
  sortMode,
  onEditValueChange,
  onTagClick,
  onTagContextMenu,
  onToggleSelection,
  onRenameConfirm,
  onEditCancel
}) => {
  return (
    <div
      className={`inline-flex items-center px-2 py-1 ${
        editMode 
        ? isInDeleteSelection
          ? 'border border-red-500 bg-red-50'
          : 'border border-gray-400'
          : isSelected 
            ? 'bg-green-200 border border-green-500'
            : isExcluded 
              ? 'bg-pink-200 border border-pink-500'
              : 'bg-white border border-gray-300'
      } rounded-full text-sm cursor-pointer hover:bg-gray-100 whitespace-nowrap`}
      onClick={onTagClick}
      onContextMenu={onTagContextMenu}
    >
      {editMode && (
        <input
          type="checkbox"
          className="mr-1 h-3 w-3"
          checked={isInDeleteSelection}
          onChange={onToggleSelection}
          onClick={(e) => e.stopPropagation()}
        />
      )}
      {isEditing ? (
        <input
          autoFocus
          value={editValue}
          onChange={(e) => onEditValueChange(e.target.value)}
          onBlur={onRenameConfirm}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onRenameConfirm();
            if (e.key === 'Escape') onEditCancel();
          }}
          onClick={(e) => e.stopPropagation()}
          className="bg-transparent border-none focus:outline-none text-sm px-1"
          style={{ minWidth: `${Math.max(tag.name.length, editValue.length) * 8}px` }}
        />
      ) : (
        <span>
          #{tag.name} {sortMode.includes('freq') && !editMode && `(${tag.count})`}
        </span>
      )}
    </div>
  );
};

export default TagItem;