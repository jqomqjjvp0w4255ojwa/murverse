
// components/fragments/DragConfirmZone.tsx
/**
 * DragConfirmZone.tsx
 *
 * 📌 用途說明：
 * 這是一個拖曳確認區域元件，當 `isActive` 為 true 時會顯示在畫面上，
 * 作為可接受拖曳物件的 drop zone，常用於刪除、移動、歸檔等操作。
 *
 * 🧩 功能特色：
 * - 全畫面覆蓋層，只有在需要時顯示（如拖曳中）
 * - 接收拖曳事件：`onDragOver`, `onDragLeave`, `onDrop`
 * - 支援自訂圖示與標籤（例如 🗑️ +「拖曳以刪除」）
 * - 使用 `zoneRef` 提供外部程式取得該 DOM 節點座標（常見於動畫連結或判斷是否命中）
 *
 * ✅ 使用場景：
 * - 拖曳筆記／碎片到垃圾桶時觸發刪除
 * - 拖曳物件到特定位置以執行動作（例如歸檔區）
 */

'use client'
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