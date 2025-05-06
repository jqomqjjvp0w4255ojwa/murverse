'use client'

import { useState } from 'react'
import { useFragmentsStore } from '@/features/fragments/store/useFragmentsStore'
import { useSearchStore } from '@/features/search/useSearchStore'
import { getRelevanceMap } from '@/features/fragments/layout/getRelevanceMap'
import FragmentsGridView from '@/features/fragments/components/FragmentsGridView'
import FragmentsFlowView from '@/features/fragments/components/FragmentsFlowView'
import { useDragFragment } from '@/features/fragments/layout/useDragFragment'

export default function FloatingFragmentsField() {
  const [mode, setMode] = useState<'grid' | 'flow'>('grid')
  const { fragments } = useFragmentsStore()
  const keyword = useSearchStore(state => state.keyword)
  const searchResults = useSearchStore(state => state.searchResults)
  const selectedTags = useSearchStore(state => state.selectedTags)
  const excludedTags = useSearchStore(state => state.excludedTags)

  const hasKeyword = keyword.trim().length > 0
  const hasTagFilter = selectedTags.length > 0 || excludedTags.length > 0
  const hasEffectiveFilter = hasKeyword || hasTagFilter
  const filtered = hasEffectiveFilter ? searchResults : fragments

  const relevanceMap = getRelevanceMap(filtered, selectedTags)

  return (
    <div className="relative w-full h-full" 
         style={{ backgroundColor: '#f9f6e9', minHeight: '100vh', padding: '20px' }}>
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
          onClick={() => setMode('grid')}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '20px',
            backgroundColor: mode === 'grid' ? '#f0e6d2' : '#eaeaea',
            color: mode === 'grid' ? '#333' : '#888',
            fontWeight: mode === 'grid' ? '600' : 'normal',
            cursor: 'pointer',
            boxShadow: mode === 'grid' ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none'
          }}
        >
          拼圖排列模式
        </button>
        <button
          onClick={() => setMode('flow')}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '20px',
            backgroundColor: mode === 'flow' ? '#f0e6d2' : '#eaeaea',
            color: mode === 'flow' ? '#333' : '#888',
            fontWeight: mode === 'flow' ? '600' : 'normal',
            cursor: 'pointer',
            boxShadow: mode === 'flow' ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none'
          }}
        >
          社群流動模式
        </button>
      </div>

      <div style={{
        position: 'relative',
        margin: '0 auto',
        width: '100%',
        maxWidth: '1200px',
        minHeight: '700px',
        backgroundColor: '#f9f6e9',
        backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        borderRadius: '8px',
        padding: '8px',
        overflow: 'hidden'
      }}>
        {mode === 'grid' ? (
          <FragmentsGridView fragments={filtered} relevanceMap={relevanceMap} />
        ) : (
          <FragmentsFlowView fragments={filtered} relevanceMap={relevanceMap} />
        )}
      </div>
    </div>
  )
}