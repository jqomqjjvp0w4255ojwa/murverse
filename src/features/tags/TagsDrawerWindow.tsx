// TagsDrawerWindow.tsx
/**
 * 📌 功能：抽屜式標籤管理窗口
 *
 * 🧩 重點功能：
 * - 左側固定抽屜設計，高度 100vh
 * - 可拖拽調整寬度（40vw - 50vw）
 * - L形資料夾效果：tab 書籤跟隨抽屜移動
 * - 標籤篩選與邏輯操作：支援 AND/OR 模式篩選
 * - 搜尋與排序：支援依名稱、次數、使用頻率等排序與搜尋
 * - 新增、重命名、刪除標籤：完整的標籤管理功能
 * - 支援標籤選擇模式：search（查看篩選結果）、add（為新 fragment 加標籤）
 * - 進階搜尋面板：在 searchMode === 'fragment' 時出現
 */

'use client'

import { useState, useEffect, useRef, forwardRef } from 'react'
import { useFragmentsStore } from '@/features/fragments/store/useFragmentsStore'
import { useGlobalTagsStore } from '@/features/tags/store/useGlobalTagsStore'
import TagsHeader from './components/TagsHeader'
import TagsSearchBar from './components/TagsSearchBar'
import MetaTagsSelector from './components/MetaTagsSelector'
import TagLogicToggle from './components/TagLogicToggle'
import EditTagsPanel from './components/EditTagsPanel'
import TagsList from './components/TagsList'
import React from 'react'
import AdvancedSearchPanel from '../search/AdvancedSearchPanel'
import { DEFAULT_META_TAGS, MetaTag } from '@/features/tags/constants/metaTags'
import { MetaTagsService } from '@/features/tags/services/MetaTagsService'
import { SearchService } from '@/features/search/SearchService'
import { useSearchStore } from '@/features/search/useSearchStore'
import { useAdvancedSearch } from '@/features/search/useAdvancedSearch'
import { SYSTEM_TAGS, isSystemTag } from '@/features/tags/constants/systemTags'
import TagDropZone from './components/TagDropZone'
import { useTagDragManager } from '@/features/fragments/layout/useTagDragManager'
import { useTagCollectionStore } from '@/features/tags/store/useTagCollectionStore'
import { useSingleUserTagSync } from '@/shared/hook/useSingleUserTagSync'
import { useTagsSearch } from './hooks/useTagsSearch'
import { useTagsOperations } from './hooks/useTagsOperations'

// 定義 TagInfo 類型
type TagInfo = { name: string; count: number }

