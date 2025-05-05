'use client'

import { useEffect, useRef, useState } from 'react'
import { useFragmentsStore } from '@/features/fragments/store/useFragmentsStore'
import { useSearchStore } from '@/features/search/useSearchStore'

type FloatingFragment = {
  id: string
  cx: number
  cy: number
  x: number
  y: number
  content: string
  fontSize: number
  driftOffset: number
}

export default function FloatingFragmentsField() {
  const { fragments, load, setSelectedFragment } = useFragmentsStore()

  const keyword = useSearchStore(state => state.keyword)
  const searchResults = useSearchStore(state => state.searchResults)
  const selectedTags = useSearchStore(state => state.selectedTags)
  const excludedTags = useSearchStore(state => state.excludedTags)

  const hasKeyword = keyword.trim().length > 0
  const hasTagFilter = selectedTags.length > 0 || excludedTags.length > 0
  const hasEffectiveFilter = hasKeyword || hasTagFilter

  const filtered = hasEffectiveFilter ? searchResults : fragments
  const showEmptyMessage = hasEffectiveFilter && filtered.length === 0

  const [floatingFragments, setFloatingFragments] = useState<FloatingFragment[]>([])
  const requestRef = useRef<number | null>(null)
  const dragState = useRef<{ isDragging: boolean; draggedId: string | null }>({
    isDragging: false,
    draggedId: null,
  })
  const dragStartPos = useRef<{ startX: number; startY: number }>({ startX: 0, startY: 0 })
  const dragTimeout = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (typeof window === 'undefined') return
    console.log('keyword:', keyword, 'filtered.length:', filtered.length)

    const width = window.innerWidth
    const height = window.innerHeight

    const columns = Math.max(1, Math.ceil(Math.sqrt(filtered.length)))
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
        driftOffset: Math.random() * 1000,
      }
    })

    setFloatingFragments(arranged)
  }, [filtered])

  useEffect(() => {
    const animate = () => {
      const now = Date.now() / 1000

      setFloatingFragments(prev =>
        prev.map(frag => {
          const offsetX = Math.sin(now + frag.driftOffset) * 8
          const offsetY = Math.cos(now + frag.driftOffset) * 8
          return { ...frag, x: frag.cx + offsetX, y: frag.cy + offsetY }
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
      const fragment = fragments.find(f => f.id === id)
      if (fragment) setSelectedFragment(fragment)
    }
  }

  const handleMouseMove = (e: React.MouseEvent, id: string) => {
    if (dragState.current.isDragging && dragState.current.draggedId === id) {
      setFloatingFragments(prev =>
        prev.map(frag =>
          frag.id === id ? { ...frag, x: e.clientX, y: e.clientY } : frag
        )
      )
    }
  }

  return (
    <div className="relative w-full h-full overflow-visible">
      {showEmptyMessage ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-gray-400 text-lg">沒有符合條件的碎片</div>
        </div>
      ) : (
        floatingFragments.map(frag => (
          <div
            key={frag.id}
            onMouseDown={e => handleMouseDown(e, frag.id)}
            onMouseUp={e => handleMouseUp(e, frag.id)}
            onMouseMove={e => handleMouseMove(e, frag.id)}
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
        ))
      )}
    </div>
  )
}
