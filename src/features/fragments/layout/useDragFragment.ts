// src/features/fragments/layout/useDragFragment.ts
// 原始檔案的修改版本 - 修復拖曳視覺反饋與實際放置邏輯不一致的問題

import { useState, useRef, useCallback, useEffect } from 'react'
import { GridFragment, GridPosition, PixelPosition } from '../types/gridTypes'
import { GRID_SIZE, CONTAINER_WIDTH } from '../constants'
import { pixelToGrid, gridToPixel, isGridOccupied } from './useLayoutFragments'
import { findPlacementPosition } from './useLayoutFragments'
import { markGridAsOccupied } from './useLayoutFragments'

/**
 * 碎片拖曳功能 Hook - 強化版本 (修復紅綠邊框反饋問題)
 */
export function useDragFragment(
  gridFragments: GridFragment[],
  setPositions: (updater: (prev: Record<string, GridPosition>) => Record<string, GridPosition>) => void,
  forceRender: () => void = () => {}
) {
  // ... 保留原有的狀態變數 ...
  const latestMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const pendingPositionsRef = useRef<Record<string, GridPosition>>({})
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null)
  const insertTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [dragPosition, setDragPosition] = useState<PixelPosition>({ top: 0, left: 0 })
  const dragStartPosition = useRef<GridPosition | null>(null)
  const dragElementRef = useRef<HTMLDivElement | null>(null)
  const [isDraggingAction, setIsDraggingAction] = useState(false)
  const dragStartMousePosition = useRef<{ x: number, y: number } | null>(null)
  const DRAG_THRESHOLD = 5
  const [isValidTarget, setIsValidTarget] = useState(true)
  const lastRelocateTimeRef = useRef<number>(0)
  const [previewRelocations, setPreviewRelocations] = useState<Record<string, GridPosition>>({})
  const hoverPositionRef = useRef<GridPosition | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const gridCacheRef = useRef<boolean[][]>(Array.from({ length: 200 }, () => Array(200).fill(false)))
  
  // 新增：位置驗證狀態 - 更多的視覺反饋狀態
  const [validationState, setValidationState] = useState<'valid' | 'invalid-but-has-fallback' | 'completely-invalid'>('valid')
  
  // 更新網格碰撞快取 - 修改為更頻繁地更新
  const updateGridCache = useCallback((excludeId: string) => {
    const tempGrid = Array.from({ length: 200 }, () => Array(200).fill(false))
    
    // 將其他卡片標記為已佔用
    gridFragments
      .filter(f => f.id !== excludeId)
      .forEach(f => {
        // 使用預覽位置（如果存在）
        const position = previewRelocations[f.id] || f.position
        markGridAsOccupied(tempGrid, position, f.size)
      })
    
    gridCacheRef.current = tempGrid
    
    return tempGrid // 返回新的網格以便立即使用
  }, [gridFragments, previewRelocations]);
  
  // 驗證位置 - 整合驗證邏輯
  const validatePosition = useCallback((
    targetPosition: GridPosition,
    draggedFragment: GridFragment,
    updateCache = false
  ) => {
    // 更新緩存（如果需要）
    const grid = updateCache ? updateGridCache(draggedFragment.id) : gridCacheRef.current
    
    // 主要位置驗證
    const isTargetValid = !isGridOccupied(grid, targetPosition, draggedFragment.size)
    
    // 判斷特殊情況（0,0）位置
    const isZeroPosition = targetPosition.row === 0 && targetPosition.col === 0
    
    // 檢查是否超出容器寬度
    const isOutOfBounds = targetPosition.col + draggedFragment.size.width > CONTAINER_WIDTH / GRID_SIZE
    
    // 完整驗證結果
    return {
      isValid: isTargetValid && !isZeroPosition && !isOutOfBounds,
      isZeroPosition,
      isOutOfBounds
    }
  }, [updateGridCache]);
  
  // 獲取視覺反饋樣式 - 改進的視覺反饋
  const getVisualFeedbackStyle = useCallback((validationState: 'valid' | 'invalid-but-has-fallback' | 'completely-invalid') => {
    switch(validationState) {
      case 'valid':
        return '2px solid rgba(0, 200, 0, 0.6)' // 綠色邊框（有效位置）
      case 'invalid-but-has-fallback':
        return '2px solid rgba(255, 165, 0, 0.6)' // 橙色邊框（無效但有備用位置）
      case 'completely-invalid':
        return '2px solid rgba(255, 0, 0, 0.6)' // 紅色邊框（完全無效）
      default:
        return '2px solid rgba(0, 0, 0, 0.1)' // 默認邊框
    }
  }, []);

  // 處理拖曳開始 - 保持不變
  const handleDragStart = useCallback((e: React.MouseEvent, fragment: GridFragment) => {
    e.preventDefault()
    e.stopPropagation()
    
    // 獲取元素的實際位置
    const element = e.currentTarget as HTMLElement
    const rect = element.getBoundingClientRect()
    
    // 記錄開始的鼠標位置
    dragStartMousePosition.current = { x: e.clientX, y: e.clientY }
    
    // 計算點擊位置相對於碎片左上角的偏移
    const offsetX = e.clientX - rect.left
    const offsetY = e.clientY - rect.top
    
    // 保存要拖曳的元素引用和基本信息
    dragElementRef.current = element as HTMLDivElement;
    setDraggingId(fragment.id)
    setDragOffset({ x: offsetX, y: offsetY })
    setIsDraggingAction(false)
    setIsValidTarget(true)
    setValidationState('valid') // 初始設為有效
    setPreviewRelocations({})
    
    // 記錄開始拖曳時的網格位置 - 重要的回退點
    dragStartPosition.current = { ...fragment.position }
    
    // 確保初始位置正確
    setDragPosition({ 
      top: e.clientY - offsetY,
      left: e.clientX - offsetX
    })

    // 預先建立網格快取
    updateGridCache(fragment.id)
  }, [updateGridCache]);

  // 處理拖曳中 - 改進的邏輯
  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!draggingId || !dragElementRef.current || !dragStartMousePosition.current) return
    
    // 更新最新滑鼠位置
    latestMouseRef.current = { x: e.clientX, y: e.clientY }
    
    // 計算鼠標移動距離
    const dx = e.clientX - dragStartMousePosition.current.x
    const dy = e.clientY - dragStartMousePosition.current.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    // 如果還沒判定為拖曳動作，檢查是否超過閾值
    if (!isDraggingAction) {
      if (distance > DRAG_THRESHOLD) {
        setIsDraggingAction(true)
        
        // 設置拖曳狀態
        if (dragElementRef.current) {
          dragElementRef.current.style.position = 'fixed'
          dragElementRef.current.style.zIndex = '1000'
          dragElementRef.current.style.pointerEvents = 'none'
          dragElementRef.current.style.transition = 'none'
          dragElementRef.current.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)'
          dragElementRef.current.style.cursor = 'grabbing'
          
          
          // 設置初始拖曳位置
          const initialTop = e.clientY - dragOffset.y
          const initialLeft = e.clientX - dragOffset.x
          
          dragElementRef.current.style.top = `${initialTop}px`
          dragElementRef.current.style.left = `${initialLeft}px`
        }
      } else {
        // 未超過閾值，不執行拖曳
        return
      }
    }
    
    // 使用 requestAnimationFrame 減少更新頻率，提高性能
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    
    animationFrameRef.current = requestAnimationFrame(() => {
      if (!dragElementRef.current) return
      
      // 更新網格緩存 - 在每次位置計算之前更新，以獲得最新的碰撞狀態
      const updatedGrid = updateGridCache(draggingId)
      
      // 計算新的位置，考慮偏移量
      const newTop = e.clientY - dragOffset.y
      const newLeft = e.clientX - dragOffset.x
      
      // 更新元素位置
      dragElementRef.current.style.top = `${newTop}px`
      dragElementRef.current.style.left = `${newLeft}px`
      
      // 更新拖曳位置狀態
      setDragPosition({ top: newTop, left: newLeft })
      
      // 獲取容器的位置，用於計算相對位置
      const container = dragElementRef.current.closest('.fragments-grid-container')
      const containerRect = container?.getBoundingClientRect() || { left: 0, top: 0 }
      
      // 計算相對於容器的位置
      const mouseX = e.clientX
      const mouseY = e.clientY
      const relativeTop = mouseY - containerRect.top + (container?.scrollTop || 0)
      const relativeLeft = mouseX - containerRect.left + (container?.scrollLeft || 0)
      
      // 將像素位置轉換為網格位置
      let targetPosition = pixelToGrid(relativeTop, relativeLeft)
      
      // 嚴格對齊到網格
      targetPosition = {
        row: Math.max(0, Math.round(targetPosition.row)),
        col: Math.max(0, Math.round(targetPosition.col))
      }
      
      // 暫存當前懸停的網格位置
      hoverPositionRef.current = targetPosition
      
      // 獲取被拖曳的碎片
      const draggedFragment = gridFragments.find(f => f.id === draggingId)
      if (!draggedFragment) return
      
      // 使用整合的驗證邏輯進行驗證
      const { isValid } = validatePosition(targetPosition, draggedFragment)
      
      // 檢查原始位置是否有效（作為備用）
      const hasValidFallback = dragStartPosition.current && 
        validatePosition(dragStartPosition.current, draggedFragment).isValid
      
      // 設置適當的驗證狀態
      if (isValid) {
        setValidationState('valid')
        setIsValidTarget(true)
      } else if (hasValidFallback) {
        setValidationState('invalid-but-has-fallback')
        setIsValidTarget(true)   
      } else {
        setValidationState('completely-invalid')
        setIsValidTarget(false)
      }

      
      // 清除之前的預覽計時器
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current)
      }
      
      // 設定新的預覽計時器 - 快速反應
      previewTimerRef.current = setTimeout(() => {
        if (!isValid) {
          // 位置無效時清除預覽
          setPreviewRelocations({})
          return
        }
      
        // 找出附近的碎片（距離拖曳位置2個網格以內的）
        const nearbyFragments = gridFragments.filter(f => {
          if (f.id === draggingId) return false
          
          // 計算拖動碎片與目標位置的距離（考慮碎片尺寸）
          const dragLeft = targetPosition.col
          const dragRight = targetPosition.col + draggedFragment.size.width
          const dragTop = targetPosition.row
          const dragBottom = targetPosition.row + draggedFragment.size.height
          
          const fragLeft = f.position.col
          const fragRight = f.position.col + f.size.width
          const fragTop = f.position.row
          const fragBottom = f.position.row + f.size.height
          
          // 碰撞檢測：兩個矩形是否相交或距離很近
          const horizontalOverlap = 
            (dragLeft <= fragRight && dragRight >= fragLeft) || 
            Math.abs(dragLeft - fragRight) <= 2 || 
            Math.abs(dragRight - fragLeft) <= 2
            
          const verticalOverlap = 
            (dragTop <= fragBottom && dragBottom >= fragTop) || 
            Math.abs(dragTop - fragBottom) <= 2 || 
            Math.abs(dragBottom - fragTop) <= 2
          
          return horizontalOverlap && verticalOverlap
        })
        
        if (nearbyFragments.length === 0) {
          // 沒有附近碎片，清除預覽
          setPreviewRelocations({})
          return
        }
        
        // 建立一個預覽用的網格
        const previewGrid = Array.from({ length: 200 }, () => Array(200).fill(false))
        
        // 先標記拖曳碎片的目標位置
        markGridAsOccupied(previewGrid, targetPosition, draggedFragment.size)
        
        // 對附近的碎片計算新位置
        const relocations: Record<string, GridPosition> = {}
        
        // 按照距離排序，越近的先重定位
        nearbyFragments.sort((a, b) => {
          const distA = Math.abs(a.position.col - targetPosition.col) + Math.abs(a.position.row - targetPosition.row)
          const distB = Math.abs(b.position.col - targetPosition.col) + Math.abs(b.position.row - targetPosition.row)
          return distA - distB
        })
        
        // 加強退開算法
        const computeShiftDirection = (fragment: GridFragment, target: GridPosition) => {
          // 計算拖動碎片的邊界
          const dragLeft = target.col
          const dragRight = target.col + draggedFragment.size.width
          const dragTop = target.row
          const dragBottom = target.row + draggedFragment.size.height
          
          // 計算當前碎片的邊界
          const fragLeft = fragment.position.col
          const fragRight = fragment.position.col + fragment.size.width
          const fragTop = fragment.position.row
          const fragBottom = fragment.position.row + fragment.size.height
          
          // 計算四個方向的位移量
          const shiftLeft = fragLeft - dragRight - 1 // 向左位移
          const shiftRight = dragLeft - fragRight - 1 // 向右位移
          const shiftUp = fragTop - dragBottom - 1 // 向上位移
          const shiftDown = dragTop - fragBottom - 1 // 向下位移
          
          // 找出最小位移方向
          const shifts = [
            { dir: 'left', value: Math.abs(shiftLeft), pos: { row: fragment.position.row, col: fragment.position.col + shiftLeft } },
            { dir: 'right', value: Math.abs(shiftRight), pos: { row: fragment.position.row, col: fragment.position.col + shiftRight } },
            { dir: 'up', value: Math.abs(shiftUp), pos: { row: fragment.position.row + shiftUp, col: fragment.position.col } },
            { dir: 'down', value: Math.abs(shiftDown), pos: { row: fragment.position.row + shiftDown, col: fragment.position.col } }
          ].filter(s => s.value > 0).sort((a, b) => a.value - b.value)
          
          // 嘗試每個方向，找到第一個有效的
          for (const shift of shifts) {
            // 確保不會位移到容器外
            if (shift.pos.col < 0 || shift.pos.row < 0) continue
            
            // 檢查是否與其他碎片衝突
            if (!isGridOccupied(previewGrid, shift.pos, fragment.size)) {
              return shift.pos
            }
          }
          
          // 找不到有效方向時嘗試整體退開
          return findPlacementPosition(previewGrid, fragment.size)
        }
        
        for (const fragment of nearbyFragments) {
          // 檢查當前位置是否被拖曳碎片佔用
          if (isGridOccupied(previewGrid, fragment.position, fragment.size)) {
            // 計算退開方向
            const newPosition = computeShiftDirection(fragment, targetPosition)
            
            if (newPosition) {
              // 標記為已佔用
              markGridAsOccupied(previewGrid, newPosition, fragment.size)
              relocations[fragment.id] = newPosition
            }
          } else {
            // 當前位置未被佔用，保持不變
            markGridAsOccupied(previewGrid, fragment.position, fragment.size)
          }
        }
        
        // 更新預覽退開效果
        setPreviewRelocations(relocations)
      }, 50)
      
      // 實際插入處理 - 延遲執行
      if (insertTimerRef.current) {
        clearTimeout(insertTimerRef.current)
      }
      
      // 確保拖曳位置停留一段時間才觸發插入
      insertTimerRef.current = setTimeout(() => {
        const now = Date.now()
        
        // 如果兩次插入之間的時間太短，跳過此次插入
        if (now - lastRelocateTimeRef.current < 300) return
        
        // 獲取最新的懸停位置
        const delayedTargetPos = hoverPositionRef.current
        if (!delayedTargetPos) return
        
        const dragged = gridFragments.find(f => f.id === draggingId)
        if (!dragged) return
        
        // 重新檢查碰撞 (可能有變化)
        updateGridCache(draggingId)
        
        // 使用整合的驗證邏輯
        const { isValid } = validatePosition(delayedTargetPos, dragged, true)
        if (!isValid) return
        
        // 找出需要重新定位的附近碎片
        const neighbors = gridFragments.filter(f => {
          if (f.id === draggingId) return false
          
          // 計算距離
          const dragLeft = delayedTargetPos.col
          const dragRight = delayedTargetPos.col + dragged.size.width
          const dragTop = delayedTargetPos.row
          const dragBottom = delayedTargetPos.row + dragged.size.height
          
          const fragLeft = f.position.col
          const fragRight = f.position.col + f.size.width
          const fragTop = f.position.row
          const fragBottom = f.position.row + f.size.height
          
          // 增強的碰撞檢測
          const horizontalOverlap = 
            (dragLeft <= fragRight && dragRight >= fragLeft) || 
            Math.abs(dragLeft - fragRight) <= 2 || 
            Math.abs(dragRight - fragLeft) <= 2
            
          const verticalOverlap = 
            (dragTop <= fragBottom && dragBottom >= fragTop) || 
            Math.abs(dragTop - fragBottom) <= 2 || 
            Math.abs(dragBottom - fragTop) <= 2
          
          return horizontalOverlap && verticalOverlap
        })
        
        // 創建新的網格用於放置
        const gridForPlacement = Array.from({ length: 200 }, () => Array(200).fill(false))
        
        // 先標記拖曳的碎片位置
        markGridAsOccupied(gridForPlacement, delayedTargetPos, dragged.size)
        
        // 重新定位周圍的碎片
        const relocated: Record<string, GridPosition> = {}
        
        // 按照距離排序，越近的先移動
        neighbors.sort((a, b) => {
          const distA = Math.abs(a.position.col - delayedTargetPos.col) + Math.abs(a.position.row - delayedTargetPos.row)
          const distB = Math.abs(b.position.col - delayedTargetPos.col) + Math.abs(b.position.row - delayedTargetPos.row)
          return distA - distB
        })
        
        // 增強退開算法
        const calculateOptimalPosition = (fragment: GridFragment) => {
          // 計算拖動碎片的邊界
          const dragLeft = delayedTargetPos.col
          const dragRight = delayedTargetPos.col + dragged.size.width
          const dragTop = delayedTargetPos.row
          const dragBottom = delayedTargetPos.row + dragged.size.height
          
          // 計算當前碎片的邊界
          const fragLeft = fragment.position.col
          const fragRight = fragment.position.col + fragment.size.width
          const fragTop = fragment.position.row
          const fragBottom = fragment.position.row + fragment.size.height
          
          // 計算四個方向的位移量
          const shiftLeft = fragLeft - dragRight - 1 // 向左位移
          const shiftRight = dragLeft - fragRight - 1 // 向右位移
          const shiftUp = fragTop - dragBottom - 1 // 向上位移
          const shiftDown = dragTop - fragBottom - 1 // 向下位移
          
          // 找出最小位移方向
          const shifts = [
            { dir: 'left', value: Math.abs(shiftLeft), pos: { row: fragment.position.row, col: fragment.position.col + shiftLeft } },
            { dir: 'right', value: Math.abs(shiftRight), pos: { row: fragment.position.row, col: fragment.position.col + shiftRight } },
            { dir: 'up', value: Math.abs(shiftUp), pos: { row: fragment.position.row + shiftUp, col: fragment.position.col } },
            { dir: 'down', value: Math.abs(shiftDown), pos: { row: fragment.position.row + shiftDown, col: fragment.position.col } }
          ].filter(s => s.value > 0).sort((a, b) => a.value - b.value)
          
          // 嘗試每個方向，找到第一個有效的
          for (const shift of shifts) {
            // 確保不會位移到容器外
            if (shift.pos.col < 0 || shift.pos.row < 0) continue
            
            // 檢查是否與其他碎片衝突
            if (!isGridOccupied(gridForPlacement, shift.pos, fragment.size)) {
              return shift.pos
            }
          }
          
          // 找不到有效方向時嘗試整體退開
          return findPlacementPosition(gridForPlacement, fragment.size)
        }
        
        for (const f of neighbors) {
          // 檢查當前位置是否與拖曳碎片衝突
          if (isGridOccupied(gridForPlacement, f.position, f.size)) {
            // 尋找優化的退開位置
            const newPos = calculateOptimalPosition(f)
            
            if (newPos) {
              // 標記新位置
              markGridAsOccupied(gridForPlacement, newPos, f.size)
              relocated[f.id] = newPos
            } else {
              // 無法找到新位置，保持原位
              markGridAsOccupied(gridForPlacement, f.position, f.size)
              relocated[f.id] = f.position
            }
          } else {
            // 不衝突，保持原位
            markGridAsOccupied(gridForPlacement, f.position, f.size)
          }
        }
        
        // 有變化才更新位置
        if (Object.keys(relocated).length > 0) {
          pendingPositionsRef.current = {
            ...pendingPositionsRef.current,
            [draggingId]: delayedTargetPos,
            ...relocated,
          }
          
          setPositions(prev => ({
            ...prev,
            [draggingId]: delayedTargetPos,
            ...relocated,
          }))
          
          // 記錄最後一次退開時間
          lastRelocateTimeRef.current = now
          
          // 更新UI
          forceRender()
        }
      }, 250)
    })
  }, [draggingId, dragOffset, isDraggingAction, gridFragments, setPositions, forceRender, updateGridCache, validationState, getVisualFeedbackStyle, validatePosition]);
  
  // 處理拖曳結束 - 改進的邏輯
  const handleDragEnd = useCallback(() => {
    // 清除所有計時器和動畫幀
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
    if (insertTimerRef.current) clearTimeout(insertTimerRef.current)
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    
    // 清除預覽效果
    setPreviewRelocations({})
    
    if (!draggingId || !dragStartPosition.current || !dragElementRef.current) {
      if (dragElementRef.current) resetDragState(dragElementRef.current)
      setDraggingId(null)
      setIsDraggingAction(false)
      dragStartMousePosition.current = null
      return
    }
    
    const draggedElement = dragElementRef.current
    
    // 如果只是點擊（沒移動過閾值），不執行任何更新
    if (!isDraggingAction) {
      resetDragState(draggedElement)
      setDraggingId(null)
      setIsDraggingAction(false)
      dragStartMousePosition.current = null
      return
    }
    
    try {
      const container = draggedElement.closest('.fragments-grid-container')
      const containerRect = container?.getBoundingClientRect() || { left: 0, top: 0 }
      
      const relativeTop = dragPosition.top - containerRect.top + (container?.scrollTop || 0)
      const relativeLeft = dragPosition.left - containerRect.left + (container?.scrollLeft || 0)
      
      let targetPosition = pixelToGrid(relativeTop, relativeLeft)
      targetPosition = {
        row: Math.max(0, Math.round(targetPosition.row)),
        col: Math.max(0, Math.round(targetPosition.col)),
      }
      
      const draggedFragment = gridFragments.find(f => f.id === draggingId)
      if (!draggedFragment) {
        console.warn('找不到被拖曳的碎片')
        return
      }
      
      // 最終更新網格快取並進行驗證
      updateGridCache(draggingId)
      
      // 使用整合的驗證邏輯
      const { isValid: isTargetValid } = validatePosition(targetPosition, draggedFragment, true)
      const { isValid: isOriginalValid } = validatePosition(dragStartPosition.current, draggedFragment, false)
      
      let finalPosition: GridPosition | null = null
      
      if (isTargetValid) {
        finalPosition = targetPosition
        console.log('✅ 拖曳成功，使用新位置:', finalPosition)
      } else if (isOriginalValid) {
        finalPosition = dragStartPosition.current
        console.warn('⚠️ 拖曳目標無效，回退至原始位置:', finalPosition)
      } else {
        // 找其他空位
        const alternativePosition = findPlacementPosition(gridCacheRef.current, draggedFragment.size)
        
        if (alternativePosition) {
          finalPosition = alternativePosition
          console.warn('❗ 原始位置也無效，使用其他空位:', finalPosition)
        } else {
          console.error('🚫 完全無法放置，略過位置更新')
          finalPosition = null
        }
      }
      
      if (finalPosition) {
        // 額外檢查避免 (0,0) 位置
        if (finalPosition?.row === 0 && finalPosition?.col === 0) {
          console.warn(`⚠️ [DragEnd] 碎片 ${draggingId} 最終位置為 (0,0)！`)
          // 找尋替代位置
          const safePosition = {
            row: Math.max(1, finalPosition.row),
            col: Math.max(1, finalPosition.col)
          }
          
          // 再次驗證替代位置
          const { isValid: isSafeValid } = validatePosition(safePosition, draggedFragment, true)
          if (isSafeValid) {
            finalPosition = safePosition
          } else {
            // 尋找新的有效位置
            const newSafePosition = findPlacementPosition(gridCacheRef.current, draggedFragment.size)
            if (newSafePosition && !(newSafePosition.row === 0 && newSafePosition.col === 0)) {
              finalPosition = newSafePosition
            }
          }
        }
        
        // 儲存最終位置
        const allUpdates = {
          ...pendingPositionsRef.current,
          [draggingId]: finalPosition
        }
        
        setPositions(prev => ({ ...prev, ...allUpdates }))
        
        // 立即應用新位置樣式
        const { top: pxTop, left: pxLeft } = gridToPixel(finalPosition)
        draggedElement.style.top = `${pxTop}px`
        draggedElement.style.left = `${pxLeft}px`
      } else if (dragStartPosition.current) {
        // 還原至原始位置
        const { top, left } = gridToPixel(dragStartPosition.current)
        draggedElement.style.top = `${top}px`
        draggedElement.style.left = `${left}px`
      }
    } catch (error) {
      console.error('拖曳結束錯誤:', error)
    } finally {
      resetDragState(draggedElement)
      setDraggingId(null)
      setIsDraggingAction(false)
      dragStartMousePosition.current = null
      setIsValidTarget(true)
      setValidationState('valid')
      // 清空預覽效果
      setPreviewRelocations({})
      // 清空快取
      pendingPositionsRef.current = {}
    }
    
    forceRender()
  }, [draggingId, dragPosition, gridFragments, setPositions, forceRender, updateGridCache, validatePosition]);
  
  // 重置拖曳狀態
  const resetDragState = (element: HTMLElement) => {
    if (!element) return
    
    element.style.position = 'absolute'
    element.style.pointerEvents = ''
    element.style.transition = 'transform 0.3s, box-shadow 0.3s'
    element.style.transform = ''
    element.style.boxShadow = ''
    element.style.cursor = 'grab'
    element.style.border = '1px solid rgba(0, 0, 0, 0.05)'
    element.style.zIndex = ''
  }
  
  // 設置全局滑鼠事件監聽
  useEffect(() => {
    window.addEventListener('mousemove', handleDragMove)
    window.addEventListener('mouseup', handleDragEnd)
    // 處理拖曳到視窗外的情況
    window.addEventListener('mouseleave', handleDragEnd)
    
    return () => {
      window.removeEventListener('mousemove', handleDragMove)
      window.removeEventListener('mouseup', handleDragEnd)
      window.removeEventListener('mouseleave', handleDragEnd)
      // 清理計時器
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
      if (insertTimerRef.current) clearTimeout(insertTimerRef.current)
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [handleDragMove, handleDragEnd]);
  
  return {
    draggingId,
    dragPosition,
    handleDragStart,
    isValidDragTarget: isValidTarget,
    isDragging: (id: string) => draggingId === id && isDraggingAction,
    previewRelocations,
    validationState
  }
}