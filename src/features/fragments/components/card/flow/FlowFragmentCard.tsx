// 📄 src/features/fragments/components/card/grid/GridFragmentCard.tsx

'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { 
  GridFragment, 
  GridPosition,
  PixelPosition 
} from '@/features/fragments/types/gridTypes'
import { gridToPixel } from '@/features/fragments/layout/useLayoutFragments'
import { truncateText, formatDate } from '@/features/fragments/utils'
import { GRID_SIZE } from '@/features/fragments/constants'
import TagActionRing from '@/features/tags/components/TagActionRing'
import TagDetailModal from '@/features/tags/components/TagDetailModal'
import { useTagDragManager } from '@/features/fragments/layout/useTagDragManager'
import { TagsService } from '@/features/tags/services/TagsService'
import { useFragmentsStore } from '@/features/fragments/store/useFragmentsStore'
import { useHoverScrollbar } from '@/features/interaction/useHoverScrollbar'

// 導入拆分的基礎組件
import { 
  FragmentContent, 
  FragmentNotes, 
  FragmentTags, 
  ControlButtons,
  FuzzyBallIcon,
  FragmentActionRing
} from '../base'

// 常量定義
const MAX_TAGS_COUNT = 20
const CONTENT_NOTE_SPACING_RATIO = 0.4

interface GridFragmentCardProps {
  fragment: GridFragment
  isSelected: boolean
  isDragging: boolean
  dragPosition: PixelPosition
  isValidDragTarget: boolean
  previewPosition?: GridPosition
  validationState: 'valid' | 'invalid-but-has-fallback' | 'completely-invalid'
  onFragmentClick: (fragment: GridFragment) => void
  onDragStart: (e: React.MouseEvent, fragment: GridFragment) => void
  observerRef?: React.RefObject<HTMLDivElement>
  onTagClick?: (tag: string, fragment: GridFragment) => void
  onTagDragStart?: (e: React.MouseEvent, tag: string, fragment: GridFragment) => void
  onEdit?: (fragment: GridFragment) => void
  onDelete?: (fragment: GridFragment) => void
}

// 自定義 hooks (保持不變)
const useCardDimensions = (fragment: GridFragment, isDragging: boolean, dragPosition: PixelPosition, previewPosition?: GridPosition) => {
  return useMemo(() => {
    const effectivePosition = previewPosition || fragment.position
    const { top, left } = isDragging ? dragPosition : gridToPixel(effectivePosition)
    const width = fragment.size.width * GRID_SIZE
    const height = fragment.size.height * GRID_SIZE
    
    return { top, left, width, height }
  }, [fragment.position, fragment.size, isDragging, dragPosition, previewPosition])
}

const useContentCalculation = (fragment: GridFragment, width: number, height: number) => {
  return useMemo(() => {
    const { fontSize, direction } = fragment
    
    const maxVisibleChars = direction === 'horizontal'
      ? Math.max(50, Math.floor((height - 100) / (fontSize * 1.4)) * Math.floor((width - 40) / (fontSize * 0.6)))
      : Math.max(50, Math.floor((width - 80) / (fontSize * 1.6)) * Math.floor((height - 40) / (fontSize * 1.1)))
    
    const noteVisibleLines = direction === 'horizontal' ? 3 : 10
    const estimatedCharsPerLine = Math.floor((width - 40) / (fontSize * 0.6))
    const estimatedNoteChars = noteVisibleLines * estimatedCharsPerLine
    
    const contentNoteSpacing = Math.max(4, Math.min(8, Math.floor(fontSize * CONTENT_NOTE_SPACING_RATIO)))
    
    return {
      maxVisibleChars,
      estimatedNoteChars,
      contentNoteSpacing
    }
  }, [fragment.fontSize, fragment.direction, width, height])
}

