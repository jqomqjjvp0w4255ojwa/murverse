import { useState, useRef, useCallback, useEffect } from 'react'
import { Fragment } from '@/features/fragments/types/fragment'
import { 
  GridFragment, 
  GridPosition, 
  pixelToGrid, 
  gridToPixel, 
  isGridOccupied
} from '@/features/fragments/layout/useLayoutFragments'

// 拖曳功能 Hook
export function useDragFragment(
  gridFragments: GridFragment[],
  setPositions: (updater: (prev: Record<string, GridPosition>) => Record<string, GridPosition>) => void
) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [dragPosition, setDragPosition] = useState({ top: 0, left: 0 })
  const dragStartPosition = useRef<GridPosition | null>(null)
  const dragElementRef = useRef<HTMLDivElement | null>(null)

  // 找到與 ID 匹配的碎片元素
  const findFragmentElement = (id: string): HTMLElement | null => {
    return document.querySelector(`[data-fragment-id="${id}"]`);
  }

  // 處理拖曳開始
  const handleDragStart = useCallback((e: React.MouseEvent, fragment: GridFragment) => {
    e.preventDefault()
    e.stopPropagation()
    
    // 計算點擊位置相對於卡片左上角的偏移
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const offsetX = e.clientX - rect.left
    const offsetY = e.clientY - rect.top
    
    // 保存要拖曳的元素引用
    dragElementRef.current = e.currentTarget as HTMLDivElement
    
    setDraggingId(fragment.id)
    setDragOffset({ x: offsetX, y: offsetY })
    
    // 設置初始拖曳位置
    const { top, left } = gridToPixel(fragment.position)
    setDragPosition({ top, left })
    
    // 記錄開始拖曳時的網格位置
    dragStartPosition.current = fragment.position
    
    // 調整要拖曳的元素的樣式
    const el = dragElementRef.current
    if (el) {
      el.style.position = 'fixed'
      el.style.zIndex = '1000'
      el.style.pointerEvents = 'none'
      el.style.transition = 'none'
      el.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)'
      
      // 調整元素位置跟隨鼠標
      moveAt(e.clientX, e.clientY, el)
    }
  }, []);
  
  // 移動元素到指定的鼠標位置
  const moveAt = (clientX: number, clientY: number, element: HTMLElement) => {
    const left = clientX - dragOffset.x
    const top = clientY - dragOffset.y
    
    // 更新元素位置 - 使用 transform 而不是 left/top 以獲得更好的性能
    element.style.transform = `translate(${left}px, ${top}px)`
    
    // 更新拖曳位置
    setDragPosition({ top, left })
  }

  // 處理拖曳中
  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!draggingId || !dragElementRef.current) return
    
    // 移動拖曳元素以跟隨鼠標
    moveAt(e.clientX, e.clientY, dragElementRef.current)
  }, [draggingId, dragOffset]);
  
  // 處理拖曳結束
  const handleDragEnd = useCallback(() => {
    if (!draggingId || !dragStartPosition.current || !dragElementRef.current) {
      setDraggingId(null)
      return
    }
    
    // 獲取目標元素
    const draggedElement = dragElementRef.current
    
    // 將拖曳後的像素位置轉換為網格位置
    const newGridPosition = pixelToGrid(dragPosition.top, dragPosition.left)
    
    // 檢查新位置是否有效（不與其他碎片重疊）
    const draggedFragment = gridFragments.find(f => f.id === draggingId)
    if (!draggedFragment) {
      setDraggingId(null)
      
      // 恢復元素樣式
      draggedElement.style.position = 'absolute'
      draggedElement.style.zIndex = ''
      draggedElement.style.pointerEvents = ''
      draggedElement.style.transition = ''
      draggedElement.style.transform = ''
      draggedElement.style.boxShadow = ''
      
      dragElementRef.current = null
      return
    }
    
    // 創建一個臨時網格來檢查新位置是否可用
    const rows = 100
    const cols = 100
    const tempGrid: boolean[][] = Array(rows).fill(0).map(() => Array(cols).fill(false))
    
    // 將所有碎片標記為已佔用，除了正在拖曳的碎片
    gridFragments.forEach(frag => {
      if (frag.id !== draggingId) {
        for (let r = frag.position.row; r < frag.position.row + frag.size.height; r++) {
          for (let c = frag.position.col; c < frag.position.col + frag.size.width; c++) {
            if (r < rows && c < cols) {
              tempGrid[r][c] = true // 標記為已佔用
            }
          }
        }
      }
    })
    
    // 檢查新位置是否可用
    if (!isGridOccupied(tempGrid, newGridPosition, draggedFragment.size)) {
      // 更新位置記錄
      setPositions(prev => ({
        ...prev,
        [draggingId]: newGridPosition
      }))
    }
    
    // 恢復元素樣式
    draggedElement.style.position = 'absolute'
    draggedElement.style.zIndex = ''
    draggedElement.style.pointerEvents = ''
    draggedElement.style.transition = ''
    draggedElement.style.transform = ''
    draggedElement.style.boxShadow = ''
    
    setDraggingId(null)
    dragElementRef.current = null
  }, [draggingId, dragPosition, gridFragments, setPositions]);

  // 設置全局滑鼠事件監聽
  useEffect(() => {
    window.addEventListener('mousemove', handleDragMove)
    window.addEventListener('mouseup', handleDragEnd)
    
    return () => {
      window.removeEventListener('mousemove', handleDragMove)
      window.removeEventListener('mouseup', handleDragEnd)
    }
  }, [handleDragMove, handleDragEnd]);

  return {
    draggingId,
    dragPosition,
    handleDragStart,
    isDragging: (id: string) => draggingId === id
  }
}