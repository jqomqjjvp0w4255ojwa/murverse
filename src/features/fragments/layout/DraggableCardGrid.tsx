// DraggableCardGrid.tsx
import React, { useState, useCallback, useMemo, useRef } from 'react'
import { useDragFragment } from './useDragFragment'
import { GridFragment, GridPosition } from '../types/gridTypes'
import { GRID_SIZE } from '../constants'
import { gridToPixel } from './useLayoutFragments'

/**
 * 可拖動卡片網格組件
 * 
 * @param gridFragments 帶位置信息的碎片列表
 * @param onPositionsChange 位置變更回調函數
 */
export default function DraggableCardGrid({ 
  gridFragments,
  onPositionsChange,
}: { 
  gridFragments: GridFragment[],
  onPositionsChange: (positions: Record<string, GridPosition>) => void
}) {
  const [positionsState, setPositionsState] = useState<Record<string, GridPosition>>({})
  const [, forceUpdate] = useState({})
  
  // 強制刷新視圖的函數
  const refresh = useCallback(() => {
    forceUpdate({})
  }, [])
  
  // 處理位置更新
  const handlePositionsChange = useCallback((updater: (prev: Record<string, GridPosition>) => Record<string, GridPosition>) => {
    setPositionsState(prev => {
      const updated = updater(prev)
      onPositionsChange(updated) // 回調通知父組件
      return updated
    })
  }, [onPositionsChange])
  
  // 使用改進後的拖曳 hook
  const { 
    draggingId, 
    dragPosition, 
    handleDragStart, 
    isDragging, 
    isValidDragTarget,
    previewRelocations
  } = useDragFragment(
    gridFragments,
    handlePositionsChange,
    refresh
  )
  
  // 渲染單個卡片
  const renderCard = useCallback((fragment: GridFragment) => {
    // 判斷是否為當前拖曳的碎片
    const isCurrentlyDragging = isDragging(fragment.id)
    
    // 檢查是否有預覽位置
    const previewPosition = previewRelocations[fragment.id]
    
    // 使用預覽位置或原始位置
    const effectivePosition = previewPosition || fragment.position
    
    // 計算像素位置
    const { top, left } = isCurrentlyDragging 
      ? dragPosition 
      : gridToPixel(effectivePosition)
    
    const width = fragment.size.width * GRID_SIZE
    const height = fragment.size.height * GRID_SIZE
    
    // 決定 z-index 值
    const zIndex = isCurrentlyDragging 
      ? 1000 
      : previewPosition 
        ? 50 
        : 1
    
    // 預覽移動的動畫效果
    const transitionStyle = isCurrentlyDragging 
      ? 'none' 
      : previewPosition 
        ? 'all 0.2s ease-out' 
        : 'transform 0.2s, box-shadow 0.2s'
    
    return (
      <div
        key={fragment.id}
        data-fragment-id={fragment.id}
        onClick={() => console.log('點擊卡片:', fragment.id)}
        onMouseDown={(e) => handleDragStart(e, fragment)}
        className={`draggable-card ${isCurrentlyDragging ? 'is-dragging' : ''} ${previewPosition ? 'is-previewing' : ''}`}
        style={{
          position: 'absolute',
          top: `${top}px`,
          left: `${left}px`,
          width: `${width}px`,
          height: `${height}px`,
          padding: '12px',
          backgroundColor: '#fffbef',
          borderRadius: '10px',
          boxShadow: isCurrentlyDragging
            ? '0 12px 28px rgba(0, 0, 0, 0.25)'
            : previewPosition
              ? '0 6px 20px rgba(0, 0, 0, 0.12)'
              : '0 2px 8px rgba(0, 0, 0, 0.06)',
          border: isCurrentlyDragging 
            ? (isValidDragTarget ? '2px solid rgba(0, 200, 0, 0.5)' : '2px solid rgba(255, 0, 0, 0.5)') 
            : previewPosition
              ? '1px solid rgba(50, 120, 200, 0.3)'
              : '1px solid rgba(0, 0, 0, 0.05)',
          cursor: isCurrentlyDragging ? 'grabbing' : 'grab',
          overflow: 'hidden',
          transition: transitionStyle,
          zIndex: zIndex,
          userSelect: 'none',
        }}
      >
        <div style={{ fontSize: `${fragment.fontSize}px` }}>
          {fragment.content.substring(0, 100)}
        </div>
        
        {/* 顯示標籤 */}
        {fragment.tags.length > 0 && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px',
            marginTop: '8px'
          }}>
            {fragment.tags.slice(0, 3).map(tag => (
              <span key={tag} style={{
                backgroundColor: '#f3e8c7',
                color: '#8d6a38',
                borderRadius: '12px',
                padding: '2px 6px',
                fontSize: '10px',
              }}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    )
  }, [draggingId, dragPosition, handleDragStart, isDragging, isValidDragTarget, previewRelocations])
  
  return (
    <div 
      className="grid-container"
      style={{ 
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '600px',
        backgroundColor: '#f9f6e9',
        backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
        backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
      }}
    >
      {gridFragments.map(renderCard)}
    </div>
  )
}