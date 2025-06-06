// FragmentsGridView.tsx（更新導入路徑並使用重構後的組件）
'use client'

import { useTagDragManager } from '@/features/fragments/layout/useTagDragManager'
import TagDragPreview from './TagDragPreview'
import { useHoverScrollbar } from '@/features/interaction/useHoverScrollbar'

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useFragmentsStore } from '@/features/fragments/store/useFragmentsStore'
import { Fragment } from '@/features/fragments/types/fragment'
import { 
  PixelPosition, 
  GridFragment, 
  GridPosition,
  RelevanceMap 
} from '@/features/fragments/types/gridTypes'
// 🎯 更新導入路徑：使用重構後的 GridFragmentCard
import { GridFragmentCard } from './card'
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
import { saveFragmentPositionToSupabase } from '@/features/fragments/services/FragmentPositionService'
import { getSupabaseClient } from '@/lib/supabase/client'

type PositionsMap = Record<string, { row: number, col: number }>;

// 持久化儲存的本地緩存鍵
const STORAGE_KEY_POSITIONS = 'fragment_positions';

/**
 * 自由拖曳的碎片網格，支持智能布局和優化滾動體驗
 */

type FragmentsGridViewProps = {
  fragments: Fragment[];
  relevanceMap?: RelevanceMap;
  resetLayout?: boolean;
}

