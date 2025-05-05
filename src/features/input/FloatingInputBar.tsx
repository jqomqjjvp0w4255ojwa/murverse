// components/FloatingInputBar.tsx
'use client'

/* 📌 功能：用來輸入新的碎片（fragment）與筆記，並加上標籤。

🧩 重點功能：
輸入欄位：可輸入主內容（content）與多筆筆記（notes）。
標籤系統整合：會連動開啟 TagsFloatingWindow 來選擇標籤。
草稿功能：自動儲存至 localStorage，防止輸入內容遺失。
連線動畫：在 UI 上畫出輸入欄與標籤視窗間的連接線（<svg><path>），提升互動感。
懸浮視窗操作：支援拖曳、收合、全螢幕顯示（透過 useFloatingWindow hook 控制）。
送出後儲存：會用 setFragments() 把新的碎片加進系統，並呼叫 save()。
✅ 簡單說：這是使用者輸入新資料的主控台。

關聯檔案:
TagsFloatingWindow.tsx	間接控制它的顯示與位置（透過 useTagsStore().tagsWindowRef）
useFragmentsStore.ts	儲存新 fragment，用 setFragments, save
useTagsStore.ts	控制 pendingTags、搜尋模式、標籤選擇流程
useFloatingWindow.ts	控制它本身的視窗位置與行為（拖曳、全螢幕、收合）
子元件：InputBarHeader, TagsSelector, NotesList, ActionButtons	用於組合畫面與控制內容互動
localStorage	會讀寫 murverse_draft 草稿資料

*/

import { useState, useEffect, useRef } from 'react'
import { useFragmentsStore } from '@/features/fragments/store/useFragmentsStore'
import { useTagsIntegration } from '@/features/tags/store/useTagsIntegration'
import { useTagsStore } from '@/features/tags/store/useTagsStore'
import { Fragment, Note } from '@/features/fragments/types/fragment'
import { v4 as uuidv4 } from 'uuid'
import { useFloatingWindow } from '@/features/windows/useFloatingWindow'
import InputBarHeader from './InputBarHeader'
import NotesList from './NotesList'
import TagsSelector from '../tags/components/TagsSelector'
import { useGroupsStore } from '@/features/windows/useGroupsStore'
import ActionButtons from './ActionButtons'

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

  const { openTagSelector: enhancedOpenTagSelector } = useTagsIntegration()
  const {
    openTagSelector,
    pendingTags, setPendingTags, clearPendingTags,
    setMode, tagsWindowRef, setConnected,
    searchMode  // 獲取當前的搜尋模式
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
  const { addWindow, updateWindow, checkAndResolveOverlaps } = useGroupsStore()
  const hasRegistered = useRef(false)


  // 移除與拖曳確認相關的狀態和引用
  // 不再需要 clearDragActive, setClearDragActive, clearButtonRef, clearDropZoneRef 等

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
        setConnected(false)
        setMode('search')
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
      setConnected(false)
      setMode('search');
    }
  }, [isCollapsed, isFullScreen])

  /* 監聽 searchMode 的變化，當切換到碎片搜尋模式時斷開連線 */
  useEffect(() => {
    if (searchMode === 'fragment' && showLine) {
      console.log('InputBar 監聽到搜尋模式變為 fragment，斷開連線');
      setShowLine(false);
      setConnected(false);
    }
  }, [searchMode, showLine, setConnected]);

  useEffect(() => {
    const el = inputRef.current
    if (!el || hasRegistered.current) return
  
    requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect()
      addWindow({
        id: 'floating-input-bar',
        x: rect.left,
        y: rect.top,
        width: rect.width || 350,
        height: rect.height || 56
      })
      hasRegistered.current = true
    })
  }, [addWindow])
  
  // 尺寸或收合狀態改變時更新群組狀態
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    setTimeout(() => {
      const rect = el.getBoundingClientRect()
      updateWindow('floating-input-bar', {
        width: rect.width,
        height: rect.height
      })
      checkAndResolveOverlaps()
    }, 100)
  }, [isCollapsed, isFullScreen, updateWindow, checkAndResolveOverlaps])

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
    // 直接调用重置输入而不使用拖曳确认
    resetInput()
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
    setConnected(false)
    localStorage.removeItem('murverse_draft')
  }

  /* 畫連線 */
  const handleOpenTagsWindow = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('使用增強版開啟標籤選擇器');
    
    // 首先檢查當前的搜尋模式，如果是 fragment 模式，需要先切換回 tag 模式
    if (searchMode === 'fragment') {
      console.log('當前為碎片搜尋模式，需要先切換回標籤模式');
    }
    
    // 呼叫增強版開啟標籤選擇器（這會自動設置模式為 add 和搜尋模式為 tag）
    enhancedOpenTagSelector();
    
    // 再次強制設置模式，確保標籤窗口的內容顯示正確
    setTimeout(() => {
      setMode('add');  // 直接使用 store 中的 setMode 函數
      
      // 增加延遲確保模式切換完成後再畫線
      setTimeout(() => {
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
            setConnected(true)
            setAnimateLine(true)
            setTimeout(() => setAnimateLine(false), 500)
          }
        })
      }, 100);  // 增加延遲確保模式切換完成
    }, 50); // 先確保模式設置正確
  }

  /* 折疊視窗 */
  const handleCollapseWindow = () => {
    if (isFullScreen) {
      toggleFullScreen()
    }
    setExpanded(false)
    setShowLine(false)
    setConnected(false)
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
      
      {/* 移除拖曳確認區域 - 清除功能 */}
      
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

            {/* 操作按鈕 - 移除拖曳确认相关的props */}
            <ActionButtons 
              isFullScreen={isFullScreen}
              totalCharCount={totalCharCount}
              clearDragActive={false} // 移除实际功能，保留参数以兼容
              clearButtonRef={null}   // 移除实际功能，保留参数以兼容
              onSubmit={handleSubmit}
              onClear={handleClear}
              onClearDragStart={() => {}} // 空函数以保持接口兼容
              onClearDragEnd={() => {}}   // 空函数以保持接口兼容
            />
          </div>
        )}
      </div>
    </>
  )
}