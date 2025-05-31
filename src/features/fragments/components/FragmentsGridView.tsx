// FragmentsGridView.tsx（更新的部分）
'use client'

import { useTagDragManager } from '@/features/fragments/layout/useTagDragManager'
import TagDragPreview from './TagDragPreview'

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useFragmentsStore } from '@/features/fragments/store/useFragmentsStore'
import { Fragment } from '@/features/fragments/types/fragment'
import { 
  PixelPosition, 
  GridFragment, 
  GridPosition,
  RelevanceMap 
} from '@/features/fragments/types/gridTypes'
import FragmentCard from './FragmentCard'
import FragmentDetailModal from './FragmentDetailModal'
import { 
  useLayoutFragments, 
  createDirectionMap,
  gridToPixel,
} from '@/features/fragments/layout/useLayoutFragments'
import { useDragFragment } from '@/features/fragments/layout/useDragFragment'
import { 
  GRID_SIZE,
  CONTAINER_WIDTH
} from '@/features/fragments/constants'


type PositionsMap = Record<string, { row: number, col: number }>;

// 持久化儲存的本地緩存鍵
const STORAGE_KEY_POSITIONS = 'fragment_positions';

/**
 * 自由拖曳的碎片網格，支持智能布局和換行 - 徹底修復版本
 */

type FragmentsGridViewProps = {
  fragments: Fragment[];
  relevanceMap?: RelevanceMap;
  resetLayout?: boolean; // 新增這一行
}

