// useCollapsible.ts
'use client'

import { useState, useCallback, useEffect } from 'react';

interface CollapsibleState {
  isCollapsed: boolean;
  toggleCollapse: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

/**
 * 可收合狀態管理 Hook
 * @param {string} id - 窗口唯一標識符
 * @param {boolean} defaultCollapsed - 默認收合狀態
 * @returns {CollapsibleState} - 收合狀態和控制方法
 */
export function useCollapsible(id: string, defaultCollapsed = false): CollapsibleState {
  // 使用 localStorage 保存收合狀態，使其在頁面刷新後保持
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`window-${id}-collapsed`);
      return saved !== null ? JSON.parse(saved) : defaultCollapsed;
    }
    return defaultCollapsed;
  });

  // 切換收合狀態的方法
  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => {
      const newState = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem(`window-${id}-collapsed`, JSON.stringify(newState));
      }
      return newState;
    });
  }, [id]);

  // 直接設置收合狀態的方法
  const setCollapsed = useCallback((collapsed: boolean) => {
    setIsCollapsed(collapsed);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`window-${id}-collapsed`, JSON.stringify(collapsed));
    }
  }, [id]);

  // 同步 localStorage 和狀態
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`window-${id}-collapsed`, JSON.stringify(isCollapsed));
    }
  }, [id, isCollapsed]);

  return {
    isCollapsed,
    toggleCollapse,
    setCollapsed
  };
}