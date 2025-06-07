// 📄 src/features/fragments/components/card/base/FragmentNotes.tsx

import React from 'react'
import { GridFragment } from '@/features/fragments/types/gridTypes'
import { useHoverScrollbar } from '@/features/interaction/useHoverScrollbar'

const MIN_FONT_SIZE = 12

interface FragmentNotesProps {
  fragment: GridFragment
  displayedNote: string
  showMoreNote: boolean
  maxHeight: string
  layout?: 'vertical' | 'horizontal' | 'flow'
}

const FragmentNotes = ({ 
  fragment, 
  displayedNote, 
  showMoreNote, 
  maxHeight,
  layout = 'horizontal'
}: FragmentNotesProps) => {
  const noteScrollbar = useHoverScrollbar(15)
  
  const showNotes = fragment.showNote !== false && fragment.notes && fragment.notes.length > 0
  if (!showNotes || !displayedNote) return null
  
  return (
    <div
      {...noteScrollbar.bind}
      className={noteScrollbar.hovering ? 'hover-scrollbar-visible' : 'hover-scrollbar-hidden'}
      style={{
        overflow: showMoreNote ? 'auto' : 'hidden',
        maxHeight,
        transition: 'max-height 0.3s ease',
        fontSize: `${Math.max(MIN_FONT_SIZE, fragment.fontSize - 2)}px`,
        color: '#666',
        paddingRight: noteScrollbar.hovering ? '6px' : '0',
        scrollbarWidth: noteScrollbar.hovering ? 'thin' : 'none',
        scrollbarColor: noteScrollbar.hovering ? '#ccc transparent' : 'transparent',
      }}
    >
      {fragment.notes[0]?.title && (
      <div style={{
        fontSize: '11px',
        fontWeight: 'bold',
        color: '#333',
        marginBottom: '2px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: '100%',
      }}>
        {fragment.notes[0].title}
      </div>
    )}
      <div
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: showMoreNote ? 'unset' : layout === 'vertical' ? 10 : 0,
          whiteSpace: showMoreNote ? 'normal' : 'pre-line',
        }}
      >
        {displayedNote}
      </div>
    </div>
  )
}

export default FragmentNotes