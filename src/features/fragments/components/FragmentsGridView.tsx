// 📄 精簡版 FragmentsGridView.tsx - 只包含必要修改
'use client'

import { useTagDragManager } from '@/features/fragments/layout/useTagDragManager'
import { LoadSource } from '@/features/fragments/store/useFragmentsStore'
import TagDragPreview from './TagDragPreview'
import { useHoverScrollbar } from '@/features/interaction/useHoverScrollbar'
import FuzzyBallIcon from '@/features/fragments/components/card/base/FuzzyBallIcon'
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useFragmentsStore, useAppState, AppStatus } from '@/features/fragments/store/useFragmentsStore'
import { Fragment } from '@/features/fragments/types/fragment'
import { 
  PixelPosition, 
  GridFragment, 
  GridPosition,
  RelevanceMap 
} from '@/features/fragments/types/gridTypes'
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

type PositionsMap = Record<string, { row: number, col: number }>;
const STORAGE_KEY_POSITIONS = 'fragment_positions';

type FragmentsGridViewProps = {
  relevanceMap?: RelevanceMap;
  resetLayout?: boolean;
}

export default function FragmentsGridView({
  relevanceMap = {},
  resetLayout = false
}: FragmentsGridViewProps) {

  // 🔧 修改：使用簡化的狀態管理
  const { fragments, setSelectedFragment } = useFragmentsStore()
  const { 
     status, 
      error, 
      hasInitialized,
      isLoading,
      hasFragments,
      initialize: initializeApp,
      // 🚀 新增這些
      loadSource,
      isFromCache,
      isFromNetwork,
      clearCache,
      getCacheStats
  } = useAppState()

  // 基本狀態
  const isTagDraggingRef = useRef(false)
  const [selectedFragment, setSelectedFragmentState] = useState<Fragment | null>(null)
  const [positions, setPositions] = useState<PositionsMap>({})
  const positionsRef = useRef<PositionsMap>({})
  const [, forceUpdate] = useState({})
  const containerRef = useRef<HTMLDivElement>(null)
  const isInitialLoadRef = useRef(true)
  const shouldShowLoading = status === AppStatus.LOADING || fragments === null
  const shouldShowEmpty = !shouldShowLoading && Array.isArray(fragments) && fragments.length === 0

  // 登入處理
  const handleLogin = () => {
    window.location.href = '/login'
  }

  // 🔧 修改：簡化初始化
  useEffect(() => {
    initializeApp()
  }, [])

  // 重置布局處理
  useEffect(() => {
    if (resetLayout) {
      localStorage.removeItem(STORAGE_KEY_POSITIONS);
      setPositions({});
      positionsRef.current = {};
    }
  }, [resetLayout]);

  // 載入本地位置信息
  useEffect(() => {
    if (!isInitialLoadRef.current) return;
    
    try {
      const savedPositions = localStorage.getItem(STORAGE_KEY_POSITIONS);
      if (savedPositions) {
        const loadedPositions = JSON.parse(savedPositions);
        setPositions(loadedPositions);
        positionsRef.current = loadedPositions;
      }
    } catch (error) {
      console.error('載入位置出錯:', error);
    }
    
    isInitialLoadRef.current = false;
  }, []);

  const { hovering: showScrollbar, bind: scrollbarBind } = useHoverScrollbar(30)
  
  // 🔧 修改：處理 null 情況
  const directionMap = useMemo(() => createDirectionMap(fragments || []), [fragments]);
  
  const refreshView = useCallback(() => {
    forceUpdate({});
  }, []);

  // 🔧 修改：處理 null 情況
  const { gridFragments, newPositions } = useLayoutFragments(
    fragments || [],
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

        for (const [id, pos] of Object.entries(updatedPositions)) {
          if (pos.row === 0 && pos.col === 0) {
            delete updatedPositions[id]
          }
        }

        positionsRef.current = updatedPositions

        try {
          localStorage.setItem(STORAGE_KEY_POSITIONS, JSON.stringify(updatedPositions))
        } catch (error) {
          console.error('保存位置出錯:', error)
        }

        Object.entries(updatedPositions).forEach(([fragmentId, pos]) => {
          saveFragmentPositionToSupabase(fragmentId, pos)
        })

        forceUpdate({})
        return updatedPositions
      })
    }, []),
    refreshView
  );

  const handleFragmentClick = useCallback((fragment: Fragment) => {
    if (draggingId || wasDraggingRef.current) return
    setSelectedFragmentState(fragment)
    setSelectedFragment(fragment)
  }, [draggingId, setSelectedFragment])

  const handleCloseDetail = useCallback(() => {
    setSelectedFragmentState(null)
  }, []);

  // 合併新位置
  useEffect(() => {
    setPositions(prev => {
      const updated = { ...prev }
      let hasNew = false

      for (const [id, pos] of Object.entries(newPositions)) {
        if (!(id in prev) && !(pos.row === 0 && pos.col === 0)) {
          updated[id] = pos
          hasNew = true
        }
      }

      if (hasNew) {
        localStorage.setItem(STORAGE_KEY_POSITIONS, JSON.stringify(updated))
        return updated
      }

      return prev
    })
  }, [newPositions])

  // 🔧 修改：清理無效位置時檢查 null
  useEffect(() => {
    if (!fragments) return
    
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
  }, [fragments, positions])

  // 保存位置到本地存儲
  useEffect(() => {
    if (Object.keys(positions).length > 0 && !isInitialLoadRef.current) {
      try {
        localStorage.setItem(STORAGE_KEY_POSITIONS, JSON.stringify(positions));
      } catch (error) {
        console.error('保存位置出錯:', error);
      }
    }
  }, [positions]);

  // 標籤拖曳事件處理
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
      const scrollThreshold = 50;
      const scrollSpeed = 10;

      if (scrollInterval) {
        clearInterval(scrollInterval);
        scrollInterval = null;
      }

      if (e.clientY - rect.top < scrollThreshold && container.scrollTop > 0) {
        scrollInterval = setInterval(() => {
          container.scrollTop = Math.max(0, container.scrollTop - scrollSpeed);
        }, 16);
      }
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

  // 計算容器尺寸
  const { contentWidth, contentHeight, minViewportHeight } = useMemo(() => {
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
    
    const dynamicHeight = Math.max(minHeight, maxHeight + 300);
    
    return { 
      contentWidth: Math.min(CONTAINER_WIDTH, maxWidth + 100),
      contentHeight: dynamicHeight,
      minViewportHeight: minHeight
    };
  }, [gridFragments]);

  // 🔧 超級簡化：狀態顯示組件
  const StatusDisplay = ({ status }: { status: AppStatus }) => {
    const centerStyle = {
      position: 'absolute' as const,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      display: 'flex',
      flexDirection: 'column' as const,
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
      textAlign: 'center' as const
    }

    switch (status) {
      case AppStatus.LOADING:
        return (
          <div style={centerStyle}>
            <FuzzyBallIcon size={40} variant="sway" />
            <div style={{ marginTop: '12px' }}>載入中...</div>
            {/* 🚀 新增：顯示加載來源提示 */}
            {isFromCache && (
              <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.7 }}>
                ⚡ 從緩存快速載入
              </div>
            )}
          </div>
        )

      case AppStatus.UNAUTHENTICATED:
        return (
          <div style={centerStyle}>
            <div style={{ marginBottom: '16px' }}>請先登入以查看</div>
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
          </div>
        )

      case AppStatus.ERROR:
        return (
          <div style={centerStyle}>
            <div style={{ marginBottom: '16px', color: '#d32f2f' }}>
              {error || '發生錯誤'}
            </div>
            <button
              onClick={() => initializeApp()}
              className="px-4 py-2 bg-[#d1b684] text-white rounded-md hover:bg-[#c4a877] transition-colors"
            >
              重試
            </button>
          </div>
        )

      case AppStatus.EMPTY:
      return (
        <div style={centerStyle}>
          <FuzzyBallIcon size={40} variant="sway" />
          <div style={{ marginTop: '12px' }}>無碎片。</div>
          {/* 🚀 新增：顯示數據來源 */}
          {loadSource && (
            <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.7 }}>
              {isFromCache ? '緩存數據' : '🌐 網絡數據'}
            </div>
          )}
        </div>
      )

      default:
        return null
    }
  }

  // 渲染碎片網格
  const renderFragments = () => {
    return gridFragments
      .filter(fragment => fragment.position)
      .map(fragment => (
        <GridFragmentCard
          key={fragment.id}
          fragment={fragment}
          isSelected={selectedFragment?.id === fragment.id}
          isDragging={isDragging(fragment.id)}
          dragPosition={draggingId === fragment.id ? dragPosition : { top: 0, left: 0 }}
          isValidDragTarget={isValidDragTarget}
          previewPosition={previewRelocations[fragment.id]}
          validationState={draggingId === fragment.id ? validationState : 'valid'}
          onFragmentClick={handleFragmentClick}
          onDragStart={handleDragStart}
          onTagClick={(tag, frag) => {
            // 標籤點擊處理
          }}
          onTagDragStart={(e, tag, frag) => {
            e.preventDefault()
            e.stopPropagation()
            startTagDrag(tag, e)
          }}
        />
      ))
  }

  // 重置位置處理
  const handleResetLayout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_POSITIONS)
    setPositions({})
    positionsRef.current = {}
  }, [])

  return (
    
    <div className="fragments-container">
       
      <div style={{
        textAlign: 'center',
        marginBottom: '12px',
        display: 'flex',
        justifyContent: 'center',
        gap: '8px'  // 🚀 新增間距
      }}>
        <button
          onClick={handleResetLayout}
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

          
          {/* 🔧 修復：正確的狀態判斷優先級 */}
          

          {shouldShowLoading ? (
            <StatusDisplay status={AppStatus.LOADING} />
          ) : status === AppStatus.UNAUTHENTICATED ? (
            <StatusDisplay status={AppStatus.UNAUTHENTICATED} />
          ) : status === AppStatus.ERROR ? (
            <StatusDisplay status={AppStatus.ERROR} />
          ) : hasFragments ? (
            renderFragments()
          ) : shouldShowEmpty ? (
            <StatusDisplay status={AppStatus.EMPTY} />
          ) : (
            <StatusDisplay status={AppStatus.LOADING} />
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