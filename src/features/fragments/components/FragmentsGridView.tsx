'use client'

import { useState, useMemo } from 'react'
import { useFragmentsStore } from '@/features/fragments/store/useFragmentsStore'
import { Fragment } from '@/features/fragments/types/fragment'
import FragmentDetailModal from './FragmentDetailModal'
import { 
  useLayoutFragments, 
  createDirectionMap,
  formatDate, 
  gridToPixel,
  truncateText
} from '@/features/fragments/layout/useLayoutFragments'
import { useDragFragment } from '@/features/fragments/layout/useDragFragment'

// 內容字數限制
const MAX_CONTENT_LENGTH = 100
const MAX_NOTE_LENGTH = 500
const MAX_TAGS_COUNT = 20

// 格子大小常數
const GRID_SIZE = 20 // 每個格子20px

export default function FragmentsGridView({ 
  fragments, 
  relevanceMap = {} 
}: { 
  fragments: Fragment[], 
  relevanceMap?: Record<string, number> 
}) {
  const { setSelectedFragment } = useFragmentsStore()
  const [selectedFragment, setSelectedFragmentState] = useState<Fragment | null>(null)
  const [positions, setPositions] = useState<Record<string, { row: number, col: number }>>({})
  
  // 使用 useMemo 創建方向映射，避免每次渲染重新計算
  const directionMap = useMemo(() => createDirectionMap(fragments), [fragments]);
  
  // 使用 useLayoutFragments 計算網格布局
  const { gridFragments, newPositions } = useLayoutFragments(
    fragments, 
    positions, 
    relevanceMap, 
    directionMap
  )
  
  // 使用 useDragFragment 處理拖曳功能
  const { draggingId, dragPosition, handleDragStart, isDragging } = useDragFragment(
    gridFragments,
    setPositions
  )

  // 處理碎片點擊
  const handleFragmentClick = (fragment: Fragment) => {
    if (draggingId) return // 拖曳時不觸發點擊
    
    setSelectedFragmentState(fragment)
    setSelectedFragment(fragment)
  }

  // 關閉詳情彈窗
  const handleCloseDetail = () => {
    setSelectedFragmentState(null)
  }

  // 如果有新位置需要添加，更新位置記錄
  useMemo(() => {
    if (Object.keys(newPositions).length > Object.keys(positions).length) {
      let hasChanges = false;
      for (const id in newPositions) {
        if (!positions[id]) {
          hasChanges = true;
          break;
        }
      }
      
      if (hasChanges) {
        setTimeout(() => {
          setPositions(prev => ({...prev, ...newPositions}));
        }, 0);
      }
    }
  }, [newPositions, positions]);

  return (
    <div className="relative w-full h-full" style={{ 
      background: '#f9f6e9',
      backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
      backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
      minHeight: '80vh',
      padding: '20px'
    }}>
      {gridFragments.map(fragment => {
        const isSelected = selectedFragment?.id === fragment.id
        const isDraggingThis = isDragging(fragment.id)
        const { position, size, direction, fontSize } = fragment
        
        // 計算像素位置
        const { top, left } = isDraggingThis 
          ? dragPosition 
          : gridToPixel(position)
        
        const width = size.width * GRID_SIZE
        const height = size.height * GRID_SIZE
        
        // 確定是否顯示筆記內容
        const showNotes = fragment.showNote !== false && fragment.notes && fragment.notes.length > 0
        
        // 處理內容截斷
        const content = truncateText(fragment.content, MAX_CONTENT_LENGTH)
        const note = showNotes ? truncateText(fragment.notes[0]?.value || '', MAX_NOTE_LENGTH) : undefined
        const tags = fragment.tags.slice(0, MAX_TAGS_COUNT)
        
        return (
          <div
            key={fragment.id}
            data-fragment-id={fragment.id}
            onClick={() => handleFragmentClick(fragment)}
            onMouseDown={(e) => handleDragStart(e, fragment)}
            className={`absolute transition-all ${isDraggingThis ? 'z-50' : isSelected ? 'z-10' : 'z-1'}`}
            style={{
              top: `${top}px`,
              left: `${left}px`,
              width: `${width}px`,
              height: `${height}px`,
              padding: '16px',
              backgroundColor: '#fffbef',
              borderRadius: '12px',
              boxShadow: isDraggingThis
                ? '0 8px 24px rgba(0, 0, 0, 0.15)'
                : isSelected 
                ? '0 4px 16px rgba(0, 0, 0, 0.1)' 
                : '0 2px 8px rgba(0, 0, 0, 0.06)',
              border: '1px solid rgba(0, 0, 0, 0.05)',
              transform: isSelected && !isDraggingThis ? 'scale(1.02)' : 'none',
              cursor: 'grab',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: direction === 'vertical' ? 'row' : 'column',
              justifyContent: 'space-between',
              transition: isDraggingThis ? 'none' : 'transform 0.2s, box-shadow 0.2s'
            }}
          >
            {/* 豎排模式：右到左依序是主內容、筆記、標籤 */}
            {direction === 'vertical' ? (
              <>
                {/* 主內容區域（右） */}
                <div 
                  style={{
                    writingMode: 'vertical-rl',
                    textOrientation: 'mixed',
                    height: '100%',
                    overflowWrap: 'break-word',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontSize: `${fontSize}px`,
                    lineHeight: '1.5',
                    color: '#333',
                    order: 3, // 最右側
                    marginLeft: '10px'
                  }}
                >
                  {fragment.showContent !== false && (
                    <div>{content}</div>
                  )}
                </div>
                
                {/* 筆記內容（中） */}
                {showNotes && note && (
                  <div 
                    style={{ 
                      writingMode: 'vertical-rl',
                      textOrientation: 'mixed',
                      fontSize: `${Math.max(12, fontSize - 2)}px`, 
                      color: '#666',
                      height: '100%',
                      overflowWrap: 'break-word',
                      overflow: 'hidden',
                      order: 2, // 中間
                      marginLeft: '10px'
                    }}
                  >
                    {note}
                  </div>
                )}
                
                {/* 標籤區域（左） */}
                {fragment.showTags !== false && (
                  <div 
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      height: '100%',
                      order: 1, // 最左側
                      justifyContent: 'flex-start',
                      overflow: 'hidden',
                    }}
                  >
                    {tags.map(tag => (
                      <span
                        key={tag}
                        style={{
                          backgroundColor: '#f3e8c7',
                          color: '#8d6a38',
                          borderRadius: '16px',
                          padding: '8px 2px',
                          fontSize: '11px',
                          whiteSpace: 'nowrap',
                          display: 'inline-block',
                          writingMode: 'vertical-rl',
                          marginBottom: '6px'
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </>
            ) : (
              // 橫排模式：標準上下佈局
              <>
                {/* 主內容區域 */}
                <div 
                  style={{
                    overflowWrap: 'break-word',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontSize: `${fontSize}px`,
                    lineHeight: '',
                    color: '#333',
                    flex: 1
                  }}
                >
                  {fragment.showContent !== false && (
                    <div>{content}</div>
                  )}
                  
                  {/* 筆記內容 */}
                  {showNotes && note && (
                    <div 
                      style={{ 
                        fontSize: `${Math.max(12, fontSize - 2)}px`, 
                        color: '#666',
                        marginTop: '8px',
                      }}
                    >
                      {note}
                    </div>
                  )}
                </div>
                
                {/* 標籤區域 */}
                {fragment.showTags !== false && (
                  <div 
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px',
                      marginTop: '12px',
                      justifyContent: 'flex-start',
                      maxHeight: '60px',
                      overflow: 'hidden',
                    }}
                  >
                    {tags.map(tag => (
                      <span
                        key={tag}
                        style={{
                          backgroundColor: '#f3e8c7',
                          color: '#8d6a38',
                          borderRadius: '16px',
                          padding: '2px 8px',
                          fontSize: '11px',
                          whiteSpace: 'nowrap',
                          display: 'inline-block',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
            
            {/* 展開碎片後才顯示日期 */}
            {isSelected && (
              <div 
                style={{
                  position: 'absolute',
                  bottom: '6px',
                  right: '8px',
                  fontSize: '10px',
                  color: '#aaa',
                  writingMode: direction === 'vertical' ? 'vertical-rl' : 'horizontal-tb',
                }}
              >
                {formatDate(fragment.createdAt)}
              </div>
            )}
          </div>
        )
      })}
      
      {/* 詳情彈窗 */}
      <FragmentDetailModal 
        fragment={selectedFragment} 
        onClose={handleCloseDetail} 
      />
    </div>
  )
}