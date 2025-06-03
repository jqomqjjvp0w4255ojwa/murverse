// components/fragments/tags/TagsDrawerHeader.tsx
/**
 * TagsDrawerHeader.tsx
 *
 * 📌 用途說明：
 * 抽屜式標籤窗口的標題列，專為抽屜模式設計。
 * 移除了浮動窗口的收合/全螢幕功能，改為簡化的抽屜控制。
 *
 * 🧩 功能特色：
 * - 根據模式顯示不同標題（搜尋碎片 / 編輯標籤 / 添加標籤）
 * - 可切換編輯模式與過濾模式（顯示已選標籤）
 * - 提供抽屜關閉控制
 * - 支援隱藏控制鈕（如 `hideEditButton`）
 *
 * ✅ 使用場景：
 * - `TagsDrawerWindow` 的標題列元件
 */

'use client'

import React from 'react';

interface TagsDrawerHeaderProps {
  mode: string;
  editMode: boolean;
  onEditModeToggle: () => void;
  onlyShowSel: boolean;
  onFilterToggle: () => void;
  onDrawerClose: () => void;
  hideEditButton?: boolean;
  hideFilterButton?: boolean;
}

const TagsDrawerHeader: React.FC<TagsDrawerHeaderProps> = ({
  mode,
  editMode,
  onEditModeToggle,
  onlyShowSel,
  onFilterToggle,
  onDrawerClose,
  hideEditButton = false,
  hideFilterButton = false
}) => {
  return (
    <div className="flex justify-between items-center cursor-move" style={{ marginBottom: '1.5vh' }}>
      <h3 className="font-bold" style={{ fontSize: '2.2vh' }}>
        {editMode ? '✏️ 編輯標籤' : (mode === 'add' ? '✔️ 添加標籤' : '💬 搜尋碎片')}
      </h3>
      <div className="flex gap-2 items-center">
        {/* 只在非隱藏狀態顯示編輯按鈕 */}
        {!hideEditButton && (
          <button
            onClick={onEditModeToggle}
            className={`px-2 py-1 rounded transition-colors duration-200 ${
              editMode ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-black hover:bg-gray-100'
            }`}
            style={{ fontSize: '1.4vh' }}
            title={editMode ? "完成編輯" : "編輯標籤"}
          >
            {editMode ? '完成' : '✏️'}
          </button>
        )}

        {/* 只在非隱藏狀態顯示過濾按鈕 */}
        {!editMode && !hideFilterButton && (
          <button 
            onClick={onFilterToggle}
            className="text-gray-600 hover:text-black hover:bg-gray-100 p-1 rounded transition-colors duration-200"
            style={{ fontSize: '1.4vh' }}
            title={onlyShowSel ? "顯示全部標籤" : "只顯示已選標籤"}
          >
            {onlyShowSel ? '👁️' : '🙈'}
          </button>
        )}
              
        {/* 抽屜關閉按鈕 */}
        <button
          onClick={onDrawerClose}
          className="text-gray-600 hover:text-black hover:bg-gray-100 p-1 rounded transition-colors duration-200"
          style={{ fontSize: '1.8vh' }}
          title="關閉抽屜"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default TagsDrawerHeader;