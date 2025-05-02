// components/fragments/tags/TagsSearchBar.tsx
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
  isAddMode
}) => {
  return (
    <div className="flex items-center gap-1 mb-3">
      {/* 搜尋模式切換按鈕 - 編輯模式下隱藏 */}
      {!editMode && (
        <button
          onClick={() => setSearchMode(searchMode === 'tag' ? 'fragment' : 'tag')}
          className="p-1.5 border border-gray-400 rounded-l-lg rounded-r-sm flex items-center justify-center"
          title={`切換到${searchMode === 'tag' ? '碎片' : '標籤'}搜尋`}
        >
          {searchMode === 'tag' ? '📝' : '🏷️'}
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
            onFocus={onFocus}
            onBlur={onBlur}
          />
        </div>
        
        {/* 新增標籤按鈕 - 位於輸入框內右側，編輯模式下隱藏 */}
        {search.trim() && 
        !editMode &&
        searchMode === 'tag' && (
          <button
            onClick={onAddTag}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-500 hover:text-blue-700 font-bold"
            title="新增標籤"
          >
            ＋
          </button>
        )}
      </div>
      
      {/* 排序下拉選單及方向切換 - 編輯模式下隱藏 */}
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