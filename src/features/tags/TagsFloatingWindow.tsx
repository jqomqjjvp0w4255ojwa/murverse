// components/TagsFloatingWindow.tsx
/**
 * 📌 功能：顯示並操作所有標籤的浮動視窗。
 *
 * 🧩 重點功能：
 * - 標籤篩選與邏輯操作：支援 AND/OR 模式篩選。
 * - 搜尋與排序：支援依名稱、次數、使用頻率等排序與搜尋。
 * - 新增、重命名、刪除標籤：完整的標籤管理功能。
 * - 支援標籤選擇模式：
 *   - search：只查看篩選結果
 *   - add：為新的 fragment 加上標籤（與 FloatingInputBar 聯動）
 * - 進階搜尋面板（AdvancedSearchPanel）：在 searchMode === 'fragment' 時出現，處理碎片的條件搜尋。
 * - 支援視窗群組與防重疊佈局（來自 useGroupsStore()）
 */

'use client'

import { useState, useEffect, useRef, forwardRef } from 'react'
import { useFragmentsStore } from '@/features/fragments/store/useFragmentsStore'
import { useTagsStore } from '@/features/tags/store/useTagsStore'
import { useFloatingWindow } from '@/features/windows/useFloatingWindow'
import { useGroupsStore } from '@/features/windows/useGroupsStore'
import TagsHeader from './components/TagsHeader'
import TagsSearchBar from './components/TagsSearchBar'
import MetaTagsSelector from './components/MetaTagsSelector'
import TagLogicToggle from './components/TagLogicToggle'
import EditTagsPanel from './components/EditTagsPanel'
import TagsList from './components/TagsList'
import React from 'react'
// 引入進階搜尋面板
import AdvancedSearchPanel from '../search/AdvancedSearchPanel'
// 引入特殊標籤服務和常量
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
import { useGlobalTagsStore } from '@/features/tags/store/useGlobalTagsStore'


//import MyTagsPanel from './MyTagsPanel'



