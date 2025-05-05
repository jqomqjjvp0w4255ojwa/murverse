'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { useGroupsStore } from '@/features/windows/useGroupsStore'
import { useDragStore } from '@/features/interaction/useDragStore'
import { 
  getDistance, 
  isRectOverlap, 
  isTooFarFromGroup, 
  GROUP_DISTANCE_THRESHOLD 
} from '@/features/windows/groupUtils'

// 設定閾值常數
const PROXIMITY_THRESHOLD = GROUP_DISTANCE_THRESHOLD * 0.3 
const SEPARATION_THRESHOLD = GROUP_DISTANCE_THRESHOLD * 0.4 
const CHECK_THROTTLE_MS = 100 

interface Position {
  x: number;
  y: number;
}

/**
 * 群組拖曳與自動吸附 Hook
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
  const lastCheckTime = useRef(0)

  // 從 store 獲取必要的方法
  const {
    windows,
    updateWindow,
    createGroup,
    removeWindowFromGroup,
    groups,
    checkAndResolveOverlaps
  } = useGroupsStore()
  
  const { setDraggingWindowId } = useDragStore()

  /**
   * 獲取元素 DOM 矩形的工具函數
   */
  const getElementRect = useCallback((elementId: string): DOMRect | null => {
    const element = document.getElementById(elementId)
    return element ? element.getBoundingClientRect() : null
  }, [])

  /**
   * 檢查是否需要從群組中移除窗口
   */
  const checkGroupRemoval = useCallback((): void => {
    const myRect = getElementRect(id)
    if (!myRect) return
    
    const { checkAndRemoveFromGroup } = useGroupsStore.getState()
    
    checkAndRemoveFromGroup(id)
    
    const myGroup = groups.find(g => g.memberIds.includes(id))
    if (!myGroup) return
    
    const otherRects = myGroup.memberIds
      .filter(memberId => memberId !== id)
      .map(getElementRect)
      .filter((rect): rect is DOMRect => rect !== null)
    
    if (otherRects.length === 0) return
    

  }, [id, groups, getElementRect, removeWindowFromGroup])

  /**
   * 處理特殊窗口的群組關係 (tags-floating-window 和 floating-input-bar)
   */
  const handleSpecialWindows = useCallback((): void => {
    if (id !== 'tags-floating-window' && id !== 'floating-input-bar') return
    
    const otherId = id === 'tags-floating-window' ? 'floating-input-bar' : 'tags-floating-window'
    
    const myRect = getElementRect(id)
    const otherRect = getElementRect(otherId)
    
    if (!myRect || !otherRect) return
    
    const alreadyGrouped = groups.some(g => 
      g.memberIds.includes(id) && g.memberIds.includes(otherId)
    )
    
    if (alreadyGrouped) return
    
    const distance = getDistance(myRect, otherRect)
    const isOverlapping = isRectOverlap(myRect, otherRect, 20)
    
    if (distance < PROXIMITY_THRESHOLD || isOverlapping) {
      try {
        const store = useGroupsStore.getState()
        store.createGroup([id, otherId])
      } catch (err) {
        console.warn(`特殊群組創建失敗:`, err)
      }
    }
  }, [id, groups, getElementRect])

  /**
   * 檢查窗口間的鄰近狀態並處理群組
   */
  const checkProximity = useCallback((): void => {
    const now = Date.now()
    if (now - lastCheckTime.current < CHECK_THROTTLE_MS) return
    lastCheckTime.current = now
    
    if (!document.getElementById(id)) return
    
    const myRect = getElementRect(id)
    if (!myRect) return
    
    checkGroupRemoval()
    handleSpecialWindows()

    if (windows.length < 2) return

    for (const w of windows) {
      if (w.id === id) continue

      const otherRect = getElementRect(w.id)
      if (!otherRect) continue

      const alreadyGrouped = groups.some(
        g => g.memberIds.includes(id) && g.memberIds.includes(w.id)
      )
      
      if (alreadyGrouped) continue

      const isClose = getDistance(myRect, otherRect) < PROXIMITY_THRESHOLD
      const isOverlapping = isRectOverlap(myRect, otherRect, 20)

      if (isClose || isOverlapping) {
        try {
          createGroup([id, w.id])
          return
        } catch (err) {
          console.warn(`群組創建失敗:`, err)
        }
      }
    }
  }, [id, windows, groups, createGroup, getElementRect, checkGroupRemoval, handleSpecialWindows])

  /**
   * 開始拖曳操作
   */
  const startDrag = useCallback((e: React.MouseEvent | MouseEvent): void => {
    if (!ref.current || isDraggingRef.current) return
    
    const rect = ref.current.getBoundingClientRect()
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    
    isDraggingRef.current = true
    setIsDragging(true)
    setDraggingWindowId(id)
    
    checkProximity()
  }, [ref, id, setDraggingWindowId, checkProximity])

  // 拖曳中的定期群組檢查
  useEffect(() => {
    let checkInterval: NodeJS.Timeout | null = null
    
    if (isDragging) {
      checkInterval = setInterval(checkProximity, CHECK_THROTTLE_MS)
    }
    
    return () => {
      if (checkInterval) clearInterval(checkInterval)
    }
  }, [isDragging, checkProximity])

  // 處理滑鼠移動和釋放事件
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent): void => {
      if (!isDraggingRef.current || !ref.current) return

      const newX = e.clientX - dragOffset.current.x
      const newY = e.clientY - dragOffset.current.y
      
      setPos({ x: newX, y: newY })

      const rect = ref.current.getBoundingClientRect()
      updateWindow(id, {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      })
      
      const now = Date.now()
      if (now - lastCheckTime.current > CHECK_THROTTLE_MS) {
        checkProximity()
      }
    }

    const handleMouseUp = (): void => {
      if (!isDraggingRef.current) return
      
      isDraggingRef.current = false
      setIsDragging(false)
      
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect()
        updateWindow(id, { x: rect.left, y: rect.top })
      }
      
      setTimeout(() => {
        handleSpecialWindows();
        checkGroupRemoval();
        
        const myRect = getElementRect(id)
        if (myRect) {
          let overlappedWindowId: string | null = null;
          
          for (const w of windows) {
            if (w.id === id) continue
            
            const otherRect = getElementRect(w.id)
            if (!otherRect) continue
            
            if (isRectOverlap(myRect, otherRect, 20)) {
              overlappedWindowId = w.id
              break
            }
          }
          
          if (overlappedWindowId) {
            const alreadyGrouped = groups.some(
              g => g.memberIds.includes(id) && g.memberIds.includes(overlappedWindowId!)
            )
            
            if (!alreadyGrouped) {
              createGroup([id, overlappedWindowId])
            }
          }
        }
        
        // 检查并解决所有窗口重叠
        checkAndResolveOverlaps();
        
        setDraggingWindowId(null)
      }, 50)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [
    id, 
    ref, 
    updateWindow, 
    createGroup, 
    groups, 
    checkProximity, 
    windows, 
    getElementRect,
    checkGroupRemoval,
    handleSpecialWindows,
    setDraggingWindowId,
    checkAndResolveOverlaps
  ])

  return { pos, startDrag, isDragging, setPos }
}