const TagsDrawerWindow = forwardRef<HTMLDivElement>((props, ref) => {
  // 抽屜狀態管理
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [drawerWidth, setDrawerWidth] = useState(() => {
    // 從 localStorage 讀取保存的寬度，默認 40vw
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('drawer-width')
      return saved ? parseFloat(saved) : 25
    }
    return 25
  })
  const [isDragging, setIsDragging] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)
  const resizeHandleRef = useRef<HTMLDivElement>(null)

  // 從 store 獲取狀態和方法
  const { 
    tagsWindowRef, 
    pendingTags, 
    setPendingTags, 
    addPendingTag, 
    removePendingTag,
    externalTagSelectorPosition, 
    resetExternalTagSelectorPosition,
    mode, 
    pulse, 
    setMode,
    setConnected,
    setSearchMode: tagsStoreSetSearchMode
  } = useGlobalTagsStore()

  const {
    customDateRange
  } = useAdvancedSearch();

  const { 
    fragments, 
    setFragments, 
    selectedTags, 
    setSelectedTags, 
    excludedTags, 
    setExcludedTags, 
    tagLogicMode, 
    setTagLogicMode 
  } = useFragmentsStore()

  // 本地狀態
  const [allTags, setAllTags] = useState<TagInfo[]>([])
  const [showLine, setShowLine] = useState(false)
  const [recentlyUsedTags, setRecentlyUsedTags] = useState<string[]>([])
  
  // 使用搜尋 hook
  const searchHook = useTagsSearch(allTags, recentlyUsedTags, mode, selectedTags, excludedTags)
  const {
    search,
    searchMode,
    searchExecuted,
    noResults,
    searchedKeyword,
    sortMode,
    onlyShowSel,
    selectedMetaTags,
    showSpecialTags
  } = searchHook.state

  const {
    setSearch,
    setSearchMode,
    setSortMode,
    setOnlyShowSel,
    executeFragmentSearch,
    resetNoResults,
    handleSearchModeChange,
    handleAddMetaTag,
    handleRemoveMetaTag,
    toggleSearchFocus
  } = searchHook.actions

  const tagsOperations = useTagsOperations()

  // 保留這一行
  const [metaTags] = useState<MetaTag[]>(DEFAULT_META_TAGS)
  const [visibleStartIndex, setVisibleStartIndex] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  const tagListRef = useRef<HTMLDivElement>(null)
  const [editMode, setEditMode] = useState(false)
  const [selectedTagsToDelete, setSelectedTagsToDelete] = useState<string[]>([])
  const [editingTag, setEditingTag] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const { isDragging: isTagDragging, draggingTag, isOverTagWindow } = useTagDragManager()
  const { isCollected, addTag } = useTagCollectionStore()
  const [dropFeedback, setDropFeedback] = useState<{ visible: boolean, message: string, success: boolean }>({
    visible: false,
    message: '',
    success: false
  })
  const { syncAddTag, syncRemoveTags } = useSingleUserTagSync()
  const { collectedTags } = useTagCollectionStore()
  const [tagViewMode, setTagViewMode] = useState<'personal' | 'global'>('personal')
  const { globalTags, initializeFromFragments } = useGlobalTagsStore()
  
  // 新增：過濾後的碎片狀態
  const [filteredFragments, setFilteredFragments] = useState<any[]>([])
  
  // 參考組合 - 合併 drawerRef 和 tagsWindowRef
  const combinedRef = (node: HTMLDivElement | null) => {
    drawerRef.current = node
    tagsWindowRef.current = node
    if (ref) {
      if (typeof ref === 'function') {
        ref(node)
      } else {
        ref.current = node
      }
    }
  }

  // 處理搜尋模式變更
  const handleSetSearchMode = (mode: 'tag' | 'fragment') => {
    setSearchMode(mode);
    tagsStoreSetSearchMode(mode);
    useSearchStore.getState().setSearchMode(mode);
  
    if (mode === 'fragment') {
      resetNoResults();
    }
  };

  
  // 🚀 修復：初始化標籤列表 - 檢查 fragments 是否為 null
  useEffect(() => {
    if (!fragments) {
      console.warn('⚠️ fragments 為 null，無法初始化標籤')
      setAllTags([])
      setFilteredFragments([])
      return
    }

    const map = new Map<string, number>()
    fragments.forEach((f: any) => f.tags.forEach((t: string) => map.set(t, (map.get(t) || 0) + 1)))
    const extra = JSON.parse(localStorage.getItem('mur_tags_global') || '[]') as string[]
    extra.forEach(t => map.set(t, map.get(t) || 0))
    setAllTags([...map.entries()].map(([name, count]) => ({ name, count })))
    
    setFilteredFragments(fragments)
  }, [fragments])

  // 載入最近使用的標籤
  useEffect(() => {
    try {
      const storedRecentTags = JSON.parse(localStorage.getItem('mur_recent_tags') || '[]')
      setRecentlyUsedTags(storedRecentTags)
    } catch (e) {
      console.error('Error loading recent tags from localStorage', e)
    }
  }, [])

  // 處理外部標籤選擇器位置
  useEffect(() => {
    if (externalTagSelectorPosition) {
      setIsDrawerOpen(true)
      setMode('add')
      handleSetSearchMode('tag')
      resetExternalTagSelectorPosition()
    }
  }, [externalTagSelectorPosition, resetExternalTagSelectorPosition, setMode])

  // 編輯模式變更
  useEffect(() => {
    if (!editMode) {
      setEditingTag(null)
      setEditValue('')
      setSelectedTagsToDelete([])
    }
  }, [editMode])


  // 1. 監聽展開抽屜事件
useEffect(() => {
  const handleOpenDrawer = () => {
    console.log('收到展開抽屜事件');
    setIsDrawerOpen(true);
  };
  
  window.addEventListener('open-tags-drawer', handleOpenDrawer);
  
  return () => {
    window.removeEventListener('open-tags-drawer', handleOpenDrawer);
  };
}, []);

// 2. 監聽抽屜狀態變化，發送收合事件
useEffect(() => {
  if (!isDrawerOpen) {
    // 抽屜收合時發送事件
    const closeEvent = new CustomEvent('tags-drawer-closed');
    window.dispatchEvent(closeEvent);
  }
}, [isDrawerOpen]);

  // 保存草稿
  useEffect(() => {
    const draft = JSON.parse(localStorage.getItem('murverse_draft') || '{}')
    localStorage.setItem('murverse_draft', JSON.stringify({
      ...draft,
      tags: pendingTags,
    }))
  }, [pendingTags])

  // 模式變更動畫效果
  useEffect(() => {
    if (mode === 'add') {
      drawerRef.current?.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.02)' }, { transform: 'scale(1)' }],
        { duration: 300, iterations: 1 }
      )
    }
  }, [pulse])

  useEffect(() => {
    if (mode === 'add' && searchMode !== 'tag') {
      console.log('強制將搜尋模式設為標籤模式');
      handleSetSearchMode('tag');
    }
  }, [mode, searchMode]);

  useEffect(() => {
    if (searchMode === 'fragment' && !searchExecuted) {
      // 🚀 修復：檢查 fragments 是否為 null
      const fragments = useFragmentsStore.getState().fragments
      if (fragments) {
        const searchStore = useSearchStore.getState()
        searchStore.executeSearch(fragments)
        console.log('🔍 初始執行搜尋以填充 searchResults')
      } else {
        console.warn('⚠️ fragments 為 null，無法執行搜尋')
      }
    }
  }, [searchMode, searchExecuted])

  // 添加標籤
  const handleAddTag = () => {
    const raw = search.trim()
    if (!raw) return

    const clean = raw.replace(/^#/, '')
    if (isSystemTag(clean)) {
      setSearch('')
      return
    }

    if (!allTags.some(tag => tag.name === clean)) {
      setAllTags([...allTags, { name: clean, count: 1 }])
    }
    const stored = JSON.parse(localStorage.getItem('mur_tags_global') || '[]') as string[]
    if (!stored.includes(clean)) {
      localStorage.setItem('mur_tags_global', JSON.stringify([...stored, clean]))
    }

    if (mode === 'add') {
      addPendingTag(clean)
    }

    syncAddTag(clean)

    if (mode === 'add') {
      addPendingTag(clean)
    }

    setSearch('')
  }

  const handleAdvancedSearch = (results: any) => {
    console.log('搜尋結果：', results)
    setFilteredFragments(results)
  }

  // 切換標籤選擇
  const handleTagSelectionToggle = (tagName: string) => {
    setSelectedTagsToDelete(prev => 
      prev.includes(tagName) 
        ? prev.filter(t => t !== tagName) 
        : [...prev, tagName]
    )
  }

  // 處理列表滾動
  const handleTagListScroll = () => {
    if (!tagListRef.current) return
    
    const { scrollTop, scrollHeight, clientHeight } = tagListRef.current
    
    if (scrollHeight - scrollTop - clientHeight < 100) {
      setItemsPerPage(prev => prev + 30)
    }
  }

  // 過濾並排序標籤
  const getShownTags = () => {
    const tokens = SearchService.parseSearchQuery(search, 'substring')
    
    return allTags
      .filter(t => {
        if (!tokens.length) return true

        return tokens.some(token => {
          const tag = t.name.toLowerCase()
          const val = token.value.toLowerCase()

          if (token.type === 'include' || token.type === 'text') {
            return tag.includes(val)
          } else if (token.type === 'exact') {
            return tag === val
          } else if (token.type === 'wildcard') {
            return tag.includes(val.replace(/\*/g, ''))
          }
          return false
        })
      })
      .filter(t => {
        if (editMode) return true
        return mode === 'add'
          ? true
          : (onlyShowSel ? selectedTags.includes(t.name) || excludedTags.includes(t.name) : true)
      })
      .sort((a, b) => {
        const baseMode = sortMode.replace('asc_', '').replace('desc_', '')
        const isDesc = sortMode.startsWith('desc_')

        if (baseMode === 'az') {
          return isDesc ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name)
        } else if (baseMode === 'freq') {
          return isDesc ? b.count - a.count : a.count - b.count
        } else if (baseMode === 'recent') {
          const aIndex = recentlyUsedTags.indexOf(a.name)
          const bIndex = recentlyUsedTags.indexOf(b.name)
          const aRecentIndex = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex
          const bRecentIndex = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex
          return isDesc ? bRecentIndex - aRecentIndex : aRecentIndex - bRecentIndex
        }
        return 0
      })
  }
  
  const shown = getShownTags()

  // 初始化 searchStore
  useEffect(() => {
    const searchStoreInstance = useSearchStore.getState()
    searchStoreInstance.setSearchMode(searchMode)
    
    const unsubscribe = useSearchStore.subscribe((state) => {
      if (state.searchResults && state.searchResults.length > 0) {
        setFilteredFragments(state.searchResults)
      }
    })
    
    return () => {
      unsubscribe()
    }
  }, [])

  // 處理標籤拖放到窗口
  useEffect(() => {
    if (!isTagDragging || !draggingTag) return

    const handleDragEnd = (e: MouseEvent) => {
      if (isOverTagWindow && draggingTag) {
        const alreadyExists = isCollected(draggingTag)
        
        if (!alreadyExists) {
          addTag(draggingTag)
          
          setDropFeedback({
            visible: true,
            message: `已將「${draggingTag}」加入收藏`,
            success: true
          })
        } else {
          setDropFeedback({
            visible: true,
            message: `「${draggingTag}」已在收藏中`,
            success: false
          })
        }
        
        setTimeout(() => {
          setDropFeedback(prev => ({ ...prev, visible: false }))
        }, 3000)
      }
    }
    
    window.addEventListener('mouseup', handleDragEnd)
    return () => window.removeEventListener('mouseup', handleDragEnd)
  }, [isTagDragging, draggingTag, isOverTagWindow, isCollected, addTag])

  // 🚀 修復：檢查 fragments 是否為 null
  useEffect(() => {
    if (fragments) {
      initializeFromFragments(fragments)
    }
  }, [fragments, initializeFromFragments])

  return (
  <>
  
    {/* 拖放操作反饋訊息 */}
    {dropFeedback.visible && (
        <div 
          style={{
            position: 'fixed',
            top: '2vh',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: dropFeedback.success ? 'rgba(60, 179, 113, 0.9)' : 'rgba(255, 165, 0, 0.9)',
            color: 'white',
            padding: '1vh 2vw',
            borderRadius: '2vh',
            boxShadow: '0 0.5vh 1vh rgba(0, 0, 0, 0.2)',
            fontSize: '1.4vh',
            zIndex: 2300,
            animation: 'fadeInOut 3s ease-in-out',
          }}
        >
          {dropFeedback.message}
        </div>
      )}

      {/* 標籤抽屜窗口本體 */}
      <div
      id="tags-floating-window"
      ref={combinedRef}
      className="fixed left-0 top-0 shadow-lg select-none transition-transform duration-300 ease-out z-[20]"
      style={{
        width: `${drawerWidth}vw`,
        height: '100vh',
        transform: `translateX(${isDrawerOpen ? '0' : '-100%'})`,
        // 修改這裡：統一使用  #cbbaa4
        background: '#fefdfb', // 改成跟標籤 tab 一樣的顏色
      }}
    >
        {/* Tab 書籤 - 現在在抽屜內部，用 absolute 定位到右側 */}
        <div
        className="absolute cursor-pointer select-none group"
        style={{
          top: '25vh',
          right: '-2vw',
          transform: 'translateY(-50%)',
          zIndex: 5
        }}
        onMouseDown={(e) => {
          // 保持原有的拖拽邏輯
          if (e.button !== 0) return
          
          const startX = e.clientX
          let hasMoved = false
          
          const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX
            
            if (Math.abs(deltaX) > 5) {
              hasMoved = true
              if (isDrawerOpen) {
                setIsDragging(true)
                const newWidth = (moveEvent.clientX / window.innerWidth) * 100
                const clampedWidth = Math.min(Math.max(newWidth, 16), 50)
                setDrawerWidth(clampedWidth)
              }
            }
          }
          
          const handleMouseUp = () => {
            if (isDragging) {
              setIsDragging(false)
              localStorage.setItem('drawer-width', drawerWidth.toString())
            } else if (!hasMoved) {
              // 點擊切換抽屜狀態
              const newState = !isDrawerOpen;
              setIsDrawerOpen(newState);
              
              // 如果是收合抽屜，發送收合事件
              if (!newState) {
                const closeEvent = new CustomEvent('tags-drawer-closed');
                window.dispatchEvent(closeEvent);
              }
            }
            
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
          }
          
          document.addEventListener('mousemove', handleMouseMove)
          document.addEventListener('mouseup', handleMouseUp)
        }}
      >
            <div 
            className="relative transition-all duration-200 ease-out group-hover:shadow-md"
            style={{
              width: '2vw',
              height: '8vh',
              background: '#fefdfb', // 統一背景色
              ...(isDrawerOpen ? { 
                borderLeft: 'none',
                // 展開時只有右側輕微陰影
                boxShadow: '2px 0 4px rgba(0, 0, 0, 0.1)' 
              } : { 
                borderTop: '2px solid  #c9c9c9',
                borderRight: '2px solid #c9c9c9', 
                borderBottom: '2px solid #c9c9c9',
                borderLeft: 'none', // 左邊不要框
                // 收合時有邊框陰影和右側陰影
                boxShadow: '0 2px 6px rgba(0,0,0,0.05), 2px 0 4px rgba(0, 0, 0, 0.1)'
              }),
              borderRadius: '0 1vh 1vh 0', // 統一圓角大小
            }}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center transition-colors duration-200" 
                 style={{ color: isDrawerOpen ? '#1e2a38' : '#999999' }}>
              <div 
                style={{
                  width: '1.6vh',
                  height: '1.8vh',
                  marginBottom: '0.2vh'
                }}
                className="group-hover:text-red-500 transition-colors duration-200">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                <line x1="7" y1="7" x2="7.01" y2="7"></line>
              </svg>
              </div>
              <span 
                style={{ fontSize: '0.9vh' }}
                className="group-hover:text-red-500 transition-colors duration-200">
                標籤
              </span>
            </div>
            
            {/* 激活指示器 */}
            {isDrawerOpen && (
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

        {/* 抽屜內容 */}
        <div className="h-full overflow-hidden flex flex-col" style={{ padding: '2vh', paddingLeft: 'max(4vh, calc(2vw + 2vh))' }}>
          {/* 🧩 標籤面板標頭區塊 */}
          <TagsHeader
            mode={mode}
            editMode={editMode}
            onEditModeToggle={() => setEditMode(!editMode)}
            onlyShowSel={onlyShowSel}
            onFilterToggle={() => setOnlyShowSel(!onlyShowSel)}
            isFullScreen={false}
            onCollapseClick={() => {}} 
            onToggleFullScreen={() => {}} // 抽屜模式下不使用全螢幕
            hideEditButton={searchMode === 'fragment'}
            hideFilterButton={searchMode === 'fragment'}
          />

          {/* 🔍 搜尋與過濾區域 */}
          <div style={{ marginBottom: '2vh' }}>
            <div className="relative">
              <TagsSearchBar
                search={search}
                setSearch={setSearch}
                editMode={editMode}
                searchMode={searchMode}
                setSearchMode={handleSetSearchMode}
                sortMode={sortMode}
                setSortMode={setSortMode}
                onAddTag={handleAddTag}
                onFocus={() => !editMode && toggleSearchFocus(true)}
                onBlur={() => !editMode && setTimeout(() => toggleSearchFocus(false), 200)}
                selectedMetaTags={selectedMetaTags}
                onRemoveMetaTag={handleRemoveMetaTag}
                isAddMode={mode === 'add'}
                onSearchModeChange={handleSearchModeChange}
                onSearch={() => searchMode === 'fragment' && executeFragmentSearch()}
                allTagNames={allTags.map(tag => tag.name)}
              />
              {/* 🔍 碎片搜尋按鈕（僅在碎片模式下顯示） */}
              {searchMode === 'fragment' && (
                <button
                  onClick={() => executeFragmentSearch()}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 text-gray-600 hover:text-blue-600"
                  title="執行搜尋"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              )}
            </div>

            {/* ⭐ 特殊標籤選擇器 */}
            {showSpecialTags && !editMode && searchMode === 'tag' && (
              <MetaTagsSelector
                metaTags={metaTags}
                selectedMetaTags={selectedMetaTags}
                onAddMetaTag={handleAddMetaTag}
              />
            )}

            {/* ⚙️ 邏輯切換：AND / OR */}
            {!editMode && searchMode === 'tag' && (
              <TagLogicToggle
                tagLogicMode={tagLogicMode}
                setTagLogicMode={setTagLogicMode}
                mode={mode}
                pendingTags={pendingTags}
                setPendingTags={setPendingTags}
                selectedTags={selectedTags}
                setSelectedTags={setSelectedTags}
                excludedTags={excludedTags}
                setExcludedTags={setExcludedTags}
              />
            )}
          </div>

          {/* ✏️ 編輯提示面板 */}
          {editMode && (
            <EditTagsPanel
              selectedTagsToDelete={selectedTagsToDelete}
              onDeleteTags={() => tagsOperations.handleDeleteSelectedTags(selectedTagsToDelete, allTags, setAllTags)}
              onCancelSelection={() => setSelectedTagsToDelete([])}
            />
          )}

          {/* 📋 標籤清單（標籤模式下顯示） */}
          {searchMode === 'tag' && (
            <div className="flex-1 overflow-hidden">
              <TagsList
                ref={tagListRef}
                isFullScreen={true}
                editMode={editMode}
                mode={mode}
                tags={allTags}
                itemsPerPage={itemsPerPage}
                totalTagsCount={shown.length}
                shown={shown}
                selectedTagsToDelete={selectedTagsToDelete}
                editingTag={editingTag}
                editValue={editValue}
                sortMode={sortMode}
                onScroll={handleTagListScroll}
                onTagSelect={(tagName) => tagsOperations.handleTagSelect(tagName, editMode, setFilteredFragments)}
                onTagExclude={(tagName) => tagsOperations.handleTagExclude(tagName, editMode, setFilteredFragments)}
                onTagRename={(oldName, newName) => tagsOperations.handleTagRename(oldName, newName, allTags, setAllTags)}
                onTagSelectionToggle={handleTagSelectionToggle}
                onSetEditingTag={setEditingTag}
                onEditValueChange={setEditValue}
                isPos={tagsOperations.isPos}
                isNeg={tagsOperations.isNeg}
              />
            </div>
          )}

          {/* 🔍 進階搜尋面板（碎片搜尋時） */}
          {!editMode && searchMode === 'fragment' && (
            <div className="flex-1 overflow-auto">
              <AdvancedSearchPanel
                onSearch={handleAdvancedSearch}
                noResults={noResults}
                searchedKeyword={searchedKeyword}
                onResetNoResults={resetNoResults}
                onClearLocalSearch={() => setSearch('')}
              />
            </div>
          )}
        </div>

      </div>

      {/* 拖曳時的標籤丟放區（浮在畫面最下方） */}
      {searchMode === 'tag' && !editMode && isTagDragging && draggingTag && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[9999]">
          <TagDropZone />
        </div>
      )}
    </>
  )
})

export default TagsDrawerWindow