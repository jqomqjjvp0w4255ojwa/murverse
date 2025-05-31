'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useTagDragManager } from '@/features/fragments/layout/useTagDragManager'
import { TagsService } from '@/features/tags/services/TagsService'

interface DragToDeleteZoneProps {
  // 可以添加自定義屬性，例如位置
  position?: 'bottom-right' | 'top-right' | 'custom'
  customPosition?: { top?: string; right?: string; bottom?: string; left?: string }
}

const DragToDeleteZone: React.FC<DragToDeleteZoneProps> = ({
  position = 'bottom-right',
  customPosition
}) => {
  const { draggingTag, isDragging } = useTagDragManager()
  const zoneRef = useRef<HTMLDivElement>(null)
  const [isOver, setIsOver] = useState(false)
  const [deleteConfirmed, setDeleteConfirmed] = useState(false)
  
  // 只在拖曳標籤時顯示
  if (!isDragging || !draggingTag) return null

  // 根據 position 參數決定預設位置
  let positionStyle: React.CSSProperties = {}
  
  switch (position) {
    case 'bottom-right':
      positionStyle = { bottom: '20px', right: '20px' }
      break
    case 'top-right':
      positionStyle = { top: '20px', right: '20px' }
      break
    case 'custom':
      if (customPosition) {
        positionStyle = { ...customPosition }
      }
      break
  }

  // 監聽滑鼠移動以檢測懸停狀態
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!zoneRef.current) return
      
      const rect = zoneRef.current.getBoundingClientRect()
      const isInside = (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      )
      
      setIsOver(isInside)
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [isDragging])

  // 監聽滑鼠放開事件
  useEffect(() => {
    const handleMouseUp = () => {
      if (isOver && draggingTag && !deleteConfirmed) {
        // 顯示確認動畫
        setDeleteConfirmed(true)
        
        // 這裡可以添加彈出確認窗口，但這裡使用延時作為示範
        const timer = setTimeout(() => {
          // 實際執行刪除操作
          const result = TagsService.deleteTag(draggingTag)
          console.log(`🗑️ ${result.message}`)
          
          // 重置狀態
          setDeleteConfirmed(false)
        }, 500)
        
        return () => clearTimeout(timer)
      }
    }
    
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [isOver, draggingTag, deleteConfirmed])

  return (
    <div
      ref={zoneRef}
      style={{
        position: 'fixed',
        width: '50px',
        height: '50px',
        borderRadius: '50%',
        backgroundColor: isOver ? 'rgba(255, 100, 100, 0.9)' : 'rgba(255, 150, 150, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: isOver ? '0 0 12px rgba(255, 0, 0, 0.4)' : '0 0 8px rgba(0, 0, 0, 0.2)',
        transition: 'all 0.2s ease',
        transform: isOver ? 'scale(1.2)' : 'scale(1)',
        zIndex: 9999,
        ...positionStyle
      }}
    >
      <div
        style={{
          fontSize: '20px',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        {deleteConfirmed ? '✓' : '🗑️'}
        {isOver && !deleteConfirmed && (
          <span style={{ fontSize: '8px', marginTop: '2px' }}>刪除標籤</span>
        )}
      </div>
    </div>
  )
}

export default DragToDeleteZone