export default function FragmentsGridView({
  fragments,
  relevanceMap = {},
  resetLayout = false // 新增這一行，並設置默認值
}: FragmentsGridViewProps) {

  
  const isTagDraggingRef = useRef(false)
  
  const { setSelectedFragment } = useFragmentsStore()
  const [selectedFragment, setSelectedFragmentState] = useState<Fragment | null>(null)
  const [positions, setPositions] = useState<PositionsMap>({})
  const positionsRef = useRef<PositionsMap>({})
  const [, forceUpdate] = useState({})
  const containerRef = useRef<HTMLDivElement>(null)
  const isInitialLoadRef = useRef(true)

  
  
  // 使用 useMemo 創建方向映射，避免每次渲染重新計算
  const directionMap = useMemo(() => createDirectionMap(fragments), [fragments]);
  
  // 強制重新渲染的函數
  const refreshView = useCallback(() => {
    forceUpdate({});
  }, []);

  
  useEffect(() => {
  if (resetLayout) {
    localStorage.removeItem(STORAGE_KEY_POSITIONS);
    setPositions({});
    positionsRef.current = {};
    console.log('收到重置信號，清除位置 → 將重新布局');
  }
}, [resetLayout]);

  

  // 從 localStorage 加載位置信息 - 使用 useEffect 確保只在客戶端執行
  useEffect(() => {
    if (!isInitialLoadRef.current) return;
    
    try {
      const savedPositions = localStorage.getItem(STORAGE_KEY_POSITIONS);
      if (savedPositions) {
        const loadedPositions = JSON.parse(savedPositions);
        setPositions(loadedPositions);
        positionsRef.current = loadedPositions;
        console.log('從 localStorage 加載位置:', Object.keys(loadedPositions).length);
      }
    } catch (error) {
      console.error('加載位置出錯:', error);
    }
    
    isInitialLoadRef.current = false;
  }, []);
  
  // 使用 useLayoutFragments 計算網格布局
  const { gridFragments, newPositions } = useLayoutFragments(
    fragments,
    positions, 
    directionMap
  )

  const {
    
  draggingTag,
  dragPosition: tagDragPosition,
  isDragging: isTagDragging,
  wasDraggingRef,
  startTagDrag,
} = useTagDragManager()

  useEffect(() => {
  isTagDraggingRef.current = isTagDragging
}, [isTagDragging])
  
  // 使用改進後的 useDragFragment 處理拖曳功能
  const { 
    draggingId, 
    dragPosition, 
    handleDragStart, 
    isDragging, 
    isValidDragTarget,
    previewRelocations,
    validationState,
  } = useDragFragment(
    gridFragments,
    useCallback((updater) => {
      setPositions(prev => {
        const updatedPositions = updater(prev)

        // 過濾掉不合法的 (0,0) 寫入
        for (const [id, pos] of Object.entries(updatedPositions)) {
          if (pos.row === 0 && pos.col === 0) {
            console.warn(`🚫 阻止碎片 ${id} 被寫入為 (0,0)`)
            delete updatedPositions[id]
          }
        }

        positionsRef.current = updatedPositions

        try {
          localStorage.setItem(STORAGE_KEY_POSITIONS, JSON.stringify(updatedPositions))
          console.log('保存位置到 localStorage (拖曳):', Object.keys(updatedPositions).length)
        } catch (error) {
          console.error('保存位置出錯:', error)
        }

        forceUpdate({}) // 強制重新渲染

        return updatedPositions
      })
    }, []),
    refreshView // 傳入強制刷新函數
  );

  

  // 處理碎片點擊
  const handleFragmentClick = useCallback((fragment: Fragment) => {
  if (draggingId || wasDraggingRef.current) return
  setSelectedFragmentState(fragment)
  setSelectedFragment(fragment)
  }, [draggingId, setSelectedFragment])


  // 關閉詳情彈窗
  const handleCloseDetail = useCallback(() => {
    setSelectedFragmentState(null)
  }, []);

  // 合併新位置到當前位置記錄
  useEffect(() => {
    setPositions(prev => {
      const updated = { ...prev }
      let hasNew = false

      for (const [id, pos] of Object.entries(newPositions)) {
        // 防止 fallback 到 (0,0) 被當作合法位置寫入
        if (!(id in prev) && !(pos.row === 0 && pos.col === 0)) {
          updated[id] = pos
          hasNew = true
        } else if (pos.row === 0 && pos.col === 0) {
          console.warn(`⚠️ 阻止新碎片 ${id} 以 (0,0) 被加入 position 記錄`)
        }
      }

      if (hasNew) {
        localStorage.setItem(STORAGE_KEY_POSITIONS, JSON.stringify(updated))
        console.log('✅ 加入新碎片位置：', updated)
        return updated
      }

      return prev
    })
  }, [newPositions])

  // 在碎片數量變化時，確保更新位置
  useEffect(() => {
    // 清理已刪除的碎片位置
    const existingIds = new Set(fragments.map(f => f.id))
    const positionIds = Object.keys(positionsRef.current)
    
    let hasChange = false
    let updatedPositions = { ...positions }
    
    for (const id of positionIds) {
      if (!existingIds.has(id)) {
        delete updatedPositions[id]
        hasChange = true
      }
    }
    
    if (hasChange) {
      setPositions(updatedPositions)
      positionsRef.current = updatedPositions
    }
  }, [fragments.length, positions])

  // 保存位置到 localStorage
  useEffect(() => {
    if (Object.keys(positions).length > 0 && !isInitialLoadRef.current) {
      const saveToLocalStorage = () => {
        try {
          // 確保深拷貝位置對象，避免引用問題
          const positionsToSave = JSON.parse(JSON.stringify(positions));
          
          localStorage.setItem(STORAGE_KEY_POSITIONS, JSON.stringify(positionsToSave));
          console.log('保存位置到 localStorage - 效果更新:', Object.keys(positionsToSave).length);
        } catch (error) {
          console.error('保存位置出錯:', error);
        }
      };
      
      // 立即保存，不使用延時
      saveToLocalStorage();
    }
  }, [positions]);

      useEffect(() => {
      const clear = () => {
        isTagDraggingRef.current = false
      }
      window.addEventListener('mouseup', clear)
      return () => window.removeEventListener('mouseup', clear)
        }, [])

        useEffect(() => {
      if (isTagDragging) {
        document.body.style.cursor = 'grabbing'
        document.body.style.userSelect = 'none'
      } else {
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }, [isTagDragging])







  // 計算內容區域的高度和寬度
  const { contentWidth, contentHeight } = useMemo(() => {
    if (gridFragments.length === 0) {
      return { contentWidth: CONTAINER_WIDTH, contentHeight: window.innerHeight * 0.6 };
    }
    
    let maxWidth = 0;
    let maxHeight = 0;
    
    gridFragments.forEach(fragment => {
      // 計算這個碎片的邊界
      const fragmentRight = (fragment.position.col + fragment.size.width + 1) * GRID_SIZE; // 加1確保間距
      const fragmentBottom = (fragment.position.row + fragment.size.height + 1) * GRID_SIZE; // 加1確保間距
      
      maxWidth = Math.max(maxWidth, fragmentRight);
      maxHeight = Math.max(maxHeight, fragmentBottom);
    });
    
    // 確保內容區域高度至少為容器高度
    const minHeight = window.innerHeight * 0.6;
    return { 
      contentWidth: Math.min(CONTAINER_WIDTH, maxWidth + 100), // 確保不超過容器寬度
      contentHeight: Math.max(minHeight, maxHeight + 200) // 添加更多底部空間
    };
  }, [gridFragments]);

  return (
    <div className="fragments-container">
      {/* 提示信息 */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backgroundColor: '#f9f6e9',
        padding: '8px 0',
        marginBottom: '12px',
        borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
        textAlign: 'center',
        color: '#666',
        fontSize: '13px'
      }}>
        可自由拖曳碎片，靠近其他碎片時會自動讓出空間，無效位置時會自動回到原位置
      </div>

      <div style={{
        textAlign: 'center',
        marginBottom: '12px',
      }}>
        <button
          onClick={() => {
            localStorage.removeItem(STORAGE_KEY_POSITIONS)
            setPositions({})
            positionsRef.current = {}
            console.log('已清除位置 → 將重新布局')
          }}
          style={{
            backgroundColor: '#d1b684',
            color: '#fff',
            padding: '6px 12px',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
          }}
        >
          重新排列碎片
        </button>
      </div>

      {/* 碎片網格 */}
      <div 
        ref={containerRef}
        className="fragments-grid-container relative" 
        style={{ 
          position: 'relative',
          background: '#f9f6e9',
          backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
          backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
          width: '100%',
          maxWidth: `${CONTAINER_WIDTH}px`,
          height: `${contentHeight}px`,
          padding: '10px',
          margin: '0 auto',
          overflowX: 'hidden',
          overflowY: 'auto'
        }}
      >
        {gridFragments.length === 0 ? (
          <div className="no-fragments-message" style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: '#aaa',
            fontSize: '16px',
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
            borderRadius: '8px',
            margin: '20px 0'
          }}>
            暫無碎片。請使用頂部的輸入框添加新碎片。
          </div>
        ) : (
          gridFragments
          .filter(fragment => fragment.position) // 避免沒有 position 的 fragment 被渲染
          .map(fragment => (
            <FragmentCard
            key={fragment.id}
            fragment={fragment}
            isSelected={selectedFragment?.id === fragment.id}
            isDragging={isDragging(fragment.id)}
            dragPosition={dragPosition}
            isValidDragTarget={isValidDragTarget}
            previewPosition={previewRelocations[fragment.id]}
            validationState={draggingId === fragment.id ? validationState : 'valid'} 
            onFragmentClick={handleFragmentClick}
            onDragStart={handleDragStart}
            onTagClick={(tag, frag) => {
              console.log('🟡 點擊標籤:', tag, '來自 fragment:', frag.id)
              // TODO: 加入篩選、跳轉或其他互動
            }}
           onTagDragStart={(e, tag, frag) => {
            e.preventDefault()
            e.stopPropagation()
            startTagDrag(tag, e)
          
            console.log('🟠 開始拖曳標籤:', tag, '來自 fragment:', frag.id)
          }}

          />
          ))
        )}
         
        {/* 詳情彈窗 */}
        <FragmentDetailModal 
          fragment={selectedFragment} 
          onClose={handleCloseDetail} 
        />

        {isTagDragging && draggingTag && tagDragPosition && (
          <TagDragPreview tag={draggingTag} position={tagDragPosition} />
        )}
      </div>
    </div>
  );
}