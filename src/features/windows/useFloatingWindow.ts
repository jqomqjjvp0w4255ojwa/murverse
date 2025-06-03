// src/features/windows/useFloatingWindow.ts

'use client'

import { useRef, useState, useEffect } from 'react'
import { useGroupDragAndSnap } from './useGroupDragAndSnap'

interface FloatingWindowOptions {
  id: string
  defaultPosition?: { x: number; y: number }
  defaultWidth?: number
  defaultHeight?: number
  onWindowRegistered?: () => void
  useTabMode?: boolean // 新增：是否使用 tab 模式
  fullScreenBehavior?: 'jump-to-position' | 'stay-in-place' // 新增：全螢幕行為配置
}

export function useFloatingWindow({
  id,
  defaultPosition = { x: 100, y: 100 },
  defaultWidth = 320,
  defaultHeight = 200,
  onWindowRegistered,
  useTabMode = false, // 默認為 false，保持原有行為
  fullScreenBehavior = 'jump-to-position' // 默認保持原有行為
}: FloatingWindowOptions) {
  
  const windowRef = useRef<HTMLDivElement>(null)
  
  // Tab 模式相關狀態
  const [isTabMode] = useState(useTabMode)
  const [isTabExpanded, setIsTabExpanded] = useState(false)
  const [tabPosition, setTabPosition] = useState<{x: number, y: number} | null>(null)
  
  // 原有的狀態和邏輯
  const { pos, startDrag, isDragging, setPos } = useGroupDragAndSnap(id, windowRef as React.RefObject<HTMLDivElement>)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)
  
  // Tab 模式：監聽 tab 切換事件
  useEffect(() => {
    if (!isTabMode) return
    
    const handleTabToggle = (event: CustomEvent) => {
      const { windowId, isActive, tabPosition: tabPos } = event.detail
      
      if (windowId === id) {
        setIsTabExpanded(isActive)
        setTabPosition(tabPos)
        
        if (isActive && tabPos) {
          // 計算窗口位置：tab 右側 + 一些間距
          const newX = 80 // tab 區域寬度
          const newY = Math.max(50, tabPos.y - 50) // 稍微向上偏移
          setPos({ x: newX, y: newY })
        }
      }
    }
    
    window.addEventListener('tab-toggle', handleTabToggle as EventListener)
    
    return () => {
      window.removeEventListener('tab-toggle', handleTabToggle as EventListener)
    }
  }, [id, isTabMode, setPos])
  
  // 原有的收合功能（非 tab 模式時使用）
  const toggleCollapse = () => {
    if (isTabMode) return // Tab 模式下不使用原有收合邏輯
    
    const newIsCollapsed = !isCollapsed
    setIsCollapsed(newIsCollapsed)
    
    // 保存/恢復收合狀態到 localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(`window-${id}-collapsed`, JSON.stringify(newIsCollapsed))
    }
  }
  
  // 全螢幕切換
  const toggleFullScreen = () => {
    const newIsFullScreen = !isFullScreen
    setIsFullScreen(newIsFullScreen)
    
    if (newIsFullScreen) {
      // 總是保存當前位置
      sessionStorage.setItem(`${id}_pos`, JSON.stringify({ x: pos.x, y: pos.y }))
      
      // 根據配置決定是否改變位置
      if (fullScreenBehavior === 'jump-to-position') {
        if (isTabMode) {
          setPos({ x: 100, y: 50 })
        } else {
          setPos({ x: window.innerWidth * 0.2, y: window.innerHeight * 0.05 })
        }
      }
      // 如果是 'stay-in-place'，就不改變位置
    } else {
      // 退出全螢幕時，根據配置決定是否恢復位置
      if (fullScreenBehavior === 'jump-to-position') {
        try {
          const savedPos = sessionStorage.getItem(`${id}_pos`)
          if (savedPos) {
            setPos(JSON.parse(savedPos))
          }
        } catch (e) {
          console.error('無法恢復之前的位置', e)
        }
      }
    }
  }
  
  // 處理鼠標事件 - 保持原有拖拽功能
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
  
  // 計算窗口可見性
  const isWindowVisible = isTabMode ? isTabExpanded : !isCollapsed
  
  return {
    windowRef,
    pos,
    isCollapsed: isTabMode ? !isTabExpanded : isCollapsed, // Tab 模式下用展開狀態決定
    isFullScreen,
    toggleCollapse: isTabMode ? () => setIsTabExpanded(!isTabExpanded) : toggleCollapse,
    toggleFullScreen,
    handleMouseDown,
    setPos,
    
    // Tab 模式專用屬性
    isTabMode,
    isTabExpanded,
    tabPosition,
    isWindowVisible
  }
}