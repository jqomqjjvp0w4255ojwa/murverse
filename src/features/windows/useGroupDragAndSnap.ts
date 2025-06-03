// src/features/windows/useGroupDragAndSnap.ts
'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

interface Position {
  x: number;
  y: number;
}

/**
 * 簡化的拖曳 Hook（移除群組功能）
 * @param {string} id - 窗口唯一標識符
 * @param {React.RefObject<HTMLDivElement>} ref - 窗口DOM引用
 * @returns {Object} - 位置狀態和控制方法
 */
export function useGroupDragAndSnap(id: string, ref: React.RefObject<HTMLDivElement>): {
  pos: Position;
  startDrag: (e: React.MouseEvent | MouseEvent) => void;
  isDragging: boolean;
  setPos: React.Dispatch<React.SetStateAction<Position>>;
} {
  const [pos, setPos] = useState<Position>({ x: 100, y: 100 })
  const [isDragging, setIsDragging] = useState(false)
  const dragOffset = useRef<Position>({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)

  /**
   * 開始拖曳操作
   */
  const startDrag = useCallback((e: React.MouseEvent | MouseEvent): void => {
    if (!ref.current || isDraggingRef.current) return
    
    const rect = ref.current.getBoundingClientRect()
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    
    isDraggingRef.current = true
    setIsDragging(true)
  }, [ref])

  // 處理滑鼠移動和釋放事件
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent): void => {
      if (!isDraggingRef.current) return

      const newX = e.clientX - dragOffset.current.x
      const newY = e.clientY - dragOffset.current.y
      
      setPos({ x: newX, y: newY })
    }

    const handleMouseUp = (): void => {
      if (!isDraggingRef.current) return
      
      isDraggingRef.current = false
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  return { pos, startDrag, isDragging, setPos }
}