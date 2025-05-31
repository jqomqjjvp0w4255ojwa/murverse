'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useTagDragManager } from '@/features/fragments/layout/useTagDragManager'
import { useTagCollectionStore } from '@/features/tags/store/useTagCollectionStore'

const TagDropZone: React.FC = () => {
  const { draggingTag, isDragging } = useTagDragManager()
  const { isCollected, addTag } = useTagCollectionStore()

  const ref = useRef<HTMLDivElement>(null)
  const [isOver, setIsOver] = useState(false)
  const [showFeedback, setShowFeedback] = useState<{visible: boolean, message: string, success: boolean}>({
    visible: false,
    message: '',
    success: true
  })

  // 用滑鼠位置判斷有沒有進入 drop 區域
  useEffect(() => {
    const checkHover = (e: MouseEvent) => {
      if (!ref.current) return
      const rect = ref.current.getBoundingClientRect()
      const inside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      setIsOver(inside)
    }

    if (isDragging) {
      window.addEventListener('mousemove', checkHover)
    } else {
      setIsOver(false)
    }

    return () => window.removeEventListener('mousemove', checkHover)
  }, [isDragging])

  // 放開滑鼠時觸發收藏
  useEffect(() => {
    const handleMouseUp = () => {
      if (!draggingTag || !isDragging) return
      if (isOver) {
        if (!isCollected(draggingTag)) {
          addTag(draggingTag)
          console.log('✅ 已收藏標籤:', draggingTag)
          
          // 顯示反饋訊息
          setShowFeedback({
            visible: true,
            message: `已將「${draggingTag}」加入收藏`,
            success: true
          })
          
          // 3秒後隱藏反饋
          setTimeout(() => {
            setShowFeedback(prev => ({...prev, visible: false}))
          }, 3000)
        } else {
          console.log('⚠️ 已經收藏過:', draggingTag)
          
          // 顯示反饋訊息
          setShowFeedback({
            visible: true,
            message: `「${draggingTag}」已在收藏中`,
            success: false
          })
          
          // 3秒後隱藏反饋
          setTimeout(() => {
            setShowFeedback(prev => ({...prev, visible: false}))
          }, 3000)
        }
      }
    }

    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [draggingTag, isDragging, isOver, isCollected, addTag])

  if (!isDragging || !draggingTag) return null

  const isAlreadyCollected = isCollected(draggingTag)
  const label = isAlreadyCollected ? '已收藏' : '新增標籤'

  return (
    <>
      <div
        ref={ref}
        style={{
          border: '2px dashed rgba(160, 120, 80, 0.5)',
          backgroundColor: isOver 
            ? (isAlreadyCollected ? 'rgba(255, 200, 120, 0.3)' : 'rgba(255, 250, 230, 0.6)')
            : 'transparent',
          backdropFilter: isOver ? 'blur(4px)' : 'none',
          borderRadius: '12px',
          padding: '24px 32px',
          color: '#7a5d3a',
          fontSize: '14px',
          fontWeight: 600,
          zIndex: 2000,
          pointerEvents: 'auto',
          transition: 'all 0.2s ease',
          boxShadow: isOver ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        {isOver ? (
          <>
            <span style={{ fontSize: '18px', marginRight: '8px' }}>
              {isAlreadyCollected ? '⚠️' : '✨'}
            </span>
            {label}
          </>
        ) : (
          <>
            {label}
          </>
        )}
      </div>
      
      {/* 反饋訊息 */}
      {showFeedback.visible && (
        <div 
          style={{
            position: 'absolute',
            top: '-50px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: showFeedback.success ? 'rgba(60, 179, 113, 0.85)' : 'rgba(255, 165, 0, 0.85)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '20px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
            fontSize: '13px',
            zIndex: 2001,
            animation: 'fade-in-out 3s ease-in-out',
          }}
        >
          {showFeedback.message}
        </div>
      )}
      
      {/* 加入動畫 */}
      <style jsx global>{`
        @keyframes fade-in-out {
          0% { opacity: 0; transform: translate(-50%, 10px); }
          10% { opacity: 1; transform: translate(-50%, 0); }
          80% { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, -10px); }
        }
      `}</style>
    </>
  )
}

export default TagDropZone