'use client'

import React, { useState, useMemo } from 'react'
import { 
  GridFragment, 
  GridPosition,
  PixelPosition 
} from '@/features/fragments/types/gridTypes'
import { gridToPixel } from '@/features/fragments/layout/useLayoutFragments'
import { truncateText, formatDate } from '@/features/fragments/utils'
import { GRID_SIZE } from '@/features/fragments/constants'
import TagButton from './TagButton'
import TagActionRing from '@/features/tags/components/TagActionRing'
import TagDetailModal from '@/features/tags/components/TagDetailModal'
import { useTagDragManager } from '@/features/fragments/layout/useTagDragManager'
import { TagsService } from '@/features/tags/services/TagsService'

interface FragmentCardProps {
  fragment: GridFragment;
  isSelected: boolean;
  isDragging: boolean;
  dragPosition: PixelPosition;
  isValidDragTarget: boolean;
  previewPosition?: GridPosition;
  validationState: 'valid' | 'invalid-but-has-fallback' | 'completely-invalid';
  onFragmentClick: (fragment: GridFragment) => void;
  onDragStart: (e: React.MouseEvent, fragment: GridFragment) => void;
  observerRef?: React.RefObject<HTMLDivElement>;
  onTagClick?: (tag: string, fragment: GridFragment) => void   // ⬅️ 新增
  onTagDragStart?: (e: React.MouseEvent, tag: string, fragment: GridFragment) => void // ⬅️ 新增
}