// 定義 TagInfo 類型
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
    setMode,
    setConnected,
    setSearchMode: tagsStoreSetSearchMode  // 為了避免命名衝突，重命名這個函數
  } = useTagsStore()

  const executeFragmentSearch = (searchText = search) => {
    const trimmed = searchText.trim()
  
    // ✅ 沒輸入就還原所有碎片
    if (!trimmed) {
      console.log("🔁 沒有輸入關鍵字，顯示全部碎片")
      setFilteredFragments(fragments)
      const ss = useSearchStore.getState()
      ss.setKeyword('')        // 清空關鍵字
      ss.setSearchResults([])  // 清空結果
      return
    }
  
    console.log(`執行碎片搜尋: "${trimmed}"`)
    setSearchExecuted(true)
  
    const searchStoreInstance = useSearchStore.getState()
    const currentScopes = searchStoreInstance.scopes || [searchMode]
  
    // ✅ 更新 searchStore 狀態（會被 executeSearch 用到）
    searchStoreInstance.setScopes(currentScopes)
    searchStoreInstance.setKeyword(trimmed)
    searchStoreInstance.setMatchMode('substring')
    searchStoreInstance.setTimeRange(searchStoreInstance.timeRange)
    searchStoreInstance.setSelectedTags(searchStoreInstance.selectedTags || [])
    searchStoreInstance.setExcludedTags(searchStoreInstance.excludedTags || [])
    searchStoreInstance.setTagLogicMode(searchStoreInstance.tagLogicMode || 'AND')
  
    // ✅ 統一交給 searchStore 處理查詢邏輯 + 回寫 searchResults
    const filtered = searchStoreInstance.executeSearch(fragments)
  
    // ✅ 給本地 UI 的顯示資料
    setFilteredFragments(filtered)
    setNoResults(filtered.length === 0)
    setSearchedKeyword(trimmed)
  
    if (handleAdvancedSearch) {
      handleAdvancedSearch(filtered)
    }
  }
  
  const resetNoResults = () => {
    setNoResults(false);
    setSearchedKeyword('');
  };

  const {
    customDateRange
  } = useAdvancedSearch();
  

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
    handleMouseDown, 
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
  const [showLine, setShowLine] = useState(false)
  const [recentlyUsedTags, setRecentlyUsedTags] = useState<string[]>([])
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [showSpecialTags, setShowSpecialTags] = useState(false)
  // 使用從常量導入的特殊標籤
  const [metaTags] = useState<MetaTag[]>(DEFAULT_META_TAGS)
  const [selectedMetaTags, setSelectedMetaTags] = useState<MetaTag[]>([])
  const [visibleStartIndex, setVisibleStartIndex] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  const tagListRef = useRef<HTMLDivElement>(null)
  const [editMode, setEditMode] = useState(false)
  const [selectedTagsToDelete, setSelectedTagsToDelete] = useState<string[]>([])
  const [editingTag, setEditingTag] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const hasRegistered = useRef(false)
  const { addWindow, updateWindow, checkAndResolveOverlaps } = useGroupsStore()
  const [searchExecuted, setSearchExecuted] = useState(false)
  const [noResults, setNoResults] = useState(false)
  const [searchedKeyword, setSearchedKeyword] = useState('')
  const { isDragging, draggingTag, isOverTagWindow } = useTagDragManager()
  const { isCollected, addTag } = useTagCollectionStore()
  const [dropFeedback, setDropFeedback] = useState<{ visible: boolean, message: string, success: boolean }>({
    visible: false,
    message: '',
    success: false
  })
  const { syncAddTag, syncRemoveTags } = useSingleUserTagSync()
  const { collectedTags } = useTagCollectionStore()
  const [tagViewMode, setTagViewMode] = useState<'personal' | 'global'>('personal')
  const { isMultiUserMode, globalTags: realGlobalTags, loadGlobalTags } = useGlobalTagsStore()
  
  
  // 新增：過濾後的碎片狀態
  const [filteredFragments, setFilteredFragments] = useState<any[]>(fragments)
  
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

 // 處理搜尋模式變更
 const handleSearchModeChange = (newMode: 'tag' | 'fragment', isAddMode: boolean) => {
  console.log(`搜尋模式變更: ${newMode}, 是否為添加模式: ${isAddMode}`);
  
  // 更新 searchStore 中的搜索模式
  useSearchStore.getState().setSearchMode(newMode);

  const ss = useSearchStore.getState();
  ss.setKeyword('');
  ss.setSelectedTags([]);
  ss.setExcludedTags([]);
  ss.setSearchResults([]);

  setSearch(''); // ✅ 清空本地搜尋文字，更新 TagsSearchBar 的輸入框！

  // 如果是從標籤模式切換到碎片模式，且正在連線中，要斷線
  if (newMode === 'fragment' && isAddMode) {
    console.log('執行顯式斷線操作');
    setMode('search');
    setShowLine(false);
    setConnected(false);
  }
};

  // 同步本地 searchMode 狀態到全局 store
  const handleSetSearchMode = (mode: 'tag' | 'fragment') => {
    setSearchMode(mode);
    tagsStoreSetSearchMode(mode);
    useSearchStore.getState().setSearchMode(mode);
  
    if (mode === 'fragment') {
      // ✅ 切回 fragment 搜索時，清掉「沒有結果」提示狀態
      setNoResults(false);
      setSearchedKeyword('');
    }
  };
  

  // 初始化標籤列表
  useEffect(() => {
    const map = new Map<string, number>()
    fragments.forEach((f: any) => f.tags.forEach((t: string) => map.set(t, (map.get(t) || 0) + 1)))
    const extra = JSON.parse(localStorage.getItem('mur_tags_global') || '[]') as string[]
    extra.forEach(t => map.set(t, map.get(t) || 0))
    setAllTags([...map.entries()].map(([name, count]) => ({ name, count })))
    
    // 初始化時設置過濾碎片為全部碎片
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
      const W = 320, H = 200, gap = 12
      let x = externalTagSelectorPosition.x + gap
      let y = externalTagSelectorPosition.y + gap
      if (typeof window !== 'undefined') {
        if (x + W > window.innerWidth) x = externalTagSelectorPosition.x - W - gap
        if (y + H > window.innerHeight) y = window.innerHeight - H - 20
      }
      
      setPos({ x, y })
      setMode('add')
      // 強制將搜尋模式設為標籤模式
      handleSetSearchMode('tag')
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

  useEffect(() => {
    if (mode === 'add' && searchMode !== 'tag') {
      console.log('強制將搜尋模式設為標籤模式');
      handleSetSearchMode('tag');
    }
  }, [mode, searchMode]);

 


  useEffect(() => {
    if (searchMode === 'fragment' && !searchExecuted) {
      const fragments = useFragmentsStore.getState().fragments
      const searchStore = useSearchStore.getState()
      searchStore.executeSearch(fragments)
      console.log('🔍 初始執行搜尋以填充 searchResults')
      setSearchExecuted(true)
    }
  }, [searchMode, searchExecuted])

  

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

  // 修改：添加特殊標籤，使用 MetaTagsService
  const handleAddMetaTag = (tag: MetaTag) => {
    setSelectedMetaTags(prev => {
      if (prev.some(t => t.id === tag.id)) {
        return prev.filter(t => t.id !== tag.id)
      }
      return [...prev, tag]
    })
    
    // 使用 MetaTagsService 過濾碎片
    const filtered = MetaTagsService.filterFragmentsByMetaTag(fragments, tag.id);
    console.log(`添加特殊標籤: ${tag.name}，找到 ${filtered.length} 個相關碎片`);
    
    // 取消顯示特殊標籤選項
    setShowSpecialTags(false)
  }
  
  // 移除特殊標籤
  const handleRemoveMetaTag = (tagId: string) => {
    setSelectedMetaTags(prev => prev.filter(tag => tag.id !== tagId))
  }


  const handleAdvancedSearch = (results: any) => {
    console.log('搜尋結果：', results)
    setFilteredFragments(results)
    // ❌ 不要再寫入 keyword，這裡什麼都不用做
  }
  // 選擇標籤
  const handleTagSelect = (t: string) => {

    if (mode === 'add' && isSystemTag(t)) return
    
    if (editMode) return
  
    recordTagUsage(t)
  
    if (mode === 'add') {
      pendingTags.includes(t) ? removePendingTag(t) : addPendingTag(t)
    } else {
      const newSelected = selectedTags.includes(t)
        ? selectedTags.filter((k: string) => k !== t)
        : [...selectedTags, t]
      const newExcluded = excludedTags.filter((k: string) => k !== t)
  
      setSelectedTags(newSelected)
      setExcludedTags(newExcluded)
  
      // 🔍 在這裡加入搜尋呼叫
      const ss = useSearchStore.getState()
      ss.setSelectedTags(newSelected)
      ss.setExcludedTags(newExcluded)
      ss.setTagLogicMode(tagLogicMode)
      ss.setKeyword('')
      ss.setScopes(['fragment'])
      const results = ss.executeSearch(fragments)
      setFilteredFragments(results)
    }
  }

  // 排除標籤
  const handleTagExclude = (t: string) => {
    if (editMode || mode === 'add') return
  
    const newExcluded = excludedTags.includes(t)
      ? excludedTags.filter((k: string) => k !== t)
      : [...excludedTags, t]
    const newSelected = selectedTags.filter((k: string) => k !== t)
  
    setExcludedTags(newExcluded)
    setSelectedTags(newSelected)
  
    // 🔍 在這裡加入搜尋呼叫
    const ss = useSearchStore.getState()
    ss.setSelectedTags(newSelected)
    ss.setExcludedTags(newExcluded)
    ss.setTagLogicMode(tagLogicMode)
    ss.setKeyword('')
    ss.setScopes(['fragment'])
    const results = ss.executeSearch(fragments)
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
        setPendingTags(pendingTags.map((t: string) => t === oldName ? newName : t))
      }
    } else {
      if (selectedTags.includes(oldName)) {
        setSelectedTags(selectedTags.map((t: string) => t === oldName ? newName : t))
      }
      if (excludedTags.includes(oldName)) {
        setExcludedTags(excludedTags.map((t: string) => t === oldName ? newName : t))
      }
    }

    const updatedFragments = fragments.map((fragment: any) => {
      if (fragment.tags.includes(oldName)) {
        return {
          ...fragment,
          tags: fragment.tags.map((t: string) => t === oldName ? newName : t),
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
  if (!selectedTagsToDelete.length || !confirm(`確定要刪除這 ${selectedTagsToDelete.length} 個標籤嗎？此操作無法撤銷。`)) return
     syncRemoveTags(selectedTagsToDelete)

    // 從 allTags 中移除
    setAllTags(allTags.filter(tag => !selectedTagsToDelete.includes(tag.name)))
    
    // 從本地存儲中移除
   const stored = JSON.parse(localStorage.getItem('mur_tags_global') || '[]') as string[]
    localStorage.setItem('mur_tags_global', JSON.stringify(
      stored.filter(t => !selectedTagsToDelete.includes(t))
    ))
    
    // 從 pendingTags 和 selectedTags、excludedTags 中移除
      if (mode === 'add') {
      setPendingTags(pendingTags.filter((t: string) => !selectedTagsToDelete.includes(t)))
    } else {
      setSelectedTags(selectedTags.filter((t: string) => !selectedTagsToDelete.includes(t)))
      setExcludedTags(excludedTags.filter((t: string) => !selectedTagsToDelete.includes(t)))
    }
      
    // 從所有碎片中移除這些標籤
      const updatedFragments = fragments.map((fragment: any) => {
      if (fragment.tags.some((t: string) => selectedTagsToDelete.includes(t))) {
        return {
          ...fragment,
          tags: fragment.tags.filter((t: string) => !selectedTagsToDelete.includes(t)),
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
          //} else if (token.type === 'prefix') {
            //return tag.startsWith(val)
          } else if (token.type === 'wildcard') {
            // 這裡可進一步改為正則處理 *
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


  // 獲取標籤狀態
  const isPos = (t: string) => mode === 'add' ? pendingTags.includes(t) : selectedTags.includes(t)
  const isNeg = (t: string) => mode === 'add' ? false : excludedTags.includes(t)


    // 初始化 searchStore
    useEffect(() => {
      // 同步初始狀態到 searchStore
      const searchStoreInstance = useSearchStore.getState()
      searchStoreInstance.setSearchMode(searchMode)
      
      // 監聽 searchStore 的變化
      const unsubscribe = useSearchStore.subscribe((state) => {
        // 當搜索結果變化且非空時更新本地狀態
        if (state.searchResults && state.searchResults.length > 0) {
          setFilteredFragments(state.searchResults)
        }
      })
      
      // 清理函數
      return () => {
        unsubscribe()
      }
    }, [])

    // 處理標籤拖放到窗口
    useEffect(() => {
      if (!isDragging || !draggingTag) return

      const handleDragEnd = (e: MouseEvent) => {
        if (isOverTagWindow && draggingTag) {
          const alreadyExists = isCollected(draggingTag)
          
          if (!alreadyExists) {
            // 添加標籤到收藏
            addTag(draggingTag)
            
            // 顯示反饋訊息
            setDropFeedback({
              visible: true,
              message: `已將「${draggingTag}」加入收藏`,
              success: true
            })
          } else {
            // 標籤已存在
            setDropFeedback({
              visible: true,
              message: `「${draggingTag}」已在收藏中`,
              success: false
            })
          }
          
          // 3秒後隱藏反饋
          setTimeout(() => {
            setDropFeedback(prev => ({ ...prev, visible: false }))
          }, 3000)
        }
      }
      
      window.addEventListener('mouseup', handleDragEnd)
      return () => window.removeEventListener('mouseup', handleDragEnd)
    }, [isDragging, draggingTag, isOverTagWindow, isCollected, addTag])

    // 載入真正的全局標籤
    useEffect(() => {
      loadGlobalTags()
    }, [loadGlobalTags])


    return (
      <>
      {/* 標籤拖放接收區域 - 只在拖曳標籤時顯示 */}
      {isDragging && draggingTag && (
        <div
          className="tag-floating-window-drop-zone"
          style={{
            position: 'absolute',
            inset: '0', // 與窗口大小一致
            borderRadius: 'inherit',
            border: '2px dashed rgba(160, 120, 80, 0.5)',
            backgroundColor: isOverTagWindow 
              ? (isCollected(draggingTag) ? 'rgba(255, 200, 120, 0.2)' : 'rgba(100, 255, 150, 0.2)') 
              : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2200,
            pointerEvents: 'none', // 不捕獲鼠標事件，允許下方內容接收鼠標事件
            backdropFilter: isOverTagWindow ? 'blur(2px)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          {isOverTagWindow && (
            <div 
              style={{
                backgroundColor: isCollected(draggingTag) ? '#f8d58c' : '#a0d9a0',
                color: isCollected(draggingTag) ? '#8d6a38' : '#2e6b2e',
                padding: '8px 16px',
                borderRadius: '20px',
                fontWeight: 'bold',
                boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
                animation: 'pulse 1.5s infinite',
              }}
            >
              {isCollected(draggingTag) ? '此標籤已在您的收藏中' : '拖放以加入您的標籤庫'}
            </div>
          )}
        </div>
      )}

      {/* 拖放操作反饋訊息 */}
      {dropFeedback.visible && (
        <div 
          style={{
            position: 'absolute',
            top: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: dropFeedback.success ? 'rgba(60, 179, 113, 0.9)' : 'rgba(255, 165, 0, 0.9)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '20px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
            fontSize: '14px',
            zIndex: 2300,
            animation: 'fadeInOut 3s ease-in-out',
          }}
        >
          {dropFeedback.message}
        </div>
      )}


        {/* 🪟 標籤浮動視窗本體 */}
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
            // 📦 收合狀態視圖
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
              {/* 🧩 標籤面板標頭區塊 */}
              <TagsHeader
                mode={mode}
                editMode={editMode}
                onEditModeToggle={() => setEditMode(!editMode)}
                onlyShowSel={onlyShowSel}
                onFilterToggle={() => setOnlyShowSel(!onlyShowSel)}
                isFullScreen={isFullScreen}
                onCollapseClick={handleCollapseClick}
                onToggleFullScreen={toggleFullScreen}
                hideEditButton={searchMode === 'fragment'}
                hideFilterButton={searchMode === 'fragment'}
              />

               <>
                {/*  視圖切換按鈕 
                  <div className="flex items-center gap-2 mb-2" style={{ display: isMultiUserMode ? 'flex' : 'none' }}>
                    <button
                      onClick={() => setTagViewMode('personal')}
                      className={`px-2 py-1 rounded text-xs ${
                        tagViewMode === 'personal' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      個人標籤
                    </button>
                    <button
                      onClick={() => setTagViewMode('global')}
                      className={`px-2 py-1 rounded text-xs ${
                        tagViewMode === 'global' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      全域標籤
                    </button>
                  </div>

                  //全域標籤視圖提示 
                  {tagViewMode === 'global' && (
                    <div className="bg-yellow-50 text-amber-700 px-3 py-2 text-xs rounded-md mb-4">
                      <p>您正在查看<strong>全域標籤庫</strong>，這裡顯示所有用戶共享的標籤。</p>
                      {useGlobalTagsStore.getState().canModifyGlobalTags() ? (
                        <p>您可以添加新的全域標籤，但不能刪除現有標籤。</p>
                      ) : (
                        <p>您只能查看，無法添加或修改全域標籤。</p>
                      )}
                    </div>
                  )}*/}
              </>

              {/* 🔍 搜尋與過濾區域 */}
              <div className="mb-4">
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
                  onDeleteTags={handleDeleteSelectedTags}
                  onCancelSelection={() => setSelectedTagsToDelete([])}
                />
              )}

              {/* 📋 標籤清單（標籤模式下顯示） */}
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

              {/* 🔍 進階搜尋面板（碎片搜尋時） */}
              {!editMode && searchMode === 'fragment' && (
                <AdvancedSearchPanel
                  onSearch={handleAdvancedSearch}
                  noResults={noResults}
                  searchedKeyword={searchedKeyword}
                  onResetNoResults={resetNoResults}
                  onClearLocalSearch={() => setSearch('')}
                />
              )}
            </>
          )}
        </div>

        {/* 🪄 拖曳時的標籤丟放區（浮在畫面最下方） */}
        {searchMode === 'tag' && !editMode && isDragging && draggingTag && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[9999]">
            <TagDropZone />
          </div>
        )}
      </>
    )
 })

 export default TagsFloatingWindow