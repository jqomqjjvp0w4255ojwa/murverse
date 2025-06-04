import { useState, useEffect, useCallback, useRef } from 'react'
import { TagsService } from '@/features/tags/services/TagsService'

const DRAG_THRESHOLD = 4 // 拖曳的最小位移像素才能觸發拖曳行為

export function useTagDragManager() {
  const [draggingTag, setDraggingTag] = useState<string | null>(null)
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null)
  const isDraggingRef = useRef(false)
  const wasDraggingRef = useRef(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isOverTagWindow, setIsOverTagWindow] = useState(false)
  
  const dragStartPos = useRef<{ x: number, y: number } | null>(null)
  
  // 追蹤標籤懸停在哪個碎片上
  const dragOverFragmentRef = useRef<string | null>(null)
  
  // 追蹤原始碎片（用於避免將標籤放回原來的碎片）
  const sourceFragmentRef = useRef<string | null>(null)

  // 觸發拖曳（從外部呼叫）
  const startTagDrag = useCallback((tag: string, e: React.MouseEvent, fragmentId?: string) => {
    dragStartPos.current = { x: e.clientX, y: e.clientY }
    setDraggingTag(tag)
    setDragPosition({ x: e.clientX, y: e.clientY })
    sourceFragmentRef.current = fragmentId || null
    // 暫不設定 isDraggingRef，等滑動超過門檻才開始拖曳
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartPos.current || !draggingTag) return

      const dx = e.clientX - dragStartPos.current.x
      const dy = e.clientY - dragStartPos.current.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (!isDraggingRef.current && distance > DRAG_THRESHOLD) {
        isDraggingRef.current = true // 正式啟用拖曳
        setIsDragging(true)
      }

      if (isDraggingRef.current) {
        setDragPosition({ x: e.clientX, y: e.clientY })
        
        // 檢查是否懸停在碎片上
        const elementsUnderMouse = document.elementsFromPoint(e.clientX, e.clientY)
        const fragmentElement = elementsUnderMouse.find(el => 
          el.classList.contains('fragment-card') && el.getAttribute('data-fragment-id')
        )
        
        // 清除之前的所有高亮
        document.querySelectorAll('.tag-drop-target').forEach(el => {
          el.classList.remove('tag-drop-target')
        })
        
        if (fragmentElement) {
          const fragmentId = fragmentElement.getAttribute('data-fragment-id')
          
          // 確認不是拖回原始碎片
          if (fragmentId && fragmentId !== sourceFragmentRef.current) {
            dragOverFragmentRef.current = fragmentId
            
            // 添加視覺反饋
            fragmentElement.classList.add('tag-drop-target')
          } else {
            dragOverFragmentRef.current = null
          }
        } else {
          dragOverFragmentRef.current = null
        }
        
        // 檢查是否懸停在標籤窗上
        const tagWindowElement = document.getElementById('tags-floating-window')
        if (tagWindowElement) {
          const rect = tagWindowElement.getBoundingClientRect()
          const isOver = (
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom
          )
          
          setIsOverTagWindow(isOver)
        } else {
          setIsOverTagWindow(false)
        }
      }
    }

    const handleMouseUp = async () => {
      if (isDraggingRef.current) {
        // 檢查是否放置在碎片上
        if (dragOverFragmentRef.current && draggingTag) {
          // 添加標籤到目標碎片
          const result = await TagsService.addTagToFragment(dragOverFragmentRef.current, draggingTag)
          
          // 顯示操作結果提示（可以用 toast 之類的通知）
          if (result.success) {
            console.log(`🏷️ ${result.message}`)
            // 這裡可以加入提示動畫或通知
          } else {
            console.warn(`⚠️ ${result.message || '操作失敗'}`)
          }
          
          // 清除視覺反饋
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
        // reset if not dragging
        setDraggingTag(null)
        setDragPosition(null)
        dragStartPos.current = null
      }
      
      // 清理其他狀態
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
  }, [draggingTag])

  return {
    draggingTag,
    dragPosition,
    isDragging,  // 使用狀態而非 ref，確保組件能正確響應
    wasDraggingRef,
    startTagDrag,
    isOverTagWindow,  // 導出是否懸停在標籤窗的狀態
    dragOverFragmentId: dragOverFragmentRef.current,
  }
}