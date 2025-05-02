// hooks/useFloatingWindow.ts
import { useRef, useState, useEffect } from 'react'
import { useGroupDragAndSnap } from './useGroupDragAndSnap'
import { useCollapsible } from './useCollapsible'
import { useGroupsStore } from '@/stores/useGroupsStore'
import { useWindowsOverlap } from './useWindowsOverlap'

interface FloatingWindowOptions {
  id: string
  defaultPosition?: { x: number; y: number }
  defaultWidth?: number
  defaultHeight?: number
  onWindowRegistered?: () => void
}

export function useFloatingWindow({
  id,
  defaultPosition = { x: 100, y: 100 },
  defaultWidth = 320,
  defaultHeight = 200,
  onWindowRegistered
}: FloatingWindowOptions) {
  const windowRef = useRef<HTMLDivElement>(null)
  const { pos, startDrag, isDragging, setPos } = useGroupDragAndSnap(id, windowRef as React.RefObject<HTMLDivElement>)
  const { isCollapsed, toggleCollapse } = useCollapsible(id, false)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const hasRegistered = useRef(false)
  const { addWindow, updateWindow, checkAndResolveOverlaps } = useGroupsStore()
  
  // 註冊窗口
  useEffect(() => {
    const el = windowRef.current
    if (!el || hasRegistered.current) return
    
    requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect()
      addWindow({
        id,
        x: rect.left || defaultPosition.x,
        y: rect.top || defaultPosition.y,
        width: rect.width || defaultWidth,
        height: rect.height || defaultHeight
      })
      hasRegistered.current = true
      onWindowRegistered?.()
    })
  }, [id, defaultPosition, defaultWidth, defaultHeight, addWindow, onWindowRegistered])
  
  // 使用重疊檢測
  useWindowsOverlap(id, windowRef as React.RefObject<HTMLElement>)
  
  // 切換全螢幕模式
  const toggleFullScreen = () => {
    const newIsFullScreen = !isFullScreen
    setIsFullScreen(newIsFullScreen)
    
    // 全螢幕時保存位置
    if (newIsFullScreen) {
      sessionStorage.setItem(`${id}_pos`, JSON.stringify({ x: pos.x, y: pos.y }))
      setPos({ x: window.innerWidth * 0.2, y: window.innerHeight * 0.05 })
    } else {
      // 恢復位置
      try {
        const savedPos = sessionStorage.getItem(`${id}_pos`)
        if (savedPos) {
          setPos(JSON.parse(savedPos))
        }
      } catch (e) {
        console.error('無法恢復之前的位置', e)
      }
    }
    
    // 更新窗口大小
    setTimeout(() => {
      if (windowRef.current) {
        const rect = windowRef.current.getBoundingClientRect()
        updateWindow(id, {
          width: rect.width,
          height: rect.height
        })
        checkAndResolveOverlaps()
      }
    }, 300)
  }
  
  // 處理鼠標事件
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    const tag = target.tagName
    
    // 如果是可編輯元素或帶有特定類別的元素就不啟動拖曳
    if (['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(tag) || 
        target.classList.contains('no-drag')) return
    
    // 防止莫名反白問題
    if (window.getSelection()?.toString()) {
      window.getSelection()?.removeAllRanges()
      e.preventDefault()
      e.stopPropagation()
      return
    }
    
    startDrag(e)
  }
  
  // 更新窗口
  useEffect(() => {
    if (!windowRef.current) return
    
    setTimeout(() => {
      const rect = windowRef.current?.getBoundingClientRect()
      if (!rect) return
      
      updateWindow(id, {
        width: rect.width,
        height: rect.height
      })
      
      // 檢查是否在群組中並重新排列
      const groups = useGroupsStore.getState().groups
      const myGroup = groups.find(g => g.memberIds.includes(id))
      
      if (myGroup) {
        useGroupsStore.getState().layoutGroupMembersVertically(myGroup.id)
      }
      
      checkAndResolveOverlaps()
    }, 100)
  }, [id, isCollapsed, isFullScreen, updateWindow, checkAndResolveOverlaps])
  
  return {
    windowRef,
    pos,
    isCollapsed,
    isFullScreen,
    toggleCollapse,
    toggleFullScreen,
    handleMouseDown,
    setPos
  }
}