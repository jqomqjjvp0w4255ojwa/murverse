// TagDragPreview.tsx
import React from 'react'

export default function TagDragPreview({
  tag,
  position,
}: {
  tag: string
  position: { x: number; y: number }
}) {
  if (!position) return null

  return (
   <div
    style={{
        position: 'fixed',
        top: position.y,
        left: position.x,
        transform: 'translate(-100%, -100%)',
        backgroundColor: '#f3e8c7',
        color: '#8d6a38',
        borderRadius: '12px',
        padding: '4px 10px',
        fontSize: '10px',
        whiteSpace: 'nowrap',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 9999,
        pointerEvents: 'none',
    }}
    >
    {tag}
    </div>
  )
}