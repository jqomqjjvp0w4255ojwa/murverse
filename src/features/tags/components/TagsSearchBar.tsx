// components/fragments/tags/TagsSearchBar.tsx
/**
 * TagsSearchBar.tsx
 *
 * 📌 用途說明：
 * 標籤視窗的搜尋列元件，支援切換搜尋模式（標籤／碎片）與標籤新增、排序等互動功能。
 *
 * 🧩 功能特色：
 * - 支援 `tag` / `fragment` 搜尋模式切換
 * - 標籤模式下可快速新增標籤（Enter 觸發）
 * - 顯示選中的 meta 標籤（帶圖示與刪除）
 * - 提供排序選單與方向切換（升/降）
 *
 * ✅ 使用場景：
 * - `TagsFloatingWindow` 的搜尋列（標籤與碎片搜尋模式共用）
 */



'use client'

import React from 'react';

interface TagsSearchBarProps {
  search: string;
  setSearch: (value: string) => void;
  editMode: boolean;
  searchMode: 'tag' | 'fragment';
  setSearchMode: (mode: 'tag' | 'fragment') => void;
  sortMode: string;
  setSortMode: (mode: string) => void;
  onAddTag: () => void;
  onFocus: () => void;
  onBlur: () => void;
  selectedMetaTags: {id: string, name: string, icon: string}[];
  onRemoveMetaTag: (id: string) => void;
  isAddMode: boolean;
  onSearchModeChange?: (newMode: 'tag' | 'fragment', isAddMode: boolean) => void;
  onSearch?: () => void;
  allTagNames: string[];    
}

const TagsSearchBar: React.FC<TagsSearchBarProps> = ({
  search,
  setSearch,
  editMode,
  searchMode,
  setSearchMode,
  sortMode,
  setSortMode,
  onAddTag,
  onFocus,
  onBlur,
  selectedMetaTags,
  onRemoveMetaTag,
  isAddMode,
  onSearchModeChange,
  onSearch,
  allTagNames,
}) => {
  // 修改：直接切換到目標模式，並通過回調處理添加模式的斷線
  const handleToggleSearchMode = () => {
    const newMode = searchMode === 'tag' ? 'fragment' : 'tag';
    
    // 先通知父元件模式變更，傳遞當前是否為添加模式
    if (onSearchModeChange) {
      onSearchModeChange(newMode, isAddMode);
    }
    
    // 然後再設置模式
    setSearchMode(newMode);
  };

  const triggerSearch = () => {
    if (onSearch) {
      // Always trigger the search regardless of input state
      onSearch();
    }
  };

  const duplicate =
  searchMode === 'tag' &&
  allTagNames.some((name: string) =>
    name.toLowerCase() === search.trim().toLowerCase()
  );

  return (
    <div className="flex items-center gap-1 mb-3">
      {/* 搜尋模式切換按鈕 - 編輯模式下隱藏 */}
      {!editMode && (
        <button
          onClick={handleToggleSearchMode}
          className="p-1.5 border border-gray-400 rounded-l-lg rounded-r-sm flex items-center justify-center"
          title={`切換到${searchMode === 'tag' ? '碎片' : '標籤'}搜尋`}
        >
          {searchMode === 'tag' ? '🏷️' : '📝'}
        </button>
      )}
      
      {/* 搜尋框區域 - 中間佔據主要空間 */}
      <div className="relative flex-grow">
        <div className="flex items-center border border-gray-400 rounded-sm overflow-hidden">
          {/* 已選擇的特殊標籤 - 編輯模式下隱藏 */}
          {!editMode && (
            <div className="flex flex-wrap gap-0.5 pl-1">
              {selectedMetaTags.map(tag => (
                <div
                  key={tag.id}
                  className="inline-flex items-center h-5 px-1 bg-gray-50 border border-gray-200 rounded text-[10px] gap-0.5"
                >
                  <span className="opacity-70">{tag.icon}</span>
                  <span className="truncate max-w-[40px]">{tag.name}</span>
                  <button
                    onClick={() => onRemoveMetaTag(tag.id)}
                    className="ml-0.5 text-[10px] text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
            
         <input
          className="w-full p-1.5 pl-2 pr-8 border-none focus:outline-none focus:ring-0"
          placeholder={editMode 
            ? '搜尋標籤...' 
            : (searchMode === 'tag' ? '搜尋或新增標籤...' : '搜尋碎片...')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !editMode) {
              if (searchMode === 'tag' && !duplicate && search.trim()) {
                onAddTag();
              } else if (searchMode === 'fragment') {
                // 按 Enter 執行搜尋，無需檢查 search 是否為空
                e.preventDefault();
                triggerSearch();
              }
            }
          }}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        </div>
        
        {/* 新增標籤按鈕 - 位於輸入框內右側，僅在標籤模式且非編輯模式下顯示 */}
        {search.trim() && 
        !editMode &&
        searchMode === 'tag' &&
        !duplicate && (
          <button
            onClick={onAddTag}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-500 hover:text-blue-700 font-bold"
            title="新增標籤"
          >
            ＋
          </button>
        )}
      </div>
      
      {/* 排序下拉選單及方向切換 - 標籤模式且非編輯模式下顯示 */}
      {!editMode && searchMode === 'tag' && (
        <div className="flex items-center">
          <select
            value={sortMode.replace('asc_', '').replace('desc_', '')}
            onChange={e => {
              const baseMode = e.target.value;
              const direction = sortMode.startsWith('desc_') ? 'desc_' : 'asc_';
              setSortMode(`${direction}${baseMode}`);
            }}
            disabled={isAddMode}
            className="h-[36px] text-sm px-0.2 border border-gray-400 rounded-l-sm rounded-r-lg focus:outline-none focus:ring-1 focus:ring-blue-300 disabled:opacity-40"
          >
            <option value="freq">使用頻率</option>
            <option value="az">名稱 (A-Z)</option>
            <option value="recent">最近使用</option>
            <option value="popular">熱門程度</option>
            <option value="created">創建時間</option>
            <option value="relevance">相關性</option>
          </select>
          
          <button 
            onClick={() => {
              const baseMode = sortMode.replace('asc_', '').replace('desc_', '');
              setSortMode(sortMode.startsWith('desc_') ? `asc_${baseMode}` : `desc_${baseMode}`);
            }}
            disabled={isAddMode}
            className="ml-1 p-1 text-gray-600 hover:text-black disabled:opacity-40"
            title={sortMode.startsWith('desc_') ? '升序排列' : '降序排列'}
          >
            {sortMode.startsWith('desc_') ? '↑' : '↓'}
          </button>
        </div>
      )}
    </div>
  );
};

export default TagsSearchBar;