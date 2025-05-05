// src/hooks/useResizable.ts
'use client'

import { useState, useRef, useCallback } from 'react'
import { useGroupsStore } from '@/features/windows/useGroupsStore'

interface Size {
  width: number
  height: number
}

export function useResizable(
  initialWidth = 300,
  initialHeight = 200,
  options?: {
    minWidth?: number
    minHeight?: number
  }
) {
  const [size, setSize] = useState<Size>({
    width: initialWidth,
    height: initialHeight
  })

  const minWidth = options?.minWidth ?? 100
  const minHeight = options?.minHeight ?? 50

  const ref = useRef<HTMLDivElement>(null)
  const resizingRef = useRef(false)
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const startSizeRef = useRef<Size>({ width: initialWidth, height: initialHeight })
  const animationFrameIdRef = useRef<number | null>(null)

  const { checkAndResolveOverlaps, updateWindow } = useGroupsStore.getState()

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizingRef.current) return

    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current)
    }

    animationFrameIdRef.current = requestAnimationFrame(() => {
      const deltaX = e.clientX - startPosRef.current.x
      const deltaY = e.clientY - startPosRef.current.y

      const newWidth = Math.max(minWidth, startSizeRef.current.width + deltaX)
      const newHeight = Math.max(minHeight, startSizeRef.current.height + deltaY)

      setSize({ width: newWidth, height: newHeight })

      if (ref.current?.id) {
        updateWindow(ref.current.id, {
          width: newWidth,
          height: newHeight
        })
      }

      animationFrameIdRef.current = null
    })
  }, [minWidth, minHeight, updateWindow])

  const handleMouseUp = useCallback(() => {
    if (!resizingRef.current) return

    resizingRef.current = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)

    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current)
      animationFrameIdRef.current = null
    }

    setTimeout(() => {
      checkAndResolveOverlaps()
    }, 50)
  }, [checkAndResolveOverlaps, handleMouseMove])

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    resizingRef.current = true
    startPosRef.current = { x: e.clientX, y: e.clientY }
    startSizeRef.current = { ...size }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [handleMouseMove, handleMouseUp, size])

  return { ref, size, startResizing }
}
