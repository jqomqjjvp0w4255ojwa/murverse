'use client'

import React, { useRef, useState, useEffect, ReactNode } from 'react'

interface VirtualListProps {
  totalHeight: number;            // 容器總高度
  itemCount: number;              // 項目總數量
  estimatedItemHeight: number;    // 估計的每個項目高度
  renderItem: (index: number, style: React.CSSProperties) => ReactNode; // 渲染單個項目的函數
  overscan?: number;              // 額外渲染的項目數量，用於減少滾動時的空白
  scrollingDelay?: number;        // 滾動結束判定延遲（毫秒）
  className?: string;             // 容器額外的 CSS 類名
  style?: React.CSSProperties;    // 容器額外的 CSS 樣式
  onVisibleItemsChange?: (startIndex: number, endIndex: number) => void; // 可見項目變化時的回調
}

export default function VirtualList({
  totalHeight,
  itemCount,
  estimatedItemHeight,
  renderItem,
  overscan = 5, // 增加 overscan 默認值
  scrollingDelay = 150,
  className = '',
  style = {},
  onVisibleItemsChange
}: VirtualListProps) {
  // 容器引用，用於獲取滾動位置
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 儲存每個項目的位置和高度信息
  const [itemPositions, setItemPositions] = useState<{ top: number, height: number }[]>(() => {
    return Array(itemCount).fill(0).map((_, i) => ({
      top: i * estimatedItemHeight,
      height: estimatedItemHeight
    }));
  });
  
  // 計算可見區域範圍
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });
  
  // 是否正在滾動
  const [isScrolling, setIsScrolling] = useState(false);
  
  // 滾動超時定時器引用
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 當項目數量或估計高度變化時，重新計算位置
  useEffect(() => {
    // 安全處理：如果 itemCount 為 0，則設置為空陣列
    if (itemCount === 0) {
      setItemPositions([]);
      setVisibleRange({ start: 0, end: 0 });
      return;
    }
    
    // 只有當 itemPositions 長度與 itemCount 不同時才重新計算
    // 這樣可以避免已經計算好的項目高度被重置
    if (itemPositions.length !== itemCount) {
      const newPositions = Array(itemCount).fill(0).map((_, i) => {
        // 如果項目已存在，保留其高度
        if (i < itemPositions.length) {
          return {
            top: i === 0 ? 0 : itemPositions[i-1].top + itemPositions[i-1].height,
            height: itemPositions[i].height
          };
        } else {
          // 新項目使用估計高度
          const prevTop = i > 0 && i - 1 < itemPositions.length
            ? itemPositions[i-1].top + itemPositions[i-1].height
            : i * estimatedItemHeight;
            
          return {
            top: prevTop,
            height: estimatedItemHeight
          };
        }
      });
      
      setItemPositions(newPositions);
    }
  }, [itemCount, estimatedItemHeight, itemPositions]);
  
  // 根據滾動位置找到開始索引 - 防護版本
  const findStartIndex = (scrollTop: number) => {
    // 防護：如果itemPositions為空，直接返回0
    if (itemPositions.length === 0) return 0;
    
    let index = 0;
    // 使用二分查找以提高性能
    let low = 0;
    let high = itemPositions.length - 1;
    
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (itemPositions[mid].top < scrollTop) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    
    return Math.max(0, low - 1);
  };
  
  // 根據滾動位置找到結束索引 - 防護版本
  const findEndIndex = (scrollBottom: number) => {
    // 防護：如果itemPositions為空，直接返回0
    if (itemPositions.length === 0) return 0;
    
    let index = 0;
    // 使用二分查找以提高性能
    let low = 0;
    let high = itemPositions.length - 1;
    
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (itemPositions[mid].top < scrollBottom) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    
    return Math.min(itemPositions.length - 1, low);
  };
  
  // 添加滾動監聽並計算可見項目
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      // 設置為滾動狀態
      setIsScrolling(true);
      
      // 清除之前的超時計時器
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // 設置新的超時計時器，滾動結束後切換狀態
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, scrollingDelay);
      
      // 防護：如果 itemCount 為 0，不進行可見範圍計算
      if (itemCount === 0 || itemPositions.length === 0) {
        setVisibleRange({ start: 0, end: 0 });
        return;
      }
      
      // 計算可見範圍
      const { scrollTop, clientHeight } = container;
      const startIndex = findStartIndex(Math.max(0, scrollTop - 200)); // 向上多渲染一些
      const endIndex = findEndIndex(scrollTop + clientHeight + 200); // 向下多渲染一些
      
      // 確保至少渲染一個項目，並且增加 overscan 範圍
      const start = Math.max(0, startIndex - overscan);
      const end = Math.min(itemCount - 1, endIndex + overscan);
      
      // 更新可見範圍
      setVisibleRange({ start, end });
      
      // 觸發可見項目變化回調
      if (onVisibleItemsChange) {
        onVisibleItemsChange(start, end);
      }
    };
    
    // 初始計算
    handleScroll();
    
    // 添加滾動監聽
    container.addEventListener('scroll', handleScroll);
    
    // 清理函數
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      container.removeEventListener('scroll', handleScroll);
    };
  }, [estimatedItemHeight, itemCount, itemPositions, onVisibleItemsChange, overscan, scrollingDelay]);
  
  // 更新項目的實際高度（可由子組件調用）
  const updateItemHeight = (index: number, height: number) => {
    // 防護：檢查索引是否有效
    if (index < 0 || index >= itemPositions.length) return;
    if (itemPositions[index]?.height === height) return;
    
    // 創建新的位置數組
    const newPositions = [...itemPositions];
    
    // 更新當前項目的高度
    newPositions[index] = { 
      ...newPositions[index], 
      height 
    };
    
    // 更新之後所有項目的 top 位置
    for (let i = index + 1; i < newPositions.length; i++) {
      newPositions[i] = { 
        ...newPositions[i], 
        top: newPositions[i - 1].top + newPositions[i - 1].height 
      };
    }
    
    // 更新位置數據
    setItemPositions(newPositions);
  };
  
  // 計算容器的總高度
  const totalContentHeight = itemPositions.length > 0 
    ? itemPositions[itemPositions.length - 1].top + itemPositions[itemPositions.length - 1].height 
    : 0;
  
  // 計算項目的樣式 - 防護版本
  const getItemStyle = (index: number) => {
    // 防護：檢查索引是否有效
    if (index < 0 || index >= itemPositions.length) {
      return {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        display: 'none' // 如果索引無效，不顯示項目
      } as React.CSSProperties;
    }
    
    return {
      position: 'absolute',
      top: `${itemPositions[index].top}px`,
      left: 0,
      width: '100%',
      height: `${itemPositions[index].height}px`,
    } as React.CSSProperties;
  };
  
  // 渲染可見項目 - 防護版本
  const visibleItems = [];
  const validEndIndex = Math.min(visibleRange.end, itemCount - 1, itemPositions.length - 1);
  
  // 修復循環邏輯，確保 i 是有效的索引並且小於等於 validEndIndex
  if (visibleRange.start <= validEndIndex) {
    for (let i = visibleRange.start; i <= validEndIndex; i++) {
      visibleItems.push(renderItem(i, getItemStyle(i)));
    }
  }
  
  // 處理無內容情況
  if (itemCount === 0) {
    return (
      <div
        ref={containerRef}
        className={`virtual-list-container ${className}`}
        style={{
          position: 'relative',
          height: `${totalHeight}px`,
          overflow: 'auto',
          ...style,
        }}
      >
        <div className="virtual-list-empty" style={{ padding: '20px', textAlign: 'center', color: '#aaa' }}>
          暫無內容
        </div>
      </div>
    );
  }
  
  return (
    <div
      ref={containerRef}
      className={`virtual-list-container ${className}`}
      style={{
        position: 'relative',
        height: `${totalHeight}px`,
        overflow: 'auto',
        ...style,
      }}
    >
      <div 
        className="virtual-list-content"
        style={{ 
          position: 'relative', 
          height: `${Math.max(totalHeight, totalContentHeight)}px`, 
          width: '100%' 
        }}
      >
        {visibleItems}
      </div>
    </div>
  );
}