const useCardStyles = (isDragging: boolean, isSelected: boolean, previewPosition?: GridPosition) => {
  const zIndex = useMemo(() => {
    if (isDragging) return 1000
    if (isSelected) return 100
    if (previewPosition) return 50
    return 1
  }, [isDragging, isSelected, previewPosition])
  
  const transitionStyle = useMemo(() => {
    if (isDragging) return 'none'
    if (previewPosition) return 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
    return 'transform 0.2s, box-shadow 0.2s'
  }, [isDragging, previewPosition])
  
  const boxShadow = useMemo(() => {
    if (isDragging) return '0 12px 28px rgba(0, 0, 0, 0.25)'
    if (isSelected) return '0 4px 16px rgba(0, 0, 0, 0.15)'
    if (previewPosition) return '0 6px 20px rgba(0, 0, 0, 0.12)'
    return '0 2px 8px rgba(0, 0, 0, 0.06)'
  }, [isDragging, isSelected, previewPosition])
  
  return { zIndex, transitionStyle, boxShadow }
}

// 主組件
const GridFragmentCard = ({
  fragment,
  isSelected,
  isDragging,
  dragPosition,
  isValidDragTarget,
  previewPosition,
  validationState,
  onFragmentClick,
  onDragStart,
  observerRef,
  onTagClick,
  onTagDragStart,
  onEdit,
  onDelete,
}: GridFragmentCardProps) => {
  // 狀態管理
  const [showMoreContent, setShowMoreContent] = useState(false)
  const [showMoreNote, setShowMoreNote] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  
  // 標籤相關狀態
  const [clickedTag, setClickedTag] = useState<string | null>(null)
  const [tagActionPosition, setTagActionPosition] = useState<{ x: number; y: number } | null>(null)
  const [showTagDetail, setShowTagDetail] = useState(false)
  const [detailTag, setDetailTag] = useState<string | null>(null)
  
  // 碎片行動環相關狀態
  const [showFragmentActionRing, setShowFragmentActionRing] = useState(false)
  const [fragmentActionPosition, setFragmentActionPosition] = useState<{ x: number; y: number } | null>(null)
  const [isIconHovered, setIsIconHovered] = useState(false)
  
  // 外部依賴
  const { startTagDrag, wasDraggingRef } = useTagDragManager()
  const { fragments, deleteFragment } = useFragmentsStore()
  
  // 計算相關數據
  const { top, left, width, height } = useCardDimensions(fragment, isDragging, dragPosition, previewPosition)
  const { maxVisibleChars, estimatedNoteChars, contentNoteSpacing } = useContentCalculation(fragment, width, height)
  const { zIndex, transitionStyle, boxShadow } = useCardStyles(isDragging, isSelected, previewPosition)
  
  // 內容處理
  const displayedContent = showMoreContent ? fragment.content : truncateText(fragment.content, maxVisibleChars)
  const noteText = fragment.showNote !== false && fragment.notes?.length ? fragment.notes[0]?.value || '' : ''
  const displayedNote = showMoreNote ? noteText : truncateText(noteText, estimatedNoteChars)
  const tags = fragment.tags.slice(0, MAX_TAGS_COUNT)
  
  // 判斷是否需要展開按鈕
  const needContentExpand = fragment.content.length > maxVisibleChars
  const needNoteExpand = noteText.length > estimatedNoteChars

  // 為內容區域和筆記區域分別創建 hover scrollbar
  const contentScrollbar = useHoverScrollbar(15)
  const noteScrollbar = useHoverScrollbar(15)
  
  // 事件處理
  const handleTagClick = useCallback((tagName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (wasDraggingRef.current) return
    
    if (showTagDetail) {
      setShowTagDetail(false)
      setDetailTag(null)
    }
    
    const rect = e.currentTarget.getBoundingClientRect()
    setClickedTag(tagName)
    setTagActionPosition({
      x: rect.left + rect.width / 2,
      y: rect.top
    })
    
    onTagClick?.(tagName, fragment)
  }, [wasDraggingRef, showTagDetail, onTagClick, fragment])
  
  const handleTagDragStart = useCallback((e: React.MouseEvent, tagName: string) => {
    e.stopPropagation()
    startTagDrag(tagName, e, fragment.id)
    onTagDragStart?.(e, tagName, fragment)
  }, [startTagDrag, fragment.id, onTagDragStart])
  
  const handleCloseTagDetail = useCallback(() => {
    setShowTagDetail(false)
    setDetailTag(null)
    setClickedTag(null)
    setTagActionPosition(null)
  }, [])
  
  const handleToggleContent = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMoreContent(!showMoreContent)
  }, [showMoreContent])
  
  const handleToggleNote = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMoreNote(!showMoreNote)
  }, [showMoreNote])
  
  // 碎片行動環處理
  const handleFuzzyBallClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setFragmentActionPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    })
    setShowFragmentActionRing(true)
  }, [])
  
  const handleEdit = useCallback((fragment: GridFragment) => {
    console.log('編輯碎片:', fragment.id)
    // 調用外部編輯處理器或顯示編輯模態框
    if (onEdit) {
      onEdit(fragment)
    } else {
      // 暫時的提示，之後會實作編輯功能
      alert('編輯功能即將推出！')
    }
  }, [onEdit])
  
  const handleDelete = useCallback(async (fragment: GridFragment) => {
    console.log('準備刪除碎片:', fragment.id)
    
    try {
      // 優先使用外部刪除處理器
      if (onDelete) {
        onDelete(fragment)
        return
      }
      
      // 使用 store 的刪除方法（包含 API 調用）
      await deleteFragment(fragment.id)
      console.log('✅ 成功刪除碎片:', fragment.id)
      
    } catch (error) {
      console.error('❌ 刪除碎片失敗:', error)
      alert(`刪除失敗: ${error instanceof Error ? error.message : '未知錯誤'}`)
    }
  }, [onDelete, deleteFragment])
  
  // 渲染邏輯
  const renderVerticalLayout = () => (
    <div style={{ display: 'flex', flexDirection: 'row', height: '100%', width: '100%' }}>
      {/* 標籤區域 */}
      {fragment.showTags !== false && (
        <FragmentTags 
          tags={tags} 
          onTagClick={handleTagClick} 
          onTagDragStart={handleTagDragStart} 
          layout="vertical"
        />
      )}
      
      {/* 控制按鈕 */}
      <ControlButtons
        needContentExpand={needContentExpand}
        needNoteExpand={needNoteExpand}
        showMoreContent={showMoreContent}
        showMoreNote={showMoreNote}
        onToggleContent={handleToggleContent}
        onToggleNote={handleToggleNote}
        layout="vertical"
        contentHovering={contentScrollbar.hovering}
        noteHovering={noteScrollbar.hovering}
      />
      
      {/* 筆記區域 */}
      <FragmentNotes
        fragment={fragment}
        displayedNote={displayedNote}
        showMoreNote={showMoreNote}
        maxHeight={showMoreNote ? `${height - 80}px` : `${Math.floor((height - 100) / (fragment.fontSize * 1.4)) * fragment.fontSize * 1.4}px`}
        layout="vertical"
      />
      
      {/* 主內容區域 */}
      <FragmentContent
        fragment={fragment}
        displayedContent={displayedContent}
        showMoreContent={showMoreContent}
        maxHeight={showMoreContent ? `${height * 0.6}px` : `${height * 0.4}px`}
        layout="vertical"
        style={{
          flex: '2',
          minWidth: '30%',
          marginLeft: `${contentNoteSpacing}px`,
          paddingBottom: '8px',
        }}
      />
    </div>
  )
  
  const renderHorizontalLayout = () => (
    <>
      {/* 內容容器 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: `${contentNoteSpacing}px` }}>
        {/* 主內容 */}
        <FragmentContent
          fragment={fragment}
          displayedContent={displayedContent}
          showMoreContent={showMoreContent}
          maxHeight={showMoreContent ? `${height * 0.6}px` : `${height * 0.4}px`}
          layout="horizontal"
          style={{
            flex: '0 1 auto',
            borderBottom: noteText ? '1px dotted #eee' : 'none',
          }}
        />
        
        {/* 筆記區域 */}
        <FragmentNotes
          fragment={fragment}
          displayedNote={displayedNote}
          showMoreNote={showMoreNote}
          maxHeight={showMoreNote ? `${height - 80}px` : `${Math.floor((height - 100) / (fragment.fontSize * 1.4)) * fragment.fontSize * 1.4}px`}
          layout="horizontal"
        />
      </div>
      
      {/* 控制按鈕 */}
      <ControlButtons
        needContentExpand={needContentExpand}
        needNoteExpand={needNoteExpand}
        showMoreContent={showMoreContent}
        showMoreNote={showMoreNote}
        onToggleContent={handleToggleContent}
        onToggleNote={handleToggleNote}
        layout="horizontal"
        contentHovering={contentScrollbar.hovering}
        noteHovering={noteScrollbar.hovering}
      />
      
      {/* 標籤區域 */}
      {fragment.showTags !== false && (
        <FragmentTags 
          tags={tags} 
          onTagClick={handleTagClick} 
          onTagDragStart={handleTagDragStart} 
          layout="horizontal"
        />
      )}
    </>
  )
  
  return (
    <div
      ref={observerRef}
      data-fragment-id={fragment.id}
      onClick={() => onFragmentClick(fragment)}
      onMouseDown={(e) => onDragStart(e, fragment)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fragment-card ${isDragging ? 'is-dragging' : ''} ${previewPosition ? 'is-previewing' : ''}`}
      style={{
        position: 'absolute',
        top: `${top}px`,
        left: `${left}px`,
        width: `${width}px`,
        height: `${height}px`,
        padding: '12px',
        backgroundColor: '#fffbef',
        borderRadius: '10px',
        boxShadow,
        border: previewPosition ? '1px solid rgba(50, 120, 200, 0.3)' : '1px solid rgba(0, 0, 0, 0.05)',
        transform: isSelected && !isDragging ? 'scale(1.02)' : 'none',
        cursor: isDragging ? 'grabbing' : 'grab',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: fragment.direction === 'vertical' ? 'row' : 'column',
        transition: transitionStyle,
        zIndex,
        opacity: isDragging ? (validationState === 'valid' ? 1 : 0.4) : 1
      }}
    >
      {/* 小毛球圖示 - 右上角 */}
      <button
        onClick={handleFuzzyBallClick}
        onMouseEnter={() => setIsIconHovered(true)}
        onMouseLeave={() => setIsIconHovered(false)}
        style={{
            position: 'absolute',
            top: '0px',        // 緊貼卡片上邊緣
            right: '0px',      // 緊貼卡片右邊緣
            width: '20px',
            height: '20px',
            border: 'none',
            background: 'transparent',  // 🎯 完全透明背景
            cursor: 'pointer',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: 'translate(50%, -50%)', // 🎯 一半在內一半在外
            transition: 'all 0.3s ease',
            opacity: isHovered ? 1 : 0,        // 🎯 動態顯示
            visibility: isHovered ? 'visible' : 'hidden',
            zIndex: 10,
            // 🎯 用陰影增強可視性
            filter: isIconHovered 
            ? 'drop-shadow(0 1px 3px rgba(0,0,0,0.3))' 
            : 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))',
        }}
        title="卡片選項"
        >
        <FuzzyBallIcon 
            size={16} 
            isHovered={isIconHovered} 
            color="#d1b684"
        />
        </button>

      
      {fragment.direction === 'vertical' ? renderVerticalLayout() : renderHorizontalLayout()}
      
      {/* 日期顯示 */}
      {isSelected && (
        <div 
          style={{
            position: 'absolute',
            bottom: '4px',
            right: '6px',
            fontSize: '9px',
            color: '#aaa',
            writingMode: fragment.direction === 'vertical' ? 'vertical-rl' : 'horizontal-tb',
          }}
        >
          {formatDate(fragment.createdAt)}
        </div>
      )}
      
      {/* 標籤操作環 */}
      {clickedTag && tagActionPosition && (
        <TagActionRing
          tag={clickedTag}
          position={tagActionPosition}
          onClose={() => {
            setClickedTag(null)
            setTagActionPosition(null)
          }}
          onOpenDetail={(tag) => {
            setDetailTag(tag)
            setShowTagDetail(true)
            setClickedTag(null)
            setTagActionPosition(null)
          }}
          fragmentId={fragment.id}
        />
      )}

      {/* 標籤詳情彈窗 */}
      {showTagDetail && detailTag && (
      <TagDetailModal
        tag={detailTag}
        relatedFragments={TagsService.findFragmentsByTag(fragments || [], detailTag)} // 🔧 修復：處理 null
        onClose={handleCloseTagDetail}
      />
    )}
      
      {/* 碎片行動環 */}
      {showFragmentActionRing && fragmentActionPosition && (
        <FragmentActionRing
          fragment={fragment}
          position={fragmentActionPosition}
          onClose={() => setShowFragmentActionRing(false)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}

export default GridFragmentCard