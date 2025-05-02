'use client'

import { useEffect, useRef, useState } from 'react'
import { useFragmentsStore } from '@/stores/useFragmentsStore'
import { Fragment } from '@/types/fragment'

type FloatingFragment = {
  id: string
  cx: number
  cy: number
  x: number
  y: number
  content: string
  fontSize: number
  driftOffset: number // 個別漂浮時間偏移，讓呼吸更自然
}

export default function FloatingFragmentsField() {
  const {
    fragments,
    selectedTags,
    excludedTags,
    tagLogicMode, // 添加 tagLogicMode 以顯示當前模式（僅用於調試）
    setSelectedFragment,
    load,
    getFilteredFragments // 使用新的篩選方法
  } = useFragmentsStore()

  const [floatingFragments, setFloatingFragments] = useState<FloatingFragment[]>([])
  const requestRef = useRef<number | null>(null)
  const dragState = useRef<{ isDragging: boolean, draggedId: string | null }>({
    isDragging: false,
    draggedId: null,
  })
  const dragStartPos = useRef<{ startX: number, startY: number }>({ startX: 0, startY: 0 })
  const dragTimeout = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (fragments.length === 0) return

    const width = window.innerWidth
    const height = window.innerHeight

    // 使用 getFilteredFragments 方法來獲取已篩選的碎片
    // 這樣就會根據 tagLogicMode 使用正確的 AND/OR 邏輯
    const filtered = getFilteredFragments()

    const columns = Math.ceil(Math.sqrt(filtered.length))
    const spacingX = width * 0.5 / columns
    const spacingY = height * 0.5 / columns

    const arranged = filtered.map((fragment, index) => {
      const row = Math.floor(index / columns)
      const col = index % columns

      const baseX = width * 0.25 + col * spacingX
      const baseY = height * 0.25 + row * spacingY

      return {
        id: fragment.id,
        content: fragment.content,
        cx: baseX,
        cy: baseY,
        x: baseX,
        y: baseY,
        fontSize: 16 + (Math.random() * 4 - 2),
        driftOffset: Math.random() * 1000, // 每個碎片一個不同的呼吸時間偏移
      }
    })

    setFloatingFragments(arranged)

  }, [fragments, selectedTags, excludedTags, tagLogicMode, getFilteredFragments]) // 添加 tagLogicMode 作為依賴項

  useEffect(() => {
    const animate = () => {
      const now = Date.now() / 1000

      setFloatingFragments((prev) =>
        prev.map((frag) => {
          const offsetX = Math.sin(now + frag.driftOffset) * 8
          const offsetY = Math.cos(now + frag.driftOffset) * 8

          return {
            ...frag,
            x: frag.cx + offsetX,
            y: frag.cy + offsetY,
          }
        })
      )

      requestRef.current = requestAnimationFrame(animate)
    }

    requestRef.current = requestAnimationFrame(animate)

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
    }
  }, [])

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    dragStartPos.current = { startX: e.clientX, startY: e.clientY }
    dragTimeout.current = setTimeout(() => {
      dragState.current.isDragging = true
      dragState.current.draggedId = id
    }, 300)
  }

  const handleMouseUp = (e: React.MouseEvent, id: string) => {
    if (dragTimeout.current) {
      clearTimeout(dragTimeout.current)
      dragTimeout.current = null
    }

    if (dragState.current.isDragging) {
      dragState.current.isDragging = false
      dragState.current.draggedId = null
    } else {
      const fragment = fragments.find((f) => f.id === id)
      if (fragment) setSelectedFragment(fragment)
    }
  }

  const handleMouseMove = (e: React.MouseEvent, id: string) => {
    if (dragState.current.isDragging && dragState.current.draggedId === id) {
      setFloatingFragments((prev) =>
        prev.map((frag) => {
          if (frag.id === id) {
            return {
              ...frag,
              x: e.clientX,
              y: e.clientY,
            }
          }
          return frag
        })
      )
    }
  }

  return (
    <div className="relative w-full h-full overflow-visible">
      {floatingFragments.map((frag) => (
        <div
          key={frag.id}
          onMouseDown={(e) => handleMouseDown(e, frag.id)}
          onMouseUp={(e) => handleMouseUp(e, frag.id)}
          onMouseMove={(e) => handleMouseMove(e, frag.id)}
          className={`absolute pointer-events-auto px-3 py-2 rounded shadow bg-white text-black opacity-80 select-none ${
            dragState.current.isDragging && dragState.current.draggedId === frag.id
              ? 'cursor-move'
              : 'cursor-pointer'
          }`}
          style={{
            left: `${frag.x}px`,
            top: `${frag.y}px`,
            fontSize: `${frag.fontSize}px`,
            whiteSpace: 'nowrap',
          }}
        >
          {frag.content}
        </div>
      ))}
    </div>
  );
}