// components/ui/FloatingWindow.tsx
import React, { ReactNode } from 'react'
import { useFloatingWindow } from '@/hooks/useFloatingWindow'

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
  } = useFloatingWindow({
    id,
    defaultPosition,
    defaultWidth: defaultSize.width,
    defaultHeight: defaultSize.height
  })
  
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