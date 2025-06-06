// 📄 src/features/fragments/components/card/base/FragmentTags.tsx

import React from 'react'
import { GridFragment } from '@/features/fragments/types/gridTypes'
import TagButton from '../../TagButton'

interface FragmentTagsProps {
  tags: string[]
  onTagClick: (tagName: string, e: React.MouseEvent) => void
  onTagDragStart: (e: React.MouseEvent, tagName: string) => void
  layout?: 'vertical' | 'horizontal' | 'flow'
  maxTags?: number
}

const FragmentTags = ({ 
  tags, 
  onTagClick, 
  onTagDragStart, 
  layout = 'horizontal',
  maxTags = 20
}: FragmentTagsProps) => {
  if (!tags.length) return null
  
  const displayTags = tags.slice(0, maxTags)
  
  const getContainerStyle = (): React.CSSProperties => {
    switch (layout) {
      case 'vertical':
        return {
          display: 'flex',
          flexDirection: 'column',
          flexWrap: 'wrap',
          direction: 'rtl',
          gap: '4px',
          height: '100%',
          justifyContent: 'flex-start',
          overflow: 'auto',
          width: 'auto',
          minWidth: '30px',
          maxWidth: '120px',
          paddingRight: '8px',
        }
      case 'flow':
        return {
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
          justifyContent: 'flex-start',
          marginTop: '8px',
        }
      default: // horizontal
        return {
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
          justifyContent: 'flex-start',
          maxHeight: '60px',
          overflow: 'hidden',
          flex: 'none',
          paddingTop: '4px',
          marginTop: '5px',
        }
    }
  }
  
  const getTagStyle = (): React.CSSProperties | undefined => {
    if (layout === 'vertical') {
      return {
        writingMode: 'vertical-rl',
        textOrientation: 'upright',
        maxHeight: '60px',
        flexShrink: 0,
      }
    }
    return undefined
  }
  
  return (
    <div style={getContainerStyle()}>
      {displayTags.map(tag => (
        <TagButton
          key={tag}
          tag={tag}
          style={getTagStyle()}
          onTagClick={onTagClick}
          onTagDragStart={onTagDragStart}
        />
      ))}
    </div>
  )
}

export default FragmentTags