export default function FragmentsGridView({
  fragments,
  relevanceMap = {},
  resetLayout = false
}: FragmentsGridViewProps) {

  // 統一的滾動條樣式設定 - 只設定一次
  useEffect(() => {
    const styleId = 'fragments-grid-scrollbar-styles';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
      
      styleElement.textContent = `
      .fragments-grid-container {
        scrollbar-width: none;
        -ms-overflow-style: none;
        transition: scrollbar-width 0.3s ease;
      }
      
      .fragments-grid-container::-webkit-scrollbar {
        width: 0px;
      }
      
      .fragments-grid-container.show-scrollbar {
        scrollbar-width: thin;
        scrollbar-color: #d1b684 #f9f6e9;
      }
      
      .fragments-grid-container.show-scrollbar::-webkit-scrollbar {
        width: 8px;
      }
      
      .fragments-grid-container.show-scrollbar::-webkit-scrollbar-track {
        background: #f9f6e9;
        border-radius: 4px;
      }
      
      .fragments-grid-container.show-scrollbar::-webkit-scrollbar-thumb {
        background: rgb(255, 255, 255);
        border-radius: 4px;
        border: 1px solid #f9f6e9;
      }
      
      /* 🎯 新增：卡片內部的 hover scrollbar 樣式 */
      .hover-scrollbar-hidden::-webkit-scrollbar {
        width: 0;
        background: transparent;
        transition: width 0.2s ease;
      }

      .hover-scrollbar-hidden::-webkit-scrollbar-thumb {
        background: transparent;
      }

      .hover-scrollbar-visible::-webkit-scrollbar {
        width: 6px;
        transition: width 0.2s ease;
      }

      .hover-scrollbar-visible::-webkit-scrollbar-track {
        background: transparent;
      }

      .hover-scrollbar-visible::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 3px;
        transition: background 0.2s ease;
      }

      .hover-scrollbar-visible::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 0, 0, 0.4);
      }

      /* Firefox 滾動條樣式 */
      .hover-scrollbar-hidden {
        scrollbar-width: none;
      }

      .hover-scrollbar-visible {
        scrollbar-width: thin;
        scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
      }
    `;
    }
    
    // 清理函數
    return () => {
      const element = document.getElementById(styleId);
      if (element) {
        element.remove();
      }
    };
  }, []); // 空依賴陣列，只執行一次

  const isTagDraggingRef = useRef(false)
  const { setSelectedFragment } = useFragmentsStore()
  const [selectedFragment, setSelectedFragmentState] = useState<Fragment | null>(null)
  const [positions, setPositions] = useState<PositionsMap>({})
  const positionsRef = useRef<PositionsMap>({})
  const [, forceUpdate] = useState({})
  const containerRef = useRef<HTMLDivElement>(null)
  const isInitialLoadRef = useRef(true)

  const handleLogin = () => {
    window.location.href = '/login'
  }
  
  const [user, setUser] = useState<any>(null)
  useEffect(() => {
    const supabase = getSupabaseClient()
    if (!supabase) return

    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])
  
  // 使用 hover scrollbar hook
  const { hovering: showScrollbar, bind: scrollbarBind } = useHoverScrollbar(30)
  
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

  // 從 localStorage 加載位置信息
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

        // 雲端同步每個更新的位置
        Object.entries(updatedPositions).forEach(([fragmentId, pos]) => {
          saveFragmentPositionToSupabase(fragmentId, pos)
        })

        forceUpdate({}) // 強制重新渲染

        return updatedPositions
      })
    }, []),
    refreshView
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
          const positionsToSave = JSON.parse(JSON.stringify(positions));
          localStorage.setItem(STORAGE_KEY_POSITIONS, JSON.stringify(positionsToSave));
          console.log('保存位置到 localStorage - 效果更新:', Object.keys(positionsToSave).length);
        } catch (error) {
          console.error('保存位置出錯:', error);
        }
      };
      
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

  // 智能拖曳滾動處理
  useEffect(() => {
    if (!draggingId || !containerRef.current) return;

    const container = containerRef.current;
    let scrollInterval: NodeJS.Timeout | null = null;

    const handleDragScroll = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const scrollThreshold = 50; // 距離邊緣多少像素開始滾動
      const scrollSpeed = 10;

      // 清除之前的滾動
      if (scrollInterval) {
        clearInterval(scrollInterval);
        scrollInterval = null;
      }

      // 檢查是否需要向上滾動
      if (e.clientY - rect.top < scrollThreshold && container.scrollTop > 0) {
        scrollInterval = setInterval(() => {
          container.scrollTop = Math.max(0, container.scrollTop - scrollSpeed);
        }, 16);
      }
      // 檢查是否需要向下滾動
      else if (rect.bottom - e.clientY < scrollThreshold) {
        scrollInterval = setInterval(() => {
          const maxScroll = container.scrollHeight - container.clientHeight;
          container.scrollTop = Math.min(maxScroll, container.scrollTop + scrollSpeed);
        }, 16);
      }
    };
  

    const stopDragScroll = () => {
      if (scrollInterval) {
        clearInterval(scrollInterval);
        scrollInterval = null;
      }
    };

    document.addEventListener('mousemove', handleDragScroll);
    document.addEventListener('mouseup', stopDragScroll);

    return () => {
      document.removeEventListener('mousemove', handleDragScroll);
      document.removeEventListener('mouseup', stopDragScroll);
      if (scrollInterval) clearInterval(scrollInterval);
    };
  }, [draggingId]);

  // 優化的內容區域計算
  const { contentWidth, contentHeight, minViewportHeight } = useMemo(() => {
    // 設定最小視窗高度
    const minHeight = Math.max(window.innerHeight * 0.7, 600);
    
    if (gridFragments.length === 0) {
      return { 
        contentWidth: CONTAINER_WIDTH, 
        contentHeight: minHeight,
        minViewportHeight: minHeight
      };
    }
    
    let maxWidth = 0;
    let maxHeight = 0;
    
    gridFragments.forEach(fragment => {
      const fragmentRight = (fragment.position.col + fragment.size.width + 1) * GRID_SIZE;
      const fragmentBottom = (fragment.position.row + fragment.size.height + 1) * GRID_SIZE;
      
      maxWidth = Math.max(maxWidth, fragmentRight);
      maxHeight = Math.max(maxHeight, fragmentBottom);
    });
    
    // 動態內容高度，但確保有足夠的滾動空間
    const dynamicHeight = Math.max(minHeight, maxHeight + 300);
    
    return { 
      contentWidth: Math.min(CONTAINER_WIDTH, maxWidth + 100),
      contentHeight: dynamicHeight,
      minViewportHeight: minHeight
    };
  }, [gridFragments]);

  return (
    <div className="fragments-container">
      {/* 提示信息 */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 0,
        backgroundColor: '#f9f6e9',
        padding: '8px 0',
        marginBottom: '12px',
        borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
        textAlign: 'center',
        color: '#666',
        fontSize: '13px'
      }}>
        可自由拖曳碎片
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
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#c4a877';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#d1b684';
          }}
        >
          重新排列碎片
        </button>
      </div>

      {/* 簡化的碎片網格容器 - 只保留必要樣式 */}
      <div 
        ref={containerRef}
        className={`fragments-grid-container ${showScrollbar ? 'show-scrollbar' : ''}`}
        {...scrollbarBind}
        style={{ 
          position: 'relative',
          background: '#f9f6e9',
          backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
          backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
          width: '100%',
          maxWidth: `${CONTAINER_WIDTH}px`,
          height: `${minViewportHeight}px`,
          maxHeight: '80vh',
          padding: '10px',
          margin: '0 auto',
          overflowX: 'hidden',
          overflowY: 'auto'
        }}
      >
        <div 
          className="grid-content"
          style={{
            position: 'relative',
            minHeight: `${contentHeight}px`,
            width: '100%'
          }}
        >
          {gridFragments.length === 0 ? (
            <div
              className="no-fragments-message"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 20px',
                color: '#8a7b5a',
                fontSize: '16px',
                backgroundColor: 'rgba(255, 252, 245, 0.85)',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                backdropFilter: 'blur(5px)',
                maxWidth: '300px',
                textAlign: 'center'
              }}
            >
              {!user ? (
                <>
                  <div style={{ marginBottom: '16px' }}>請先登入以查看碎片</div>
                  <button
                    onClick={handleLogin}
                    className="flex items-center justify-center w-10 h-10 rounded-full border border-[#d1b684] bg-[#f9f6e9] hover:shadow-lg transition"
                    title="使用 Google 登入"
                  >
                    <img
                      src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                      alt="Google G"
                      className="w-5 h-5"
                    />
                  </button>
                </>
              ) : (
                <>暫無碎片。請使用頂部的輸入框添加新碎片。</>
              )}
            </div>
          ) : (
            gridFragments
              .filter(fragment => fragment.position)
              .map(fragment => (
                // 🎯 使用重構後的 GridFragmentCard
                <GridFragmentCard
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
                }}
                onTagDragStart={(e, tag, frag) => {
                  e.preventDefault()
                  e.stopPropagation()
                  startTagDrag(tag, e)
                  console.log('🟠 開始拖曳標籤:', tag, '來自 fragment:', frag.id)
                }}
                // ✅ 可選：添加自定義的刪除處理
                onDelete={(fragment) => {
                  // 自定義刪除邏輯，例如更新本地位置記錄
                  setPositions(prev => {
                    const updated = { ...prev }
                    delete updated[fragment.id]
                    localStorage.setItem('fragment_positions', JSON.stringify(updated))
                    return updated
                  })
                }}
              />
              ))
          )}
        </div>
         
        {/* 詳情彈窗 */}
        <FragmentDetailModal 
          fragment={selectedFragment} 
          onClose={handleCloseDetail} 
        />

        {/* 標籤拖曳預覽 */}
        {isTagDragging && draggingTag && tagDragPosition && (
          <TagDragPreview tag={draggingTag} position={tagDragPosition} />
        )}
      </div>
    </div>
  );
}