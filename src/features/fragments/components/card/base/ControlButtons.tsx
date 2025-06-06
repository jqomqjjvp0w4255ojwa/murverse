// 📄 src/features/fragments/components/card/base/ControlButtons.tsx

import React from 'react'

const BUTTON_HEIGHT = 22

interface ControlButtonsProps {
  needContentExpand: boolean
  needNoteExpand: boolean
  showMoreContent: boolean
  showMoreNote: boolean
  onToggleContent: (e: React.MouseEvent) => void
  onToggleNote: (e: React.MouseEvent) => void
  layout?: 'vertical' | 'horizontal' | 'flow'
  contentHovering?: boolean
  noteHovering?: boolean
}

const ControlButtons = ({ 
  needContentExpand, 
  needNoteExpand, 
  showMoreContent, 
  showMoreNote, 
  onToggleContent, 
  onToggleNote,
  layout = 'horizontal',
  contentHovering = false,
  noteHovering = false
}: ControlButtonsProps) => {
  if (!needContentExpand && !needNoteExpand) return null
  
  const isVertical = layout === 'vertical'
  
  const buttonStyle: React.CSSProperties = {
    border: 'none',
    background: 'rgba(255, 251, 239, 0.8)',
    color: '#666',
    fontSize: '11px',
    cursor: 'pointer',
    padding: isVertical ? '4px 2px' : '2px 6px',
    borderRadius: '4px',
    transition: 'all 0.2s ease',
    opacity: contentHovering || noteHovering ? 1 : 0.7,
    ...(isVertical && {
      writingMode: 'vertical-rl',
      textOrientation: 'upright'
    })
  }
  
  const containerStyle: React.CSSProperties = isVertical 
    ? {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        height: '100%',
        marginLeft: '4px',
        marginRight: '4px',
        width: '20px',
      }
    : {
        display: 'flex',
        justifyContent: 'flex-start',
        flexWrap: 'wrap',
        gap: '6px',
        height: `${BUTTON_HEIGHT}px`,
        marginTop: '6px',
        marginBottom: '6px',
      }
  
  return (
    <div style={containerStyle}>
      {needNoteExpand && (
        <button
          onClick={onToggleNote}
          style={{
            ...buttonStyle,
            marginBottom: isVertical ? '4px' : '0',
            opacity: noteHovering ? 1 : buttonStyle.opacity,
          }}
        >
          {showMoreNote ? '收合' : '更多'}
        </button>
      )}
      {needContentExpand && (
        <button
          onClick={onToggleContent}
          style={{
            ...buttonStyle,
            marginBottom: '0',
            opacity: contentHovering ? 1 : buttonStyle.opacity,
          }}
        >
          {showMoreContent ? '收合' : '更多'}
        </button>
      )}
    </div>
  )
}

export default ControlButtons