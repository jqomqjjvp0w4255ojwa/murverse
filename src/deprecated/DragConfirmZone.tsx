'use client'
// components/fragments/DragConfirmZone.tsx
import React, { RefObject } from 'react'

interface DragConfirmZoneProps {
  isActive: boolean
  zoneRef: RefObject<HTMLDivElement | null> // 修改這裡以接受 null 值
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  icon?: string
  label?: string
}

export default function DragConfirmZone({
  isActive,
  zoneRef,
  onDragOver,
  onDragLeave,
  onDrop,
  icon = '🗑️',
  label
}: DragConfirmZoneProps) {
  if (!isActive) return null
  
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 100,
      }}
    >
      <div
        ref={zoneRef as RefObject<HTMLDivElement>} // 使用類型轉換
        style={{
          position: 'fixed',
          top: '0',
          left: '0',
          width: '50px',
          height: '50px',
          pointerEvents: 'all',
        }}
        className="flex items-center justify-center border-2 border-dashed border-red-500 rounded-full bg-white bg-opacity-70 transition-all"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <span className="text-red-500 text-lg">{icon}</span>
        {label && <span className="text-xs text-red-500 ml-1">{label}</span>}
      </div>
    </div>
  )
}