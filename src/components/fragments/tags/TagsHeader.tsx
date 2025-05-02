// components/fragments/tags/TagsHeader.tsx
'use client'

import React from 'react';

interface TagsHeaderProps {
  mode: string;
  editMode: boolean;
  onEditModeToggle: () => void;
  onlyShowSel: boolean;
  onFilterToggle: () => void;
  isFullScreen: boolean;
  onCollapseClick: () => void;
  onToggleFullScreen: () => void;
}

const TagsHeader: React.FC<TagsHeaderProps> = ({
  mode,
  editMode,
  onEditModeToggle,
  onlyShowSel,
  onFilterToggle,
  isFullScreen,
  onCollapseClick,
  onToggleFullScreen
}) => {
  return (
    <div className="flex justify-between items-center mb-3 cursor-move">
      <h3 className="text-lg font-bold">
        {editMode ? '✏️ 編輯標籤' : (mode === 'add' ? '✔️ 添加標籤' : '💬 搜尋碎片')}
      </h3>
      <div className="flex gap-2 items-center">
        <button
          onClick={onEditModeToggle}
          className={`text-sm px-2 py-1 rounded ${editMode ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-black'}`}
          title={editMode ? "完成編輯" : "編輯標籤"}
        >
          {editMode ? '完成' : '✏️'}
        </button>

        {!editMode && (
          <button 
            onClick={onFilterToggle}
            className="text-sm text-gray-600 hover:text-black"
          >
            {onlyShowSel ? '👁️' : '🙈'}
          </button>
        )}
        
        {/* 收合按鈕 */}
        <button
          onClick={onCollapseClick}
          className="text-sm px-2 py-1 text-gray-600 hover:text-black"
          title="收合"
        >
          －
        </button>

        {/* 全屏切換按鈕 */}
        <button 
          onClick={onToggleFullScreen} 
          className="w-6 h-6 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
          title={isFullScreen ? "退出全屏" : "全屏模式"}
        >
          {isFullScreen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3v3a2 2 0 0 1-2 2H3"></path>
              <path d="M21 8h-3a2 2 0 0 1-2-2V3"></path>
              <path d="M3 16h3a2 2 0 0 1 2 2v3"></path>
              <path d="M16 21v-3a2 2 0 0 1 2-2h3"></path>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9"></polyline>
              <polyline points="9 21 3 21 3 15"></polyline>
              <line x1="21" y1="3" x2="14" y2="10"></line>
              <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default TagsHeader;