const FragmentCard = ({
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
}: FragmentCardProps) => {
  const { position, size, direction, fontSize } = fragment
  const [showMoreContent, setShowMoreContent] = useState(false)
  const [showMoreNote, setShowMoreNote] = useState(false)
  
  // 標籤操作相關狀態
  const [clickedTag, setClickedTag] = useState<string | null>(null)
  const [tagActionPosition, setTagActionPosition] = useState<{ x: number; y: number } | null>(null)
  const [showTagDetail, setShowTagDetail] = useState(false)
  const { startTagDrag, wasDraggingRef } = useTagDragManager()
  const [detailTag, setDetailTag] = useState<string | null>(null);
  
  // 處理標籤點擊
    const handleTagClick = (tagName: string, e: React.MouseEvent) => {
      e.stopPropagation(); // 防止觸發卡片選擇
      
      // 如果剛結束拖曳，則忽略點擊
      if (wasDraggingRef.current) return;
      
      // 如果當前正在顯示詳情，先關閉它
      if (showTagDetail) {
        setShowTagDetail(false);
        setDetailTag(null);
      }
      
      // 設置點擊位置和標籤
      const rect = e.currentTarget.getBoundingClientRect();
      setClickedTag(tagName);
      setTagActionPosition({
        x: rect.left + rect.width / 2,
        y: rect.top
      });
      
      // 如果存在外部點擊處理器，也呼叫它
      if (onTagClick) {
        onTagClick(tagName, fragment);
      }
    };

    // 處理關閉標籤詳情
    const handleCloseTagDetail = () => {
      setShowTagDetail(false);
      setDetailTag(null);
      // 同時關閉行動環，避免混淆
      setClickedTag(null);
      setTagActionPosition(null);
    };

  


  
  // 處理刪除標籤
  const handleDeleteTag = (tagName: string) => {
      const isConfirmed = window.confirm(`確定要從所有碎片中刪除標籤「${tagName}」嗎？此操作無法撤銷。`)
      
      if (isConfirmed) {
        TagsService.deleteTag(tagName).then(result => {
          if (result.success) {
            console.log(`🗑️ ${result.message}`)
          }
        })
      }
    }
  // 處理標籤拖曳開始
  const handleTagDragStart = (e: React.MouseEvent, tagName: string) => {
    e.stopPropagation() // 防止觸發卡片拖曳
    
    // 使用 useTagDragManager 啟動拖曳
    startTagDrag(tagName, e, fragment.id)
    
    // 如果存在外部拖曳處理器，也呼叫它
    if (onTagDragStart) {
      onTagDragStart(e, tagName, fragment)
    }
  }
  
  // 使用預覽位置或原始位置
  const effectivePosition = previewPosition || position
  
  // 計算像素位置
  const { top, left } = isDragging 
    ? dragPosition 
    : gridToPixel(effectivePosition)
  
  const width = size.width * GRID_SIZE
  const height = size.height * GRID_SIZE
  
  // 確定是否顯示筆記內容
  const showNotes = fragment.showNote !== false && fragment.notes && fragment.notes.length > 0
  
  // 計算可顯示的內容長度（基於卡片尺寸）
  const maxVisibleChars = useMemo(() => {
    if (direction === 'horizontal') {
      const availableHeight = height - 100; 
      const lineHeight = fontSize * 1.4;
      const maxLines = Math.floor(availableHeight / lineHeight);
      const charsPerLine = Math.floor((width - 40) / (fontSize * 0.6));
      return Math.max(50, maxLines * charsPerLine);
    } else {
      const availableWidth = width - 80; 
      const columnWidth = fontSize * 1.6;
      const maxColumns = Math.floor(availableWidth / columnWidth);
      const charsPerColumn = Math.floor((height - 40) / (fontSize * 1.1));
      return Math.max(50, maxColumns * charsPerColumn);
    }
  }, [width, height, fontSize, direction])
  
  // 處理內容截斷
  // 不要因為其他選項影響主要內容的顯示
  const content = fragment.content;
  const noteText = showNotes ? fragment.notes[0]?.value || '' : '';
  // 只有展開或顯示的部分才保持原樣，否則截斷
  const displayedContent = showMoreContent ? content : truncateText(content, maxVisibleChars);
  const noteVisibleLines = direction === 'horizontal' ? 3 : 10;
  const estimatedCharsPerLine = Math.floor((width - 40) / (fontSize * 0.6));
  const estimatedNoteChars = noteVisibleLines * estimatedCharsPerLine;

  const displayedNote = showMoreNote
    ? noteText
    : truncateText(noteText, estimatedNoteChars);

  const tags = fragment.tags.slice(0, 20); // 使用常量 MAX_TAGS_COUNT
  
  // 為了兼容舊代碼，保留 note 變量
  const note = displayedNote;
  
  // 判斷是否需要展開按鈕
  const needContentExpand = fragment.content.length > maxVisibleChars
  const needNoteExpand = noteText.length > estimatedNoteChars;
  
  // 決定 z-index 值
  const zIndex = useMemo(() => {
    if (isDragging) return 1000; // 拖曳中的卡片最高
    if (isSelected) return 100;  // 選中的卡片次高
    if (previewPosition) return 50; // 預覽移動中的卡片
    return 1;  // 普通卡片
  }, [isDragging, isSelected, previewPosition]);
  
  // 預覽移動的動畫效果
  const transitionStyle = useMemo(() => {
    if (isDragging) return 'none'; // 拖曳中不需要過渡
    if (previewPosition) return 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'; // 預覽時使用更快、更明顯的動畫
    return 'transform 0.2s, box-shadow 0.2s'; // 一般狀態
  }, [isDragging, previewPosition]);

  // 在底部需要空間放置按鈕區域
  const needButtonSpace = needContentExpand || needNoteExpand;
  
  // 根據卡片大小調整間距的邏輯
  const contentNoteSpacing = Math.max(4, Math.min(8, Math.floor(fontSize * 0.4))); // 根據字體大小調整間距
  
  // 在縱向排列下，控制按鈕的高度
  const verticalButtonHeight = 22; // 按鈕高度
  // 在橫向排列下，控制按鈕的高度
  const controlButtonsHeight = 22; // 控制區高度

  return (
    <div
      ref={observerRef}
      data-fragment-id={fragment.id}
      onClick={() => onFragmentClick(fragment)}
      onMouseDown={(e) => onDragStart(e, fragment)}
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
        boxShadow: isDragging
          ? '0 12px 28px rgba(0, 0, 0, 0.25)'
          : isSelected 
          ? '0 4px 16px rgba(0, 0, 0, 0.15)' 
          : previewPosition
          ? '0 6px 20px rgba(0, 0, 0, 0.12)'
          : '0 2px 8px rgba(0, 0, 0, 0.06)',
        border: previewPosition
          ? '1px solid rgba(50, 120, 200, 0.3)'
          : '1px solid rgba(0, 0, 0, 0.05)',
        transform: isSelected && !isDragging ? 'scale(1.02)' : 'none',
        cursor: isDragging ? 'grabbing' : 'grab',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: direction === 'vertical' ? 'row' : 'column',
        transition: transitionStyle,
        zIndex: zIndex,
       opacity: isDragging
        ? (validationState === 'valid' ? 1 : 0.4)
        : 1
          }}
    >
      {direction === 'vertical' ? (
        <>
          {/* 豎排卡片布局 */}
          <div style={{ 
            display: 'flex',
            flexDirection: 'row',
            height: '100%',
            width: '100%',
          }}>
            {/* 標籤區域（左） */}
            {fragment.showTags !== false && tags.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column', 
                flexWrap: 'wrap',
                direction: 'rtl',
                gap: '4px',
                height: '100%',
                justifyContent: 'flex-start',
                overflow: 'auto',   // 改為可滾動
                width: 'auto',      // 寬度自適應
                minWidth: '30px',
                maxWidth: '120px',  // 設定最大寬度，避免佔用太多空間
                paddingRight: '8px',
              }}
            >
              {tags.map(tag => (
                <TagButton
                  key={tag}
                  tag={tag}
                  style={{
                    writingMode: 'vertical-rl',
                    textOrientation: 'upright',
                    maxHeight: '60px',
                    flexShrink: 0,  // 防止壓縮
                  }}
                  onTagClick={handleTagClick}
                  onTagDragStart={handleTagDragStart}
                />
              ))}
            </div>
          )}
          
            {/* 控制按鈕區域（中間，透明背景） */}
            {needButtonSpace && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end', // 按鈕定位在底部
                height: '100%',
                marginLeft: '4px',
                marginRight: '4px',
                width: '20px', // 減少寬度
              }}>
                {needNoteExpand && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowMoreNote(!showMoreNote)
                    }}
                    style={{
                      border: 'none',
                      background: 'rgba(255, 251, 239, 0.7)',
                      color: '#666',
                      fontSize: '11px',
                      cursor: 'pointer',
                      padding: '4px 2px',
                      marginBottom: '4px', // 減少間距
                      borderRadius: '4px',
                      writingMode: 'vertical-rl',
                      textOrientation: 'upright', // 直式文字
                    }}
                  >
                    {showMoreNote ? '收合' : '更多'}
                  </button>
                )}
                
                {needContentExpand && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowMoreContent(!showMoreContent)
                    }}
                    style={{
                      border: 'none',
                      background: 'rgba(255, 251, 239, 0.7)',
                      color: '#666',
                      fontSize: '11px',
                      cursor: 'pointer',
                      padding: '4px 2px',
                      marginBottom: '0', // 移除底部間距
                      borderRadius: '4px',
                      writingMode: 'vertical-rl',
                      textOrientation: 'upright', // 直式文字
                    }}
                  >
                    {showMoreContent ? '收合' : '更多'}
                  </button>
                )}
              </div>
            )}

            {/* 筆記內容區域（筆記內容） */}
           {showNotes && noteText && (
              <div
                style={{
                  overflow: showMoreNote ? 'auto' : 'hidden',
                  maxHeight: showMoreNote 
                  ? `${height - 80}px` 
                  : `${Math.floor((height - 100) / (fontSize * 1.4)) * fontSize * 1.4}px`,
                  transition: 'max-height 0.3s ease',
                  fontSize: `${Math.max(12, fontSize - 2)}px`,
                  color: '#666',
                }}
              >
                {/* 筆記標題 (永遠顯示) */}
                {fragment.notes[0]?.title && (
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 'bold',
                      color: '#333',
                      marginBottom: '2px',
                    }}
                  >
                    {fragment.notes[0]?.title}
                  </div>
                )}

                {/* 筆記內容本體 */}
                <div
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: showMoreNote ? 'unset' : 10, // 限制最多 10 行，不會太壓迫
                    whiteSpace: showMoreNote ? 'normal' : 'pre-line',
                  }}
                >
                  {displayedNote}
                </div>
              </div>
            )}
            
            {/* 主內容區域（右） */}
            <div 
              style={{
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                height: '100%',
                overflowWrap: 'break-word',
                overflow: showMoreContent ? 'auto' : 'hidden', // 展開時啟用滾動
                fontSize: `${fontSize}px`,
                lineHeight: '1.4',
                color: '#333',
                flex: '2', // 提高主內容的比例
                minWidth: '30%', // 確保至少有基本寬度
                marginLeft: `${contentNoteSpacing}px`, // 使用計算的間距
                display: 'block', // 確保一定顯示
              }}
            >
              {fragment.showContent !== false && (
                <div style={{ 
                  height: '100%',
                  paddingBottom: '8px',
                }}>
                  {displayedContent}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* 內容區域容器 */}
          <div 
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: `${contentNoteSpacing}px`,
            }}
          >
            {/* 主內容區域 */}
            <div 
              style={{
                overflowWrap: 'break-word',
                overflow: showMoreContent ? 'auto' : 'hidden',
                fontSize: `${fontSize}px`,
                lineHeight: '1.4',
                color: '#333',
                flex: '0 1 auto',
                maxHeight: showMoreContent 
                  ? `${height * 0.6}px`
                  : `${height * 0.4}px`,
                display: 'block',
                borderBottom: showNotes && noteText ? '1px dotted #eee' : 'none',
              }}
            >
              {fragment.showContent !== false && displayedContent}
            </div>

            {/* 筆記區域 */}
            {showNotes && noteText && (
              <div
                style={{
                  overflow: showMoreNote ? 'auto' : 'hidden',
                  maxHeight: showMoreNote 
                  ? `${height - 80}px` 
                  : `${Math.floor((height - 100) / (fontSize * 1.4)) * fontSize * 1.4}px`,
                  transition: 'max-height 0.3s ease',
                  fontSize: `${Math.max(12, fontSize - 2)}px`,
                  color: '#666',
                }}
              >
                {fragment.notes[0]?.title && (
                  <div style={{
                    fontSize: '11px', 
                    fontWeight: 'bold', 
                    color: '#333', 
                    marginBottom: '2px'
                  }}>
                    {fragment.notes[0]?.title}
                  </div>
                )}
                {displayedNote}
              </div>
            )}
          </div>

          {/* 控制按鈕區域 - 固定在標籤區前 */}
          {needButtonSpace && (
            <div style={{
              display: 'flex',
              justifyContent: 'flex-start',
              flexWrap: 'wrap',
              gap: '6px',
              height: `${controlButtonsHeight}px`,
              marginTop: '6px',
              marginBottom: '6px',
            }}>
              {needContentExpand && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMoreContent(!showMoreContent)
                  }}
                  style={{
                    border: 'none',
                    background: 'rgba(255, 251, 239, 0.7)',
                    color: '#666',
                    fontSize: '11px',
                    cursor: 'pointer',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  {showMoreContent ? '收合' : '更多'}
                </button>
              )}
              
              {needNoteExpand && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMoreNote(!showMoreNote)
                  }}
                  style={{
                    border: 'none',
                    background: 'rgba(255, 251, 239, 0.7)',
                    color: '#666',
                    fontSize: '11px',
                    cursor: 'pointer',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  {showMoreNote ? '收合' : '更多'}
                </button>
              )}
            </div>
          )}

          {/* 標籤區域 */}
          {fragment.showTags !== false && tags.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '4px',
                justifyContent: 'flex-start',
                maxHeight: '60px',
                overflow: 'hidden',
                flex: 'none',
                paddingTop: '4px',
                marginTop: '5px',
              }}
            >
              {tags.map(tag => (
                <TagButton
                  key={tag}
                  tag={tag}
                  onTagClick={handleTagClick}
                  onTagDragStart={handleTagDragStart}
                />
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
            bottom: '4px',
            right: '6px',
            fontSize: '9px',
            color: '#aaa',
            writingMode: direction === 'vertical' ? 'vertical-rl' : 'horizontal-tb',
          }}
        >
          {formatDate(fragment.createdAt)}
        </div>
      )}
      
     {/* 標籤行動環 */}
    {clickedTag && tagActionPosition && (
      <TagActionRing
        tag={clickedTag}
        position={tagActionPosition}
        onClose={() => {
          setClickedTag(null);
          setTagActionPosition(null);
        }}
        onOpenDetail={(tag) => {
          // 設置詳情標籤並顯示
          setDetailTag(tag);
          setShowTagDetail(true);
          // 關閉行動環
          setClickedTag(null);
          setTagActionPosition(null);
        }}
        fragmentId={fragment.id}
      />
    )}

    {/* 標籤詳情頁 */}
    {showTagDetail && detailTag && (
      <TagDetailModal
        tag={detailTag}
        relatedFragments={TagsService.findFragmentsByTag(detailTag)}
        onClose={handleCloseTagDetail}
      />
    )}
    </div>
  );
};

export default FragmentCard;
