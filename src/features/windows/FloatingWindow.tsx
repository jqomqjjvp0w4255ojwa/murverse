// components/ui/FloatingWindow.tsx
/**
 * FloatingWindow.tsx
 *
 * 📌 用途說明：
 * 這是一個可重用的「浮動視窗元件」，用於建立可拖曳、可收合、可全螢幕的浮動 UI 視窗。
 * 提供彈性 API 傳入內容區塊（children）、自定義標頭（header）與初始位置與尺寸設定。
 *
 * 🧩 功能包含：
 * - 拖曳移動：使用者可在畫面上自由拖曳視窗。
 * - 收合 / 展開：可縮小視窗只顯示標題列。
 * - 全螢幕切換：一鍵切換視窗至 80% 畫面寬高。
 * - 視窗關閉：提供可選擇的 onClose callback。
 * - 動態尺寸 / 位置：可設定預設位置與尺寸，也可限制最小寬高。
 *
 * ✅ 使用場景範例：
 * - 標籤管理視窗（如 TagsFloatingWindow）
 * - 輸入表單視窗（如 FloatingInputBar）
 * - 任意模組化工具或浮動介面
 *
 * 依賴 hook：
 * - useFloatingWindow（提供視窗狀態與互動邏輯）
 */


import React, { ReactNode, useEffect, useRef } from 'react'
import { useFloatingWindow } from '@/features/windows/useFloatingWindow'
import { useGroupsStore } from '@/features/windows/useGroupsStore'


interface FloatingWindowProps {
  id: string
  defaultPosition?: { x: number; y: number }
  defaultSize?: { width: number; height: number }
  children: ReactNode
  header?: ReactNode
  onClose?: () => void
  className?: string
  minHeight?: number
  minWidth?: number
}

export default function FloatingWindow({
  id,
  defaultPosition = { x: 100, y: 100 },
  defaultSize = { width: 320, height: 200 },
  children,
  header,
  onClose,
  className = '',
  minHeight = 50,
  minWidth = 200
}: FloatingWindowProps) {
  const {
    windowRef,
    pos,
    isCollapsed,
    isFullScreen,
    toggleCollapse,
    toggleFullScreen,
    handleMouseDown
  } = useFloatingWindow({ id, defaultPosition, defaultWidth: defaultSize.width, defaultHeight: defaultSize.height })

  const { addWindow, updateWindow, checkAndResolveOverlaps } = useGroupsStore()
  const hasRegistered = useRef(false)

  /* 首次掛載時註冊 */
  useEffect(() => {
    const el = windowRef.current
    if (!el || hasRegistered.current) return
    requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect()
      addWindow({
        id,
        x: rect.left,
        y: rect.top,
        width: rect.width ?? defaultSize.width,
        height: rect.height ?? defaultSize.height
      })
      hasRegistered.current = true
    })
  }, [addWindow, id, defaultSize])

  /* 尺寸 / 收合 / 全螢幕 變化時更新 */
  useEffect(() => {
    if (!windowRef.current) return
    const timer = setTimeout(() => {
      const rect = windowRef.current!.getBoundingClientRect()
      updateWindow(id, { width: rect.width, height: rect.height })
      checkAndResolveOverlaps()
    }, 100)
    return () => clearTimeout(timer)
  }, [isCollapsed, isFullScreen, updateWindow, checkAndResolveOverlaps, id])

  /* 拖曳位置改變時更新（可選） */
  useEffect(() => {
    updateWindow(id, { x: pos.x, y: pos.y })
  }, [pos.x, pos.y, id, updateWindow])
  
  return (
    <div
      id={id}
      ref={windowRef}
      onMouseDown={handleMouseDown}
      onDragStart={e => e.preventDefault()}
      className={`fixed z-[20] bg-white border border-gray-400 rounded-2xl shadow-lg select-none 
        ${isCollapsed ? 'p-2' : 'p-4'} ${className}`}
      style={{
        top: isFullScreen ? 0 : pos.y,
        left: pos.x,
        width: isFullScreen ? '80vw' : defaultSize.width,
        height: isFullScreen ? '90vh' : (isCollapsed ? minHeight : 'auto'),
        minWidth: minWidth,
        transition: 'width 0.3s, height 0.3s',
      }}
    >
      {/* 窗口頭部 */}
      <div className="flex justify-between items-center mb-3 cursor-move">
        {header || <div className="text-lg font-bold">{id}</div>}
        
        <div className="flex gap-2 items-center">
          {!isCollapsed && onClose && (
            <button
              onClick={onClose}
              className="text-sm px-2 py-1 text-gray-600 hover:text-black"
              title="關閉"
            >
              ×
            </button>
          )}
          
          <button
            onClick={toggleCollapse}
            className="text-sm px-2 py-1 text-gray-600 hover:text-black"
            title={isCollapsed ? "展開" : "收合"}
          >
            {isCollapsed ? "+" : "−"}
          </button>
          
          {!isCollapsed && (
            <button 
              onClick={toggleFullScreen} 
              className="text-sm px-2 py-1 text-gray-600 hover:text-black"
              title={isFullScreen ? "退出全屏" : "全屏模式"}
            >
              {isFullScreen ? "⤓" : "⤢"}
            </button>
          )}
        </div>
      </div>
      
      {/* 內容區域，根據收合狀態顯示或隱藏 */}
      {!isCollapsed && children}
    </div>
  )
}