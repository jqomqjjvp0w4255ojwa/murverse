// src/features/input/FloatingInputBar.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useFragmentsStore } from '@/features/fragments/store/useFragmentsStore'
import { useTagsIntegration } from '@/features/tags/store/useTagsIntegration'
import { useGlobalTagsStore } from '@/features/tags/store/useGlobalTagsStore'
import { Fragment, Note } from '@/features/fragments/types/fragment'
import { v4 as uuidv4 } from 'uuid'
import { useFloatingWindow } from '@/features/windows/useFloatingWindow'
import InputBarHeader from './InputBarHeader'
import NotesList from './NotesList'
import TagsSelector from './TagsSelector'
import ActionButtons from './ActionButtons'
import { useHoverScrollbar } from '@/features/interaction/useHoverScrollbar'

export default function FloatingInputBar() {
  // 使用 Tab 模式的 floating window hook
  const {
    windowRef: inputRef,
    pos,
    isCollapsed,
    isFullScreen,
    toggleCollapse,
    toggleFullScreen,
    handleMouseDown,
    isTabMode,
    isTabExpanded,
    isWindowVisible
   } = useFloatingWindow({
  id: 'floating-input-bar',
  defaultPosition: { 
    x: typeof window !== 'undefined' ? (window.innerWidth - 350) / 2 : 100, 
    y: typeof window !== 'undefined' ? (window.innerHeight - 200) / 2 : 100 
  },
  useTabMode: true, // 啟用 Tab 模式
  fullScreenBehavior: 'stay-in-place' // 新增：指定要留在原地
})

  // 從 store 獲取狀態和方法
  const { fragments, setFragments, save, addFragment } = useFragmentsStore()

  const { openTagSelector: enhancedOpenTagSelector } = useTagsIntegration()
  const {
    openTagSelector,
    pendingTags, setPendingTags, clearPendingTags,
    setMode, tagsWindowRef, setConnected,
    searchMode
  } = useGlobalTagsStore()

  // 本地狀態
  const [content, setContent] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [notes, setNotes] = useState<Note[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [showLine, setShowLine] = useState(false)
  const [linePath, setLinePath] = useState('')
  const [animateLine, setAnimateLine] = useState(false)
  const [resetKey, setResetKey] = useState(0) // 用於重置 textarea
  const tagButtonRef = useRef<HTMLButtonElement>(null)
  const fragmentId = useRef<string>(uuidv4())
  const totalCharCount = content.length + notes.reduce((acc, note) => acc + note.title.length + note.value.length, 0)
  const { hovering: hoverScrollbarArea, bind: scrollbarHoverHandlers } = useHoverScrollbar(20)
  const [isScaling, setIsScaling] = useState(false)
  const [transformOrigin, setTransformOrigin] = useState('center center')

  
  const [isExiting, setIsExiting] = useState(false)
  // Tab 模式：當窗口展開時自動設為展開狀態
  useEffect(() => {
    if (isTabMode && isTabExpanded) {
      setExpanded(true)
    } else if (isTabMode && !isTabExpanded) {
      setExpanded(false)
      // Tab 收合時也清理連線
      setShowLine(false)
      setConnected(false)
    }
  }, [isTabMode, isTabExpanded, setConnected])

  // 監聽斷開連線事件
  useEffect(() => {
    const handleDisconnectLine = (event: CustomEvent) => {
      const { windowId } = event.detail
      if (windowId === 'floating-input-bar') {
        setShowLine(false)
        setConnected(false)
        setMode('search')
      }
    }
    
    globalThis.window?.addEventListener('disconnect-line', handleDisconnectLine as EventListener)
    
    return () => {
      globalThis.window?.removeEventListener('disconnect-line', handleDisconnectLine as EventListener)
    }
  }, [setConnected, setMode])

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

  /* 點擊外部處理（Tab 模式下簡化） */
  useEffect(() => {
    if (isTabMode) return // Tab 模式下不需要點擊外部邏輯
    
    const handleClickOutside = (e: MouseEvent) => {
      const inputEl = inputRef.current
      const tagsWindowEl = tagsWindowRef.current

      if (!inputEl || !tagsWindowEl) return
      if (isFullScreen) return

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
  }, [expanded, isFullScreen, inputRef, tagsWindowRef, isTabMode])
  
  /* 收合時或切換全螢幕時移除連線 */
  useEffect(() => {
    if (isCollapsed || isFullScreen) {
      setShowLine(false);
      setConnected(false)
      setMode('search');
    }
  }, [isCollapsed, isFullScreen])

  /* 監聽 searchMode 的變化 */
  useEffect(() => {
    if (searchMode === 'fragment' && showLine) {
      console.log('InputBar 監聽到搜尋模式變為 fragment，斷開連線');
      setShowLine(false);
      setConnected(false);
    }
  }, [searchMode, showLine, setConnected]);

  useEffect(() => {
  const el = inputRef.current
  if (!el) return

  const handleAnimationEnd = () => {
    if (!isTabExpanded) {
      el.style.display = 'none'
    }
  }

  el.addEventListener('animationend', handleAnimationEnd)
  return () => el.removeEventListener('animationend', handleAnimationEnd)
}, [isTabExpanded])



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

          setLinePath(
            `M${startX} ${startY}
             C${cx} ${cy} ${cx} ${cy}
             ${endX} ${endY}`
          )
        }
      }

      update()
      const interval = setInterval(update, 16)
      return () => clearInterval(interval)
    }
  }, [showLine, tagsWindowRef])

  /* 提交新碎片 */
  const handleSubmit = async () => {
  if (!content.trim()) return
  
  const filteredNotes = notes.filter(note => 
    note.title.trim() !== '' || note.value.trim() !== ''
  )
  
  const notesToSave = filteredNotes.length > 0 ? filteredNotes : []

  try {
    await addFragment(content, pendingTags, notesToSave)
    resetInput()
    fragmentId.current = uuidv4()
  } catch (error) {
    console.error('Failed to submit fragment:', error)
  }
}

  /* 清空全部 */
  const handleClear = () => {
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

  /* 重置輸入欄 - 簡化版，確保 textarea 高度重置 */
  const resetInput = () => {
    setContent('')
    clearPendingTags()
    setNotes([{ id: uuidv4(), title: '', value: '' }])
    setShowLine(false)
    setConnected(false)
    setResetKey(prev => prev + 1) // 觸發 textarea 重新創建，自動重置高度
    localStorage.removeItem('murverse_draft')
  }

  /* 畫連線 */
  const handleOpenTagsWindow = (e: React.MouseEvent) => {
  e.stopPropagation();
  
  // 檢查當前標籤窗和連線狀態
  const tagsWindow = tagsWindowRef.current;
  const isTagsWindowOpen = tagsWindow && tagsWindow.style.transform === 'translateX(0px)';
  
  console.log('添加標籤按鈕被點擊');
  console.log('標籤窗狀態:', isTagsWindowOpen ? '展開' : '收合');
  console.log('連線狀態:', showLine);
  
  // 如果已經連線，則取消連線和添加標籤狀態
  if (showLine) {
    console.log('取消連線和添加標籤狀態');
    setShowLine(false);
    setConnected(false);
    setMode('search');
    return;
  }
  
  // 如果標籤窗收合，先展開標籤窗
  if (!isTagsWindowOpen) {
    console.log('標籤窗收合中，先展開標籤窗');
    // 觸發標籤窗展開 - 需要調用標籤窗的展開函數
    const drawerEvent = new CustomEvent('open-tags-drawer');
    window.dispatchEvent(drawerEvent);
  }
  
  // 使用增強版開啟標籤選擇器
  enhancedOpenTagSelector();
  
  setTimeout(() => {
    setMode('add');
    
    setTimeout(() => {
      requestAnimationFrame(() => {
        const tagButton = tagButtonRef.current;
        const tagsWindow = tagsWindowRef.current;
        if (tagButton && tagsWindow) {
          const b = tagButton.getBoundingClientRect();
          const w = tagsWindow.getBoundingClientRect();
          const cx = (b.left + w.left) / 2;
          const cy = (b.top + w.top) / 2;
          setLinePath(
            `M${b.left + b.width / 2} ${b.top + b.height / 2}
             C${cx} ${cy} ${cx} ${cy}
             ${w.left + w.width / 2} ${w.top + w.height / 2}`
          );
          setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
          }, 100);
             
          setShowLine(true);
          setConnected(true);
          setAnimateLine(true);
          setTimeout(() => setAnimateLine(false), 500);
        }
      });
    }, 100);
  }, 50);
};

