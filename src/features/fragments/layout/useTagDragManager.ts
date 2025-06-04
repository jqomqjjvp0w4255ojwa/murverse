'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { TagsService } from '@/features/tags/services/TagsService'

const DRAG_THRESHOLD = 4

export function useTagDragManager() {
  // ✅ 所有 Hook 都要無條件呼叫
  const [draggingTag, setDraggingTag] = useState<string | null>(null)
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null)
  const isDraggingRef = useRef(false)
  const wasDraggingRef = useRef(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isOverTagWindow, setIsOverTagWindow] = useState(false)
  const dragStartPos = useRef<{ x: number, y: number } | null>(null)
  const dragOverFragmentRef = useRef<string | null>(null)
  const sourceFragmentRef = useRef<string | null>(null)

  const isClient = typeof window !== 'undefined'

  const startTagDrag = useCallback((tag: string, e: React.MouseEvent, fragmentId?: string) => {
    if (!isClient) return
    dragStartPos.current = { x: e.clientX, y: e.clientY }
    setDraggingTag(tag)
    setDragPosition({ x: e.clientX, y: e.clientY })
    sourceFragmentRef.current = fragmentId || null
  }, [isClient])

  useEffect(() => {
    if (!isClient) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartPos.current || !draggingTag) return

      const dx = e.clientX - dragStartPos.current.x
      const dy = e.clientY - dragStartPos.current.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (!isDraggingRef.current && distance > DRAG_THRESHOLD) {
        isDraggingRef.current = true
        setIsDragging(true)
      }

      if (isDraggingRef.current) {
        setDragPosition({ x: e.clientX, y: e.clientY })

        const elementsUnderMouse = document.elementsFromPoint(e.clientX, e.clientY)
        const fragmentElement = elementsUnderMouse.find(el =>
          el.classList.contains('fragment-card') && el.getAttribute('data-fragment-id')
        )

        document.querySelectorAll('.tag-drop-target').forEach(el => {
          el.classList.remove('tag-drop-target')
        })

        if (fragmentElement) {
          const fragmentId = fragmentElement.getAttribute('data-fragment-id')
          if (fragmentId && fragmentId !== sourceFragmentRef.current) {
            dragOverFragmentRef.current = fragmentId
            fragmentElement.classList.add('tag-drop-target')
          } else {
            dragOverFragmentRef.current = null
          }
        } else {
          dragOverFragmentRef.current = null
        }

        const tagWindowElement = document.getElementById('tags-floating-window')
        if (tagWindowElement) {
          const rect = tagWindowElement.getBoundingClientRect()
          const isOver =
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom

          setIsOverTagWindow(isOver)
        } else {
          setIsOverTagWindow(false)
        }
      }
    }

    const handleMouseUp = async () => {
      if (isDraggingRef.current) {
        if (dragOverFragmentRef.current && draggingTag) {
          const result = await TagsService.addTagToFragment(dragOverFragmentRef.current, draggingTag)
          if (result.success) {
            console.log(`🏷️ ${result.message}`)
          } else {
            console.warn(`⚠️ ${result.message || '操作失敗'}`)
          }

          document.querySelectorAll('.tag-drop-target').forEach(el => {
            el.classList.remove('tag-drop-target')
          })
        }

        setDraggingTag(null)
        setDragPosition(null)
        isDraggingRef.current = false
        setIsDragging(false)
        wasDraggingRef.current = true
        setTimeout(() => { wasDraggingRef.current = false }, 100)
      } else {
        setDraggingTag(null)
        setDragPosition(null)
        dragStartPos.current = null
      }

      dragOverFragmentRef.current = null
      sourceFragmentRef.current = null
      setIsOverTagWindow(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [draggingTag, isClient])

  return {
    draggingTag,
    dragPosition,
    isDragging,
    wasDraggingRef,
    startTagDrag,
    isOverTagWindow,
    dragOverFragmentId: dragOverFragmentRef.current
  }
}
