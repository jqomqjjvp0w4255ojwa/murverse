'use client'

import React, { useState, useRef, useEffect } from 'react'
import FuzzyBallIcon from '@/features/fragments/components/card/base/FuzzyBallIcon'
import { useFragmentsStore, useAppState } from '@/features/fragments/store/useFragmentsStore'
import { RotateCcw } from 'lucide-react'



const SourceIndicator: React.FC = () => {
  const { loadSource, isBackgroundRefreshing } = useAppState()
  const [isHovering, setIsHovering] = useState(false)
  const [showPopover, setShowPopover] = useState(false)
  const load = useFragmentsStore(state => state.load)
  const popoverRef = useRef<HTMLDivElement>(null)

  if (!loadSource && !isBackgroundRefreshing) return null

  let color = '#6cab8c'
  let baseVariant: 'none' | 'sway' | 'loading' = 'none'
  let tooltipText = ''
  let sourceLabel = ''

  if (isBackgroundRefreshing) {
    color = '#6a98c7'
    baseVariant = 'loading'
    tooltipText = '資料更新中...'
    sourceLabel = '⏳ 雲端同步中'
  } else if (loadSource === 'cache') {
    color = '#6cab8c'
    baseVariant = 'sway'
    tooltipText = '本地資料'
    sourceLabel = '📦 本地資料'
  } else if (loadSource === 'network') {
    color = '#dcae67'
    baseVariant = 'sway'
    tooltipText = '雲端資料'
    sourceLabel = '☁️ 雲端資料'
  }

  const variant = isHovering ? baseVariant : 'none'

  const handleRefresh = () => {
  load() // ✅ 呼叫 store 的 load 方法
  }

  useEffect(() => {
  function handleClickOutside(event: MouseEvent) {
    if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
      setShowPopover(false)
    }
  }

  if (showPopover) {
    document.addEventListener('mousedown', handleClickOutside)
  } else {
    document.removeEventListener('mousedown', handleClickOutside)
  }

  return () => {
    document.removeEventListener('mousedown', handleClickOutside)
  }
  }, [showPopover])

  return (
    <div
      className="absolute top-2 right-2 z-30 cursor-default"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => {
        setIsHovering(false)
      }}
    >
      <div
        onClick={() => setShowPopover(prev => !prev)}
        style={{ padding: '8px', borderRadius: '50%' }}
      >
        <FuzzyBallIcon
          size={25}
          color={color}
          variant={variant}
          isHovered={false}
        />
      </div>

      {showPopover && (
        
        <div
            ref={popoverRef}
            className="animate-fade-in"
            style={{
            position: 'absolute',
            top: '50%',
            left: '100%',
            transform: 'translateY(-50%) translateX(12px)',
            backgroundColor: '#fffdf6',
            border: '1px solid #e3dcc8',
            padding: '10px 14px',
            borderRadius: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            fontSize: '13px',
            color: '#555',
            whiteSpace: 'nowrap',
            zIndex: 40,
            minWidth: '160px',
          }}
        >
          {/* 尖角 */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '-8px',
              transform: 'translateY(-50%)',
              width: 0,
              height: 0,
              borderTop: '8px solid transparent',
              borderBottom: '8px solid transparent',
              borderRight: '8px solid #fffdf6',
              filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.05))'
            }}
          />

          <div style={{ marginBottom: '4px', fontWeight: 500 }}>{sourceLabel}</div>
          <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '8px' }}>
            來源：{loadSource === 'cache' ? '本地快取' : '雲端'}<br/>
            狀態：{isBackgroundRefreshing ? '同步中...' : '已同步'}
          </div>
          <button
            onClick={handleRefresh}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#f3f0e2',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 10px',
              cursor: 'pointer',
              fontSize: '12px',
              color: '#444',
            }}
          >
            <RotateCcw size={14} /> 重新整理
          </button>
        </div>
      )}
    </div>
  )
}

export default SourceIndicator