useEffect(() => {
  const handleTagsDrawerClose = () => {
    if (showLine) {
      console.log('標籤窗收合，取消連線');
      setShowLine(false);
      setConnected(false);
      setMode('search');
    }
  };


    
  window.addEventListener('tags-drawer-closed', handleTagsDrawerClose);
  
  return () => {
    window.removeEventListener('tags-drawer-closed', handleTagsDrawerClose);
  };
}, [showLine, setConnected, setMode]);

const handleToggleFullScreen = () => {
  console.log('开始全屏缩放动画')
  const el = inputRef.current
  if (!el) return
  
  const rect = el.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  
  console.log('缩放中心点:', { centerX, centerY })
  console.log('当前状态:', { isFullScreen })
  
  // 設置變換原點為視窗中心相對於視窗自身的位置
  const originX = rect.width / 2  // 視窗寬度的一半
  const originY = rect.height / 2 // 視窗高度的一半
  setTransformOrigin(`${originX}px ${originY}px`)
  
  // 設置縮放動畫
  setIsScaling(true)
  
  // 執行原始的全螢幕切換
  toggleFullScreen()
  
  // 動畫結束後重置狀態
  setTimeout(() => {
    setIsScaling(false)
    setTransformOrigin('center center') // 重置為默認值
  }, 300)
}
  



  /* 折疊視窗 */
 const handleCollapseWindow = () => {
  if (isScaling) return // 防止重複觸發
  
  setIsScaling(true)
  
  // 切換展開狀態
  if (isFullScreen) toggleFullScreen()
  if (isTabMode) toggleCollapse()
  else setExpanded(!expanded)

  // 斷開連線
  setShowLine(false)
  setConnected(false)
  
  // 動畫結束後重置狀態
  setTimeout(() => {
    setIsScaling(false)
  }, 300)
}

  /* 移除標籤 */
  const removeTag = (tagToRemove: string) => {
    setPendingTags(pendingTags.filter(tag => tag !== tagToRemove))
  }

  /* 渲染 */
  if (!hydrated) return null
  
      // Tab 模式下：如果窗口不可見，只渲染 tab
      if (isTabMode && !isWindowVisible && !isExiting) {
        
      return (
        <>
          {/* 碎片 Tab 書籤 - 收合狀態 */}
            <div
              className="fixed cursor-pointer transition-all duration-200 ease-out select-none group"
              style={{
                top: '30vh',
                left: '0',
                zIndex: 25
              }}
              onClick={() => toggleCollapse()}
            >
             <div 
              className="relative transition-all duration-200 ease-out group-hover:shadow-md"
              style={{
                width: '2vw',
                height: '8vh',
                background: '#fefdfb',
                borderTop: '2px solid #c9c9c9',
                borderRight: '2px solid #c9c9c9', 
                borderBottom: '2px solid #c9c9c9',
                borderLeft: 'none', // 左邊不要框
                borderRadius: '0 1vh 1vh 0',
                // 右側陰影，左側不要
                boxShadow: '0 2px 6px rgba(0,0,0,0.05), 2px 0 4px rgba(0, 0, 0, 0.1)',
              }}
            >
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center transition-colors duration-200"
                  style={{ color: '#999999' }}
                >
                  <div
                    style={{ width: '1.4vh', height: '1.4vh', marginBottom: '0.2vh' }}
                    className="group-hover:text-red-500 transition-colors duration-200" // 加上懸浮變色效果
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-full h-full">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </div>
                  <span
                    style={{ fontSize: '0.9vh' }}
                    className="group-hover:text-red-500 transition-colors duration-200" // 加上懸浮變色效果
                  >
                    碎片
                  </span>
                </div>
              </div>
            </div>
   </>
 )
}

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
         stroke="#1e2a38"
         strokeWidth={2}
         fill="none"
         className={animateLine ? 'animate-draw' : ''}
       />
     </svg>
   )}
   
   {/* 主窗體 */}
   <div
  id="floating-input-bar"
  ref={inputRef}
  onMouseDown={handleMouseDown}
  onDragStart={e => e.preventDefault()}
  className={`fixed z-[25] border rounded-sm shadow-lg select-none
    ${expanded && !isCollapsed ? 'p-4' : 'p-2'}
    ${isFullScreen ? 'transition-all duration-300 ease-in-out' : ''}
    ${isTabMode && isTabExpanded ? 'window-enter' : ''}
    ${isTabMode && !isTabExpanded ? 'window-exit' : ''}
    ${isScaling ? 'scale-animation' : ''}`} // 新增縮放動畫類
  style={{
    top: pos.y,
    left: pos.x,
    width: isFullScreen ? '50vw' : '22rem',
    height: isFullScreen ? '85vh' : '30rem',
    display: isTabMode && !isWindowVisible ? 'none' : 'block',
    backgroundColor: '#fefdfb',
    backgroundImage: (isTabExpanded || expanded) ? `
      repeating-linear-gradient(
        transparent 0px,
        transparent 27px,
        rgba(120, 140, 170, 0) 28px,
        rgba(255, 255, 255, 0) 29px
      )
    ` : 'none',
    backgroundPosition: '20px 50px',
    backgroundSize: 'calc(100% - 40px) auto',
    border: '1px solid rgba(0, 0, 0, 0.08)',
    boxShadow: (isTabExpanded || expanded) 
      ? '0 8px 32px rgba(30, 42, 56, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)'
      : '0 4px 16px rgba(30, 42, 56, 0.1), 0 1px 4px rgba(0, 0, 0, 0.06)',
    // 簡化的變換屬性
    transformOrigin: transformOrigin,
    transition: isScaling 
      ? 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1), width 0.3s, height 0.3s'
      : 'width 0.3s, height 0.3s'
  }}
