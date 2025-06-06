// 📄 src/features/fragments/components/card/base/FragmentContent.tsx

import React from 'react'
import { GridFragment } from '@/features/fragments/types/gridTypes'
import { useHoverScrollbar } from '@/features/interaction/useHoverScrollbar'

interface FragmentContentProps {
  fragment: GridFragment
  displayedContent: string
  showMoreContent: boolean
  maxHeight: string
  style?: React.CSSProperties
  layout?: 'vertical' | 'horizontal' | 'flow'
}

const FragmentContent = ({ 
  fragment, 
  displayedContent, 
  showMoreContent, 
  maxHeight,
  style = {},
  layout = 'horizontal'
}: FragmentContentProps) => {
  const contentScrollbar = useHoverScrollbar(15)
  
  if (fragment.showContent === false) return null
  
  // 根據佈局調整樣式
  const getLayoutSpecificStyle = () => {
    switch (layout) {
      case 'vertical':
        return {
          writingMode: 'vertical-rl' as const,
          textOrientation: 'mixed' as const,
          height: '100%'
        }
      case 'flow':
        return {
          lineHeight: '1.6'
        }
      default:
        return {
          lineHeight: '1.4'
        }
    }
  }
  
  return (
    <div 
      {...contentScrollbar.bind}
      className={contentScrollbar.hovering ? 'hover-scrollbar-visible' : 'hover-scrollbar-hidden'}
      style={{
        overflowWrap: 'break-word',
        overflow: showMoreContent ? 'auto' : 'hidden',
        fontSize: `${fragment.fontSize}px`,
        color: '#333',
        maxHeight,
        display: 'block',
        paddingRight: contentScrollbar.hovering ? '8px' : '0',
        transition: 'padding-right 0.2s ease',
        scrollbarWidth: contentScrollbar.hovering ? 'thin' : 'none',
        scrollbarColor: contentScrollbar.hovering ? '#ccc transparent' : 'transparent',
        ...getLayoutSpecificStyle(),
        ...style
      }}
    >
      {displayedContent}
    </div>
  )
}

export default FragmentContent