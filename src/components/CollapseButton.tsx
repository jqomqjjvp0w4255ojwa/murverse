// CollapseButton.tsx
'use client'

import React from 'react';

interface CollapseButtonProps {
  isCollapsed: boolean;
  onClick: () => void;
  className?: string;
}

export default function CollapseButton({ 
  isCollapsed, 
  onClick, 
  className = '' 
}: CollapseButtonProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation(); // 防止事件冒泡到窗口拖曳
        onClick();
      }}
      className={`absolute top-1 right-2 w-5 h-5 flex items-center justify-center
        text-xs bg-gray-100 hover:bg-gray-200 rounded-sm
        border border-gray-300 shadow-sm z-50 transition-colors ${className}`}
      aria-label={isCollapsed ? "展開" : "收合"}
      title={isCollapsed ? "展開" : "收合"}
    >
      {isCollapsed ? "口" : "-"}
    </button>
  );
}