>

     {/* Tab 書籤 - 在窗口內部，用 absolute 定位到右側 */}
     <div
       className="absolute cursor-pointer select-none group"
       style={{
         top: '50%',
         right: '-2vw',
         transform: 'translateY(-50%)',
         zIndex: 5
       }}
       onClick={(e) => {
         e.stopPropagation();
         if (isTabMode) {
           toggleCollapse()
         } else {
           setExpanded(!expanded)
         }
       }}
     >
       <div 
        className="relative transition-all duration-200 ease-out"
        style={{
          width: '2vw',
          height: '8vh',
          background: '#fefdfb',
          borderLeft: 'none',
          borderRadius: '0 1vh 1vh 0',
          // 只有右側陰影
          boxShadow: '2px 0 4px rgba(0, 0, 0, 0.1)',
        }}
      >
         <div className="absolute inset-0 flex flex-col items-center justify-center transition-colors duration-200" 
              style={{ color: (isTabExpanded || expanded) ? '#1e2a38' : '#999999' }}>
           <div 
             style={{
               width: '1.4vh',
               height: '1.4vh',
               marginBottom: '0.2vh'
             }}

            className="group-hover:text-red-500 transition-colors duration-200">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-full h-full">
               <line x1="12" y1="5" x2="12" y2="19"></line>
               <line x1="5" y1="12" x2="19" y2="12"></line>
             </svg>
           </div>
           <span 
            style={{ fontSize: '0.9vh' }}
            className="group-hover:text-red-500 transition-colors duration-200">
             碎片
           </span>
         </div>
         
         {/* 激活指示器 */}
         {(isTabExpanded || expanded) && (
           <div 
             className="absolute top-1 rounded-l-full"
             style={{
               right: '-0.1vw',
               width: '0.2vw',
               height: '2vh',

             }}
           />
         )}
       </div>
     </div>

     {/* 窗口內容 */}
     {!expanded || isCollapsed ? (
       // 收合狀態 - 固定高度，支援捲軸
       <div className="flex items-center justify-between h-full">
         <textarea
          className="flex-1 transition-all duration-200 outline-none text-navy placeholder-grayish font-medium resize-none"
          placeholder="碎片內容..."
          value={content}
          onChange={e => setContent(e.target.value)}
          // 移除 onInput 動態調整高度
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            padding: '0.75rem',
            fontSize: '1rem',
            lineHeight: '1.75em',
            width: '100%',
            height: '2.5rem', // 固定高度
            maxHeight: '2.5rem',
            overflowY: 'auto', // 支援捲軸
            backgroundImage: `
              repeating-linear-gradient(
                to bottom,
                transparent 0em,
                transparent 1.74em,
                rgba(120, 140, 170, 0.2) 1.74em,
                transparent 1.75em
              )
            `,
            backgroundSize: '100% 1.75em',
            backgroundPosition: '0 0',
          }}
          onFocus={e => {
            e.target.style.borderBottomColor = 'rgba(30, 42, 56, 0.5)'
          }}
          onBlur={e => {
            e.target.style.borderBottomColor = 'rgba(120, 140, 170, 0.3)'
          }}
        />
       </div>
     ) : (
       // 展開狀態 - 重新架構佈局，固定上下控制區域
       <div className="flex flex-col h-full">
         {/* 頂部控制區 - 固定位置 */}
         <div className="flex-shrink-0">
           <InputBarHeader 
            isFullScreen={isFullScreen}
            onCollapse={handleCollapseWindow}
            onToggleFullScreen={handleToggleFullScreen}
            isTabMode={isTabMode}
          />
         </div>

         {/* 可捲動的內容區域 */}
         <div
          className={`flex-1 overflow-y-auto ${hoverScrollbarArea ? 'scrollbar-hover' : 'scrollbar-invisible'}`}
          {...scrollbarHoverHandlers}
          style={{
            maxHeight: 'calc(85vh - 8rem)',
            paddingRight: '0.25rem',
          }}
        >
          
          <div className="space-y-4 pr-1">
           {/* 主要輸入區 */}
           <div className="flex items-center gap-2" style={{ paddingLeft: '1.25rem', paddingRight: '1.25rem' }}>
            <textarea
            key={resetKey} // 清除時重新創建，確保高度重置
            className="flex-1 p-3 transition-all duration-200 outline-none text-navy placeholder-grayish font-medium resize-none"
            placeholder="碎片內容..."
            value={content}
            onChange={e => setContent(e.target.value)}
            onInput={e => {
              const target = e.currentTarget
              target.style.height = 'auto'
              target.style.height = `${target.scrollHeight}px`
            }}
            rows={1}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              padding: '0',
              marginLeft: '1em',
              marginRight: '1em',
              fontSize: '1rem',
              lineHeight: '1.75em',
              width: '100%',
              height: 'auto',
              overflow: 'hidden',
            }}
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
           </div>
         </div>

         {/* 底部操作按鈕 - 固定位置 */}
         <div className="flex-shrink-0 border-t border-gray-100 pt-4 mt-4">
           <ActionButtons 
             isFullScreen={isFullScreen}
             totalCharCount={totalCharCount}
             clearDragActive={false}
             clearButtonRef={null}
             onSubmit={handleSubmit}
             onClear={handleClear}
             onClearDragStart={() => {}}
             onClearDragEnd={() => {}}
           />
         </div>
       </div>
     )}
   </div>
 </>
)}