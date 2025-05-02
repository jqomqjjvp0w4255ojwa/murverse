// components/FloatingInputBar.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useFragmentsStore } from '@/stores/useFragmentsStore'
import { useTagsStore } from '@/stores/useTagsStore'
import { Fragment, Note } from '@/types/fragment'
import { v4 as uuidv4 } from 'uuid'
import { useFloatingWindow } from '@/hooks/useFloatingWindow'
import { useDragConfirm } from '@/hooks/useDragConfirm'
import InputBarHeader from './fragments/InputBarHeader'
import NotesList from './fragments/NotesList'
import TagsSelector from './fragments/TagsSelector'
import ActionButtons from './fragments/ActionButtons'
import DragConfirmZone from '../deprecated/DragConfirmZone'

export default function FloatingInputBar() {
  // 使用共用的 floating window hook
  const {
    windowRef: inputRef,
    pos,
    isCollapsed,
    isFullScreen,
    toggleCollapse,
    toggleFullScreen,
    handleMouseDown
  } = useFloatingWindow({
    id: 'floating-input-bar',
    defaultPosition: { x: window.innerWidth / 2 - 200, y: window.innerHeight / 4 }
  })

  // 從 store 獲取狀態和方法
  const { fragments, setFragments, save } = useFragmentsStore()
  const {
    openTagSelector,
    pendingTags, setPendingTags, clearPendingTags,
    setMode, tagsWindowRef
  } = useTagsStore()

  // 本地狀態
  const [content, setContent] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [notes, setNotes] = useState<Note[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [showLine, setShowLine] = useState(false)
  // components/FloatingInputBar.tsx（續）
  const [linePath, setLinePath] = useState('')
  const [animateLine, setAnimateLine] = useState(false)
  const tagButtonRef = useRef<HTMLButtonElement>(null)
  const fragmentId = useRef<string>(uuidv4())
  const totalCharCount = content.length + notes.reduce((acc, note) => acc + note.title.length + note.value.length, 0)

  // 使用拖曳確認 hook 用於清除功能
  const {
    isDragActive: clearDragActive,
    setIsDragActive: setClearDragActive,
    triggerButtonRef: clearButtonRef,
    dropZoneRef: clearDropZoneRef,
    handleDragStart: handleClearDragStart,
    handleDragEnd: handleClearDragEnd,
    handleDragOver: handleClearZoneDragOver,
    handleDragLeave: handleClearZoneDragLeave,
    handleDrop: handleClearZoneDrop
  } = useDragConfirm({
    onConfirm: () => resetInput()
  })

  /* 在第一次渲染後初始化模式 */
  useEffect(() => { 
    setMode('search') 
  }, [setMode])

  /* 讀取草稿 */
  useEffect(() => {
    const draft = localStorage.getItem('murverse_draft')
    if (draft) {
      const parsed = JSON.parse(draft)
      setContent(parsed.content || '')
      setPendingTags(parsed.tags || [])
      setNotes(parsed.notes || [])
    }
    setHydrated(true)
  }, [setPendingTags])

  /* 展開時若沒有筆記，自動加一行 */
  useEffect(() => {
    if (expanded && notes.length === 0) {
      setNotes([{ id: uuidv4(), title: '', value: '' }])
    }
  }, [expanded, notes.length])

  /* 自動保存草稿 */
  useEffect(() => {
    localStorage.setItem('murverse_draft', JSON.stringify({
      content, tags: pendingTags, notes,
    }))
  }, [content, pendingTags, notes])

  /* 監聽展開狀態 */
  useEffect(() => {
    if (!expanded) {
      setMode('search')
    }
  }, [expanded, setMode])

  /* 點擊外部不再自動收合 */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const inputEl = inputRef.current
      const tagsWindowEl = tagsWindowRef.current

      if (!inputEl || !tagsWindowEl) return

      // 全螢幕模式下不觸發任何動作
      if (isFullScreen) return

      // 只處理標籤窗口的顯示/隱藏
      if (!inputEl.contains(e.target as Node) && !tagsWindowEl.contains(e.target as Node)) {
        setShowLine(false)
      }
    }

    if (expanded) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [expanded, isFullScreen, inputRef, tagsWindowRef])
  
  /* 收合時或切換全螢幕時移除連線 */
  useEffect(() => {
    if (isCollapsed || isFullScreen) {
      setShowLine(false);
    }
  }, [isCollapsed, isFullScreen])

  /* 畫連線的邏輯和動畫 */
  useEffect(() => {
    if (showLine) {
      const update = () => {
        const tagButton = tagButtonRef.current
        const tagsWindow = tagsWindowRef.current
        if (tagButton && tagsWindow) {
          const b = tagButton.getBoundingClientRect()
          const w = tagsWindow.getBoundingClientRect()
          const cx = (b.left + w.left) / 2
          const cy = (b.top + w.top) / 2
          const startX = b.left + b.width / 2
          const startY = b.top + b.height / 2
          const endX = w.left + w.width / 2
          const endY = w.top + w.height / 2

          // 初始畫出曲線
          setLinePath(
            `M${startX} ${startY}
             C${cx} ${cy} ${cx} ${cy}
             ${endX} ${endY}`
          )
        }
      }

      update() // 立刻更新一次
      const interval = setInterval(update, 16) // 每16毫秒更新一次

      return () => clearInterval(interval) // 離開時清掉
    }
  }, [showLine, tagsWindowRef])

  /* 提交新碎片 */
  const handleSubmit = () => {
    if (!content.trim()) return
    const now = new Date().toISOString()
    
    // 過濾掉空白的筆記
    const filteredNotes = notes.filter(note => 
      note.title.trim() !== '' || note.value.trim() !== ''
    )
    
    const notesToSave = filteredNotes.length > 0 ? filteredNotes : []
  
    const newFragment: Fragment = {
      id: fragmentId.current,
      content,
      type: 'fragment',
      tags: pendingTags,
      notes: notesToSave,
      createdAt: now,
      updatedAt: now,
    }
  
    setFragments([newFragment, ...fragments])
    save()
    resetInput()
    
    // 提交後產生新的 fragmentId，確保每次創建都是唯一 ID
    fragmentId.current = uuidv4()
  }

  /* 清空全部 */
  const handleClear = () => {
    if (!clearDragActive) {
      setClearDragActive(true)
    } else {
      resetInput()
      setClearDragActive(false)
    }
  }

  /* 新增筆記 */
  const addNote = () => {
    setNotes(prev => [...prev, { id: uuidv4(), title: '', value: '' }])
  }

  /* 更新單行筆記 */
  const updateNote = (id: string, field: 'title' | 'value', value: string) => {
    setNotes(prev => prev.map(note =>
      note.id === id ? { ...note, [field]: value } : note
    ))
  }

  /* 刪除筆記 */
  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(note => note.id !== id))
  }

  /* 處理筆記排序 */
  const handleReorderNotes = (newNotes: Note[]) => {
    setNotes(newNotes)
  }

  /* 重置輸入欄 */
  const resetInput = () => {
    setContent('')
    clearPendingTags()
    setNotes([{ id: uuidv4(), title: '', value: '' }]) // 重置為一個空白筆記而不是完全清空
    // 不要設置expanded為false
    setShowLine(false)
    localStorage.removeItem('murverse_draft')
  }

  /* 畫連線 */
  const handleOpenTagsWindow = (e: React.MouseEvent) => {
    e.stopPropagation()
    openTagSelector()
    requestAnimationFrame(() => {
      const tagButton = tagButtonRef.current
      const tagsWindow = tagsWindowRef.current
      if (tagButton && tagsWindow) {
        const b = tagButton.getBoundingClientRect()
        const w = tagsWindow.getBoundingClientRect()
        const cx = (b.left + w.left) / 2
        const cy = (b.top + w.top) / 2
        setLinePath(
          `M${b.left + b.width / 2} ${b.top + b.height / 2}
           C${cx} ${cy} ${cx} ${cy}
           ${w.left + w.width / 2} ${w.top + w.height / 2}`
          )
        setTimeout(() => {
          window.dispatchEvent(new Event('resize'))
        }, 100)
           
        setShowLine(true)
        setAnimateLine(true)
        setTimeout(() => setAnimateLine(false), 500)
      }
    })
  }

  /* 折疊視窗 */
  const handleCollapseWindow = () => {
    if (isFullScreen) {
      toggleFullScreen()
    }
    setExpanded(false)
    setShowLine(false)
  }

  /* 移除標籤 */
  const removeTag = (tagToRemove: string) => {
    setPendingTags(pendingTags.filter(tag => tag !== tagToRemove))
  }

  /* 渲染 */
  if (!hydrated) return null
  
  return (
    <>
      {/* 標籤連線線條 */}
      {showLine && (
        <svg
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          <path
            d={linePath}
            stroke="black"
            strokeWidth={2}
            fill="none"
            className={animateLine ? 'animate-draw' : ''}
          />
        </svg>
      )}
      
      {/* 拖曳確認區域 - 清除功能 */}
      <DragConfirmZone
        isActive={clearDragActive}
        zoneRef={clearDropZoneRef}
        onDragOver={handleClearZoneDragOver}
        onDragLeave={handleClearZoneDragLeave}
        onDrop={handleClearZoneDrop}
        icon="🗑️"
      />
      
      {/* 主窗體 */}
      <div
        id="floating-input-bar"
        ref={inputRef}
        onMouseDown={handleMouseDown}
        onDragStart={e => e.preventDefault()}
        className={`fixed z-[20] bg-white border border-gray-400 rounded-2xl shadow-lg select-none 
          ${expanded && !isCollapsed ? 'p-4' : 'p-2'}
          ${isFullScreen ? 'transition-all duration-300 ease-in-out' : ''}`}
        style={{
          top: pos.y,
          left: pos.x,
          width: isFullScreen ? '50vw' : (expanded && !isCollapsed ? '350px' : '350px'),
          height: isFullScreen ? '85vh' : (expanded && !isCollapsed ? 'auto' : '56px'),
          transition: 'width 0.3s, height 0.3s'
        }}
      >
        {!expanded || isCollapsed ? (
          // 收合狀態
          <div className="flex items-center justify-between">
            <input
              className="flex-1 bg-transparent px-4 py-2 text-center mr-2"
              placeholder="輸入新碎片..."
              readOnly
              value={content}
              onFocus={() => {
                setExpanded(true)
                if (isCollapsed) {
                  toggleCollapse()
                }
              }}
            />
          </div>
        ) : (
          // 展開狀態
          <div className="space-y-4">
            {/* 頂部控制區 */}
            <InputBarHeader 
              isFullScreen={isFullScreen}
              onCollapse={handleCollapseWindow}
              onToggleFullScreen={toggleFullScreen}
            />

            {/* 主要輸入區 */}
            <div className="flex items-center gap-2">
              <input
                className="flex-1 p-2 border border-gray-300 rounded-lg"
                placeholder="碎片內容..."
                value={content}
                onChange={e => setContent(e.target.value)}
              />
            </div>

            {/* 標籤區 */}
            <TagsSelector 
              tags={pendingTags}
              tagButtonRef={tagButtonRef}
              onOpenTagsWindow={handleOpenTagsWindow}
              onRemoveTag={removeTag}
            />

            {/* 筆記列表 */}
            <NotesList 
              notes={notes}
              isFullScreen={isFullScreen}
              onUpdateNote={updateNote}
              onDeleteNote={deleteNote}
              onReorderNotes={handleReorderNotes}
              onAddNote={addNote}
            />

            {/* 操作按鈕 */}
            <ActionButtons 
              isFullScreen={isFullScreen}
              totalCharCount={totalCharCount}
              clearDragActive={clearDragActive}
              clearButtonRef={clearButtonRef}
              onSubmit={handleSubmit}
              onClear={handleClear}
              onClearDragStart={handleClearDragStart}
              onClearDragEnd={handleClearDragEnd}
            />
          </div>
        )}
      </div>
    </>
  )
}