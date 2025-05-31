'use client'

import { useState, useMemo, useEffect } from 'react'
import { useFragmentsStore } from '@/features/fragments/store/useFragmentsStore'
import { useSearchStore } from '@/features/search/useSearchStore'
import { getRelevanceMap } from '@/features/fragments/layout/getRelevanceMap'
import FragmentsGridView from '@/features/fragments/components/FragmentsGridView' // 更新為虛擬列表版本
import FragmentsFlowView from '@/features/fragments/components/FragmentsFlowView'
import { VIEW_MODES, CONTAINER_WIDTH } from '@/features/fragments/constants'
import { GridPosition } from '@/features/fragments/types/gridTypes'

export default function FloatingFragmentsField() {
  const [mode, setMode] = useState<'grid' | 'flow'>(VIEW_MODES.GRID)
  const { fragments } = useFragmentsStore()
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

  // 決定要顯示哪些碎片
  const filteredFragments = useMemo(() => {
    const hasKeyword = keyword.trim().length > 0
    const hasTagFilter = selectedTags.length > 0 || excludedTags.length > 0
    const hasEffectiveFilter = hasKeyword || hasTagFilter
    
    return hasEffectiveFilter ? searchResults : fragments
  }, [fragments, keyword, searchResults, selectedTags, excludedTags])

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

  // 篩選變化時清除位置信息的 useEffect
  useEffect(() => {
    // 當篩選結果變化時，清除位置信息
    localStorage.removeItem('fragment_positions');
    setPositions({});
    
    console.log('篩選變化，清除位置 → 將重新布局');
    // 通過 key 和 resetLayout 標誌來通知 GridView
  }, [filteredFragments]);

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

      <div className="fragments-view-container"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: `${CONTAINER_WIDTH}px`,
          margin: '0 auto',
          backgroundColor: '#f9f6e9',
          backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          borderRadius: '8px',
          padding: '0px',
          height: 'auto',
          minHeight: `${windowSize.height * 0.7}px`,
          overflow: 'hidden'
        }}
      >
        {mode === VIEW_MODES.GRID ? (
        <FragmentsGridView 
          fragments={filteredFragments} 
          relevanceMap={{}} // 傳遞空的 relevanceMap，不再使用相關性
          key={`grid-${filteredFragments.length}`} // 使用動態 key 觸發完全重新渲染
          resetLayout={shouldResetLayout} // 根據篩選條件決定是否重置布局
        />
      ) : (
        <div style={{ padding: '8px' }}>
          <FragmentsFlowView 
            fragments={filteredFragments} 
            relevanceMap={{}} // 同樣使用空的 relevanceMap
          />
        </div>
      )}
      </div>
      
      {/* 碎片數量提示 */}
      <div style={{ 
        textAlign: 'center', 
        margin: '20px 0', 
        color: '#888',
        fontSize: '14px' 
      }}>
        共有 {filteredFragments.length} 個碎片
        {selectedTags.length > 0 && ` (已篩選: ${selectedTags.join(', ')})`}
      </div>
    </div>
  );
}