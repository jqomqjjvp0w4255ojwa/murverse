import React from 'react'

interface TagButtonProps {
  tag: string
  onTagClick?: (tag: string, e: React.MouseEvent) => void  // 修改為接受事件
  onTagDragStart?: (e: React.MouseEvent, tag: string) => void
  style?: React.CSSProperties
}

const TagButton: React.FC<TagButtonProps> = ({
  tag,
  onTagClick,
  onTagDragStart,
  style = {},
}) => {
  return (
    <div
      className="tag-button"
      onClick={(e) => {
        e.stopPropagation()
        if (onTagClick) onTagClick(tag, e)  // 將事件傳遞給父組件
      }}
      onMouseDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (onTagDragStart) onTagDragStart(e, tag)
      }}
      style={{
        backgroundColor: '#f3e8c7',
        color: '#8d6a38',
        borderRadius: '12px',
        padding: '2px 6px',
        fontSize: '10px',
        whiteSpace: 'nowrap',
        cursor: 'grab',
        ...style,
      }}
    >
      {tag}
    </div>
  )
}

export default TagButton