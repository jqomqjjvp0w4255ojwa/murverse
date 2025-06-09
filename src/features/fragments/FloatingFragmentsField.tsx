// 🚀 優化後的 FloatingFragmentsField.tsx - 修復狀態處理
'use client'

import { useState, useMemo, useEffect } from 'react'
import { useFragmentsStore, useAppState } from '@/features/fragments/store/useFragmentsStore'
import { useSearchStore } from '@/features/search/useSearchStore'
import { getRelevanceMap } from '@/features/fragments/layout/getRelevanceMap'
import FragmentsGridView from '@/features/fragments/components/FragmentsGridView'
import FragmentsFlowView from '@/features/fragments/components/FragmentsFlowView'
import { VIEW_MODES, CONTAINER_WIDTH } from '@/features/fragments/constants'
import { GridPosition } from '@/features/fragments/types/gridTypes'
import SourceIndicator from '@/features/fragments/components/SourceIndicator'

export default function FloatingFragmentsField() {
  const [mode, setMode] = useState<'grid' | 'flow'>(VIEW_MODES.GRID)
  
  const keyword = useSearchStore(state => state.keyword)
  const searchResults = useSearchStore(state => state.searchResults)
  const selectedTags = useSearchStore(state => state.selectedTags)
  const excludedTags = useSearchStore(state => state.excludedTags)
  const [positions, setPositions] = useState<Record<string, GridPosition>>({});

  const shouldResetLayout = useMemo(() => {
    return keyword.trim().length > 0 || selectedTags.length > 0 || excludedTags.length > 0;
  }, [keyword, selectedTags, excludedTags]);
  
  // 窗口大小響應
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : CONTAINER_WIDTH,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  });

  // 監聽窗口大小變化
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 篩選變化處理
  useEffect(() => {
    if (shouldResetLayout) {
      localStorage.removeItem('fragment_positions');
      setPositions({});
      console.log('篩選變化，清除位置 → 將重新布局');
    }
  }, [shouldResetLayout]);

  // 🔧 修復：為 FlowView 獲取篩選後的碎片，處理 null 狀態
  const { fragments } = useFragmentsStore()
  const filteredFragmentsForFlow = useMemo(() => {
    // 🎯 處理 null 狀態
    if (!fragments) return []
    
    const hasKeyword = keyword.trim().length > 0
    const hasTagFilter = selectedTags.length > 0 || excludedTags.length > 0
    const hasEffectiveFilter = hasKeyword || hasTagFilter
    
    return hasEffectiveFilter ? searchResults : fragments
  }, [fragments, keyword, searchResults, selectedTags, excludedTags])

  return (
    <div className="floating-fragments-container relative w-full h-full" 
         style={{ 
           backgroundColor: '#f9f6e9', 
           minHeight: '100vh', 
           padding: '20px',
           overflowX: 'hidden'
         }}>
      <h1 style={{ textAlign: 'center', marginBottom: '20px', color: '#333' }}>
        語意筆記系統
      </h1>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        marginBottom: '20px', 
        gap: '10px' 
      }}>
        <button
          onClick={() => setMode(VIEW_MODES.GRID)}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '20px',
            backgroundColor: mode === VIEW_MODES.GRID ? '#f0e6d2' : '#eaeaea',
            color: mode === VIEW_MODES.GRID ? '#333' : '#888',
            fontWeight: mode === VIEW_MODES.GRID ? '600' : 'normal',
            cursor: 'pointer',
            boxShadow: mode === VIEW_MODES.GRID ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none'
          }}
        >
          拼圖排列模式
        </button>
        <button
          onClick={() => setMode(VIEW_MODES.FLOW)}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '20px',
            backgroundColor: mode === VIEW_MODES.FLOW ? '#f0e6d2' : '#eaeaea',
            color: mode === VIEW_MODES.FLOW ? '#333' : '#888',
            fontWeight: mode === VIEW_MODES.FLOW ? '600' : 'normal',
            cursor: 'pointer',
            boxShadow: mode === VIEW_MODES.FLOW ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none'
          }}
        >
          社群流動模式
        </button>
      </div>

      {/* ✅ 用這層控制對齊中心，保持原樣 */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        {/* ✅ 在這層內才放毛球（position: relative 是必要的） */}
        <div
          className="fragments-view-container"
          style={{
            position: 'relative',              // ⭐ 這層要 relative 才能讓裡面的 absolute 正確定位
            width: '100%',
            maxWidth: `${CONTAINER_WIDTH}px`,
            margin: '0 auto',
            backgroundColor: '#f9f6e9',
            backgroundImage: 'linear-gradient(...)',
            backgroundSize: '20px 20px',
            borderRadius: '8px',
            padding: '0px',
            minHeight: `${windowSize.height * 0.7}px`,
            overflow: 'visible'               // ⭐ 重點！不裁切毛球對話框
          }}
        >
          {/* ✅ 這裡的 position absolute 會以 .fragments-view-container 為基準 */}
          <div style={{
            position: 'absolute',
            top: '-16px',       // 可以微調位置
            right: '-16px',     // 貼右側一點
            zIndex: 30
          }}>
            <SourceIndicator />
          </div>

        
          {mode === VIEW_MODES.GRID ? (
            <FragmentsGridView 
              relevanceMap={{}}
              key={`grid-${shouldResetLayout ? 'reset' : 'normal'}`}
              resetLayout={shouldResetLayout}
            />
          ) : (
            <div style={{ padding: '8px' }}>
              <FragmentsFlowView 
                fragments={filteredFragmentsForFlow} 
                relevanceMap={{}}
              />
            </div>
          )}
        </div>
      </div>
      
      {/* 🔧 修復：碎片數量顯示 */}
      <FragmentCountDisplay 
        mode={mode}
        filteredFragmentsForFlow={filteredFragmentsForFlow}
        selectedTags={selectedTags}
      />
    </div>
  );
}

// 🔧 修復：獨立的碎片數量顯示組件
function FragmentCountDisplay({ 
  mode, 
  filteredFragmentsForFlow, 
  selectedTags 
}: {
  mode: 'grid' | 'flow'
  filteredFragmentsForFlow: any[]
  selectedTags: string[]
}) {
  // 🎯 使用簡化的狀態管理
  const { fragments } = useFragmentsStore()
  const { hasInitialized, hasFragments, isLoading } = useAppState()
  
  // 🎯 只在初始化完成後計算數量
  const displayCount = useMemo(() => {
    if (!hasInitialized) return null  // 未初始化完成，不顯示數量
    
    return mode === VIEW_MODES.GRID 
      ? (fragments?.length || 0)  // Grid 模式：總數
      : filteredFragmentsForFlow.length  // Flow 模式：篩選後數量
  }, [mode, fragments, filteredFragmentsForFlow, hasInitialized])

  // 🎯 載入中時顯示載入提示
  if (isLoading) {
    return (
      <div style={{ 
        textAlign: 'center', 
        margin: '20px 0', 
        color: '#bbb',
        fontSize: '14px' 
      }}>
        載入中...
      </div>
    )
  }

  return (
    <div style={{ 
      textAlign: 'center', 
      margin: '20px 0', 
      color: '#888',
      fontSize: '14px' 
    }}>
      共有 {displayCount} 個碎片
      {selectedTags.length > 0 && ` (已篩選: ${selectedTags.join(', ')})`}
      {mode === VIEW_MODES.GRID && displayCount !== null && (
        <div style={{ fontSize: '12px', marginTop: '4px', color: '#aaa' }}>
          拼圖模式：數據由網格視圖內部管理
        </div>
        
      )}

   
    </div>
  )
}