// components/fragments/tags/EditTagsPanel.tsx
/**
 * EditTagsPanel.tsx
 *
 * 📌 用途說明：
 * 顯示於標籤編輯模式下，用於操作多選標籤的批次刪除與取消選取。
 *
 * 🧩 功能特色：
 * - 顯示目前已選取待刪除的標籤數量
 * - 提供「刪除」與「取消」兩個主要操作按鈕
 * - 未選取任何標籤時，顯示使用說明提示
 *
 * ✅ 使用場景：
 * - 嵌入於 `TagsFloatingWindow` 的編輯模式上方區塊
 */


'use client'
import React from 'react';

interface EditTagsPanelProps {
  selectedTagsToDelete: string[];
  onDeleteTags: () => void;
  onCancelSelection: () => void;
}

const EditTagsPanel: React.FC<EditTagsPanelProps> = ({
  selectedTagsToDelete,
  onDeleteTags,
  onCancelSelection
}) => {
  return (
    <div className="mb-3 text-sm text-gray-700 bg-blue-50 py-2 px-3 rounded">
      <div className={`flex ${selectedTagsToDelete.length > 0 ? 'justify-between' : 'justify-center'} items-center`}>
        <div className="font-medium">
          {selectedTagsToDelete.length > 0 
            ? `已選：${selectedTagsToDelete.length}個標籤` 
            : "點擊標籤修改名稱，勾選標籤可批次刪除"}
        </div>
        {selectedTagsToDelete.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-gray-600">已選: {selectedTagsToDelete.length}</span>
            <button 
              onClick={onDeleteTags}
              className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-md text-xs"
            >
              刪除
            </button>
            <button 
              onClick={onCancelSelection}
              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-xs"
            >
              取消
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditTagsPanel;