// components/TagsFloatingWindow.tsx
'use client'

import { useState, useEffect, useRef, forwardRef } from 'react'
import { useFragmentsStore } from '@/stores/useFragmentsStore'
import { useTagsStore } from '@/stores/useTagsStore'
import { useFloatingWindow } from '@/hooks/useFloatingWindow'
import { useGroupsStore } from '@/stores/useGroupsStore'
import TagsHeader from './fragments/tags/TagsHeader'
import TagsSearchBar from './fragments/tags/TagsSearchBar'
import MetaTagsSelector from './fragments/tags/MetaTagsSelector'
import TagLogicToggle from './fragments/tags/TagLogicToggle'
import EditTagsPanel from './fragments/tags/EditTagsPanel'
import TagsList from './fragments/tags/TagsList'
import React from 'react'


type TagInfo = { name: string; count: number }

const TagsFloatingWindow = forwardRef<HTMLDivElement>((props, ref) => {
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
    setMode 
  } = useTagsStore()

  const { 
    fragments, 
    setFragments, 
    save, 
    selectedTags, 
    setSelectedTags, 
    excludedTags, 
    setExcludedTags, 
    tagLogicMode, 
    setTagLogicMode 
  } = useFragmentsStore()

  // 使用浮動窗口 hook
  const {
    windowRef: winRef,
    pos,
    isCollapsed,
    isFullScreen,
    toggleCollapse,
    toggleFullScreen,
    setPos,
    handleMouseDown, // ✅ 記得補這個
  } = useFloatingWindow({
    id: 'tags-floating-window',
    defaultPosition: { x: 100, y: 100 }
  })

  // 本地狀態
  const [search, setSearch] = useState('')
  const [allTags, setAllTags] = useState<TagInfo[]>([])
  const [onlyShowSel, setOnlyShowSel] = useState(false)
  const [sortMode, setSortMode] = useState<string>('desc_freq')
  const [searchMode, setSearchMode] = useState<'tag' | 'fragment'>('tag')
  const [recentlyUsedTags, setRecentlyUsedTags] = useState<string[]>([])
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [showSpecialTags, setShowSpecialTags] = useState(false)
  const [metaTags] = useState([
    { id: 'group', name: '群組', icon: '📚' },
    { id: 'recent', name: '最近', icon: '🕒' },
    { id: 'favorite', name: '收藏', icon: '⭐' },
    { id: 'important', name: '重要', icon: '❗' },
  ])
  const [selectedMetaTags, setSelectedMetaTags] = useState<{id: string, name: string, icon: string}[]>([])
  const [visibleStartIndex, setVisibleStartIndex] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  const tagListRef = useRef<HTMLDivElement>(null)
  const [editMode, setEditMode] = useState(false)
  const [selectedTagsToDelete, setSelectedTagsToDelete] = useState<string[]>([])
  const [editingTag, setEditingTag] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const hasRegistered = useRef(false)
  const { addWindow, updateWindow, checkAndResolveOverlaps } = useGroupsStore()

  // 參考組合
  const combinedRef = (node: HTMLDivElement | null) => {
    winRef.current = node
    tagsWindowRef.current = node
    if (ref) {
      if (typeof ref === 'function') {
        ref(node)
      } else {
        ref.current = node
      }
    }
  }

  // 初始化標籤列表
  useEffect(() => {
    const map = new Map<string, number>()
    fragments.forEach(f => f.tags.forEach(t => map.set(t, (map.get(t) || 0) + 1)))
    const extra = JSON.parse(localStorage.getItem('mur_tags_global') || '[]') as string[]
    extra.forEach(t => map.set(t, map.get(t) || 0))
    setAllTags([...map.entries()].map(([name, count]) => ({ name, count })))
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
      const W = 320, H = 200, gap = 12
      let x = externalTagSelectorPosition.x + gap
      let y = externalTagSelectorPosition.y + gap
      if (typeof window !== 'undefined') {
        if (x + W > window.innerWidth) x = externalTagSelectorPosition.x - W - gap
        if (y + H > window.innerHeight) y = window.innerHeight - H - 20
      }
      
      setPos({ x, y })
      setMode('add')
      resetExternalTagSelectorPosition()
      
      // 定位標籤窗口後檢查重疊情況
      setTimeout(() => {
        checkAndResolveOverlaps()
      }, 50)
    }
  }, [externalTagSelectorPosition, resetExternalTagSelectorPosition, setMode, setPos, checkAndResolveOverlaps])

  // 編輯模式變更
  useEffect(() => {
    if (!editMode) {
      setEditingTag(null)
      setEditValue('')
      setSelectedTagsToDelete([])
    }
  }, [editMode])

  // 保存草稿
  useEffect(() => {
    const draft = JSON.parse(localStorage.getItem('murverse_draft') || '{}')
    localStorage.setItem('murverse_draft', JSON.stringify({
      ...draft,
      tags: pendingTags,
    }))
  }, [pendingTags])

  // 註冊窗口
  useEffect(() => {
    const el = winRef.current
    if (!el || hasRegistered.current) return

    requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect()
      addWindow({
        id: 'tags-floating-window',
        x: rect.left,
        y: rect.top,
        width: rect.width || 320,
        height: rect.height || 200
      })
      hasRegistered.current = true
    })
  }, [addWindow])

  // 更新窗口尺寸和檢查重疊
  useEffect(() => {
    if (!winRef.current) return
    
    setTimeout(() => {
      const rect = winRef.current?.getBoundingClientRect()
      if (!rect) return
      
      // 更新 store 中的窗口信息
      updateWindow('tags-floating-window', {
        width: rect.width,
        height: rect.height
      })
      
      // 檢查是否在群組中並重新排列
      const groups = useGroupsStore.getState().groups
      const myGroup = groups.find(g => g.memberIds.includes('tags-floating-window'))
      
      if (myGroup) {
        useGroupsStore.getState().layoutGroupMembersVertically(myGroup.id)
      }
      
      // 檢查並解決可能的窗口重疊
      checkAndResolveOverlaps()
    }, 100)
  }, [isCollapsed, isFullScreen, updateWindow, checkAndResolveOverlaps])

  // 模式變更動畫效果
  useEffect(() => {
    if (mode === 'add') {
      winRef.current?.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.07)' }, { transform: 'scale(1)' }],
        { duration: 300, iterations: 2 }
      )
    }
  }, [pulse])

  // 記錄標籤使用
  const recordTagUsage = (tagName: string) => {
    setRecentlyUsedTags(prev => {
      // 從現有列表中移除此標籤（如果存在）
      const filtered = prev.filter(t => t !== tagName)
      // 將標籤添加到列表頂部（最近使用）
      return [tagName, ...filtered].slice(0, 50) // 只保留最近的50個
    })
  
    // 保存到localStorage
    try {
      const storedTags = JSON.parse(localStorage.getItem('mur_recent_tags') || '[]')
      const updatedTags = [tagName, ...storedTags.filter((t: string) => t !== tagName)].slice(0, 50)
      localStorage.setItem('mur_recent_tags', JSON.stringify(updatedTags))
    } catch (e) {
      console.error('Error saving recent tags to localStorage', e)
    }
  }
  
  // 添加標籤
  const handleAddTag = () => {
    const t = search.trim()
    if (!t) return
    if (!allTags.find(v => v.name === t)) {
      setAllTags([...allTags, { name: t, count: 1 }])
    }
    const stored = JSON.parse(localStorage.getItem('mur_tags_global') || '[]') as string[]
    if (!stored.includes(t)) {
      localStorage.setItem('mur_tags_global', JSON.stringify([...stored, t]))
    }
    addPendingTag(t)
    setSearch('')
  }

  // 添加特殊標籤
  const handleAddMetaTag = (tag: {id: string, name: string, icon: string}) => {
    setSelectedMetaTags(prev => {
      if (prev.some(t => t.id === tag.id)) {
        return prev.filter(t => t.id !== tag.id)
      }
      return [...prev, tag]
    })
    
    // 這裡可以增加相應的查詢邏輯
    console.log(`添加特殊標籤: ${tag.name}`)
    
    // 取消顯示特殊標籤選項
    setShowSpecialTags(false)
  }
  
  // 移除特殊標籤
  const handleRemoveMetaTag = (tagId: string) => {
    setSelectedMetaTags(prev => prev.filter(tag => tag.id !== tagId))
  }

  // 選擇標籤
  const handleTagSelect = (t: string) => {
    if (editMode) return // 編輯模式下不執行選擇操作
    
    recordTagUsage(t) // 記錄標籤使用
    
    if (mode === 'add') {
      pendingTags.includes(t) ? removePendingTag(t) : addPendingTag(t)
    } else {
      selectedTags.includes(t)
        ? setSelectedTags(selectedTags.filter(k => k !== t))
        : (setSelectedTags([...selectedTags, t]),
           setExcludedTags(excludedTags.filter(k => k !== t)))
    }
  }

  // 排除標籤
  const handleTagExclude = (t: string) => {
    if (editMode) return // 編輯模式下不執行排除操作
    
    if (mode === 'add') return
      excludedTags.includes(t)
      ? setExcludedTags(excludedTags.filter(k => k !== t))
      : (setExcludedTags([...excludedTags, t]),
        setSelectedTags(selectedTags.filter(k => k !== t)));
  };

  // 切換標籤選擇
  const handleTagSelectionToggle = (tagName: string) => {
    setSelectedTagsToDelete(prev => 
      prev.includes(tagName) 
        ? prev.filter(t => t !== tagName) 
        : [...prev, tagName]
    )
  }

  // 重命名標籤
  const handleTagRename = (oldName: string, newName: string) => {
    newName = newName.trim()
    if (!newName || oldName === newName) {
      setEditingTag(null)
      return
    }
    
    if (allTags.some(tag => tag.name === newName && tag.name !== oldName)) {
      alert('標籤名稱已存在！')
      setEditingTag(null)
      return
    }
    
    setAllTags(allTags.map(tag => 
      tag.name === oldName ? { name: newName, count: tag.count } : tag
    ))

    const stored = JSON.parse(localStorage.getItem('mur_tags_global') || '[]') as string[]
    localStorage.setItem('mur_tags_global', JSON.stringify([
      ...stored.filter(t => t !== oldName),
      newName
    ]))

    if (mode === 'add') {
      if (pendingTags.includes(oldName)) {
        setPendingTags(pendingTags.map(t => t === oldName ? newName : t))
      }
    } else {
      if (selectedTags.includes(oldName)) {
        setSelectedTags(selectedTags.map(t => t === oldName ? newName : t))
      }
      if (excludedTags.includes(oldName)) {
        setExcludedTags(excludedTags.map(t => t === oldName ? newName : t))
      }
    }

    const updatedFragments = fragments.map(fragment => {
      if (fragment.tags.includes(oldName)) {
        return {
          ...fragment,
          tags: fragment.tags.map(t => t === oldName ? newName : t),
          updatedAt: new Date().toISOString()
        }
      }
      return fragment
    })

    setFragments(updatedFragments)
    save()
    
    setEditingTag(null)
  }

  // 刪除選中的標籤
  const handleDeleteSelectedTags = () => {
    if (!selectedTagsToDelete.length) return
    
    if (!confirm(`確定要刪除這 ${selectedTagsToDelete.length} 個標籤嗎？此操作無法撤銷。`)) return
    
    // 從 allTags 中移除
    setAllTags(allTags.filter(tag => !selectedTagsToDelete.includes(tag.name)))
    
    // 從本地存儲中移除
    const stored = JSON.parse(localStorage.getItem('mur_tags_global') || '[]') as string[]
    localStorage.setItem('mur_tags_global', JSON.stringify(
      stored.filter(t => !selectedTagsToDelete.includes(t))
    ))
    
    // 從 pendingTags 和 selectedTags、excludedTags 中移除
    if (mode === 'add') {
      setPendingTags(pendingTags.filter(t => !selectedTagsToDelete.includes(t)))
    } else {
      setSelectedTags(selectedTags.filter(t => !selectedTagsToDelete.includes(t)))
      setExcludedTags(excludedTags.filter(t => !selectedTagsToDelete.includes(t)))
    }
    
    // 從所有碎片中移除這些標籤
    const updatedFragments = fragments.map(fragment => {
      if (fragment.tags.some(t => selectedTagsToDelete.includes(t))) {
        return {
          ...fragment,
          tags: fragment.tags.filter(t => !selectedTagsToDelete.includes(t)),
          updatedAt: new Date().toISOString()
        }
      }
      return fragment
    })
    
    setFragments(updatedFragments)
    save()
    
    // 清空選中列表
    setSelectedTagsToDelete([])
  }

  // 處理收合點擊
  const handleCollapseClick = () => {
    if (isFullScreen) {
      // 如果在全屏模式下點擊收合，先退出全屏，然後收合
      toggleFullScreen()
      setTimeout(() => toggleCollapse(), 10)
    } else {
      // 正常收合
      toggleCollapse()
    }
  }

  // 切換搜尋欄焦點
  const toggleSearchFocus = (focused: boolean) => {
    setIsSearchFocused(focused)
    setShowSpecialTags(focused)
  }

  // 處理列表滾動
  const handleTagListScroll = () => {
    if (!tagListRef.current) return
    
    const { scrollTop, scrollHeight, clientHeight } = tagListRef.current
    
    // 當滾動到底部附近時，加載更多標籤
    if (scrollHeight - scrollTop - clientHeight < 100) {
      setItemsPerPage(prev => prev + 30) // 每次增加30個標籤
    }
  }

  // 過濾並排序標籤
  const getShownTags = () => {
    return allTags
      .filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
      .filter(t => {
        // 在編輯模式下不考慮標籤選擇狀態，顯示所有匹配搜尋的標籤
        if (editMode) return true
        
        // 在非編輯模式下，根據onlyShowSel選項過濾標籤
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
        } else if (baseMode === 'created') {
          // 按創建時間排序 - 根據文檔信息，我們可能需要獲取標籤創建的時間戳
          // 這裡暫時使用字母順序作為替代
          return isDesc ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name)
        } else if (baseMode === 'popular') {
          // 熱門程度 - 可以是近期使用頻率
          return isDesc ? b.count - a.count : a.count - b.count
        } else if (baseMode === 'relevance') {
          // 相關性 - 基於當前選擇的標籤或內容
          // 這需要更複雜的邏輯，暫時使用計數作為替代
          return isDesc ? b.count - a.count : a.count - b.count
        }
        return 0
      })
  }

  // 檢查標籤狀態
  const isPos = (t: string) => mode === 'add' ? pendingTags.includes(t) : selectedTags.includes(t)
  const isNeg = (t: string) => mode === 'add' ? false : excludedTags.includes(t)

  // 獲取過濾後的標籤
  const shown = getShownTags()
  

  return (
    
    <div
      id="tags-floating-window"
      ref={combinedRef}
      onMouseDown={handleMouseDown}
      className={`fixed z-[20] bg-white border border-gray-400 rounded-2xl shadow-lg select-none 
        ${isCollapsed ? 'px-3 py-2' : 'p-4'}`}
      style={{
        top: isFullScreen ? 0 : pos.y,
        left: pos.x,
        width: isCollapsed ? '350px' : '350px',
        height: isFullScreen ? '100vh' : (isCollapsed ? '56px' : 'auto'),
        transition: 'width 0.3s, height 0.3s'
      }}
    >
      {isCollapsed ? (
        // 收合狀態
        <div className="flex justify-between items-center w-full h-full cursor-move">
          <div className="flex items-center gap-1 text-base font-semibold text-gray-700">
            <span>{mode === 'add' ? '✔️' : '💬'}</span>
            <span>標籤</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={toggleCollapse}
              className="w-6 h-6 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
              title="展開"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"></polyline>
                <polyline points="9 21 3 21 3 15"></polyline>
                <line x1="21" y1="3" x2="14" y2="10"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 標籤頭部 */}
          <TagsHeader
            mode={mode}
            editMode={editMode}
            onEditModeToggle={() => setEditMode(!editMode)}
            onlyShowSel={onlyShowSel}
            onFilterToggle={() => setOnlyShowSel(!onlyShowSel)}
            isFullScreen={isFullScreen}
            onCollapseClick={handleCollapseClick}
            onToggleFullScreen={toggleFullScreen}
          />


          {/* 搜尋欄 */}
          <div className="mb-4">
            <TagsSearchBar
              search={search}
              setSearch={setSearch}
              editMode={editMode}
              searchMode={searchMode}
              setSearchMode={setSearchMode}
              sortMode={sortMode}
              setSortMode={setSortMode}
              onAddTag={handleAddTag}
              onFocus={() => !editMode && toggleSearchFocus(true)}
              onBlur={() => {
                if (!editMode) {
                  setTimeout(() => toggleSearchFocus(false), 200)
                }
              }}
              selectedMetaTags={selectedMetaTags}
              onRemoveMetaTag={handleRemoveMetaTag}
              isAddMode={mode === 'add'}
            />

            {/* 特殊標籤區塊 */}
            {showSpecialTags && !editMode && searchMode === 'tag' && (
              <MetaTagsSelector
                metaTags={metaTags}
                selectedMetaTags={selectedMetaTags}
                onAddMetaTag={handleAddMetaTag}
              />
            )}

            {/* 標籤邏輯模式切換 */}
            {!editMode && (selectedTags.length > 0 || excludedTags.length > 0 || pendingTags.length > 0 || searchMode === 'tag') && (
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

          {/* 編輯模式提示 */}
          {editMode && (
            <EditTagsPanel
              selectedTagsToDelete={selectedTagsToDelete}
              onDeleteTags={handleDeleteSelectedTags}
              onCancelSelection={() => setSelectedTagsToDelete([])}
            />
          )}

          {/* 標籤列表 */}
          {searchMode === 'tag' && (
            <TagsList
              ref={tagListRef}
              isFullScreen={isFullScreen}
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
              onTagSelect={handleTagSelect}
              onTagExclude={handleTagExclude}
              onTagSelectionToggle={handleTagSelectionToggle}
              onSetEditingTag={setEditingTag}
              onEditValueChange={setEditValue}
              onTagRename={handleTagRename}
              isPos={isPos}
              isNeg={isNeg}
            />
          )}

          {/* 碎片搜尋模式的預留區域 */}
          {!editMode && searchMode === 'fragment' && (
            <div className="p-4 border border-dashed rounded bg-gray-50 text-center text-gray-500">
              <p>碎片搜尋功能開發中</p>
              <p className="text-xs mt-2">未來將支援標題、內容等進階篩選</p>
            </div>
          )}
        </>
      )}
    </div>
  )
})

TagsFloatingWindow.displayName = 'TagsFloatingWindow'

export default TagsFloatingWindow