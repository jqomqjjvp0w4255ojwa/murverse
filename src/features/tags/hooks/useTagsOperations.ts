// hooks/useTagsOperations.ts
'use client'

import { useCallback } from 'react'
import { useFragmentsStore } from '@/features/fragments/store/useFragmentsStore'
import { useGlobalTagsStore } from '@/features/tags/store/useGlobalTagsStore'
import { useSearchStore } from '@/features/search/useSearchStore'
import { isSystemTag } from '@/features/tags/constants/systemTags'
import { useSingleUserTagSync } from '@/shared/hook/useSingleUserTagSync'

export function useTagsOperations() {
  // Store hooks - 移除 save
  const { fragments, setFragments, selectedTags, setSelectedTags, excludedTags, setExcludedTags, tagLogicMode, getFilteredFragments } = useFragmentsStore()
  const { mode, pendingTags, addPendingTag, removePendingTag, setPendingTags } = useGlobalTagsStore()
  const { syncAddTag, syncRemoveTags } = useSingleUserTagSync()

  // 記錄標籤使用
  const recordTagUsage = useCallback((tagName: string) => {
    try {
      const storedTags = JSON.parse(localStorage.getItem('mur_recent_tags') || '[]')
      const updatedTags = [tagName, ...storedTags.filter((t: string) => t !== tagName)].slice(0, 50)
      localStorage.setItem('mur_recent_tags', JSON.stringify(updatedTags))
    } catch (e) {
      console.error('Error saving recent tags to localStorage', e)
    }
  }, [])

  // 選擇標籤
  const handleTagSelect = useCallback((tagName: string, editMode: boolean) => {
    if (mode === 'add' && isSystemTag(tagName)) return
    if (editMode) return

    recordTagUsage(tagName)

    if (mode === 'add') {
      pendingTags.includes(tagName) ? removePendingTag(tagName) : addPendingTag(tagName)
    } else {
      const newSelected = selectedTags.includes(tagName)
        ? selectedTags.filter((k: string) => k !== tagName)
        : [...selectedTags, tagName]
      const newExcluded = excludedTags.filter((k: string) => k !== tagName)

      setSelectedTags(newSelected)
      setExcludedTags(newExcluded)

      console.log('標籤選擇後執行篩選:', { newSelected, newExcluded })
    }
  }, [mode, pendingTags, removePendingTag, addPendingTag, selectedTags, setSelectedTags, excludedTags, setExcludedTags, tagLogicMode, fragments, recordTagUsage])

  // 排除標籤
  const handleTagExclude = useCallback((tagName: string, editMode: boolean) => {
    if (editMode || mode === 'add') return

    const newExcluded = excludedTags.includes(tagName)
      ? excludedTags.filter((k: string) => k !== tagName)
      : [...excludedTags, tagName]
    const newSelected = selectedTags.filter((k: string) => k !== tagName)

    setExcludedTags(newExcluded)
    setSelectedTags(newSelected)

    // 更新搜尋結果
    console.log('標籤排除後執行篩選:', { newSelected, newExcluded })
    }, [mode, excludedTags, selectedTags, setExcludedTags, setSelectedTags, tagLogicMode, fragments])

  // 重命名標籤
  const handleTagRename = useCallback((oldName: string, newName: string, allTags: any, setAllTags: any) => {
    newName = newName.trim()
    if (!newName || oldName === newName) return

    if (allTags.some((tag: any) => tag.name === newName && tag.name !== oldName)) {
      alert('標籤名稱已存在！')
      return
    }

    setAllTags(allTags.map((tag: any) => 
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

    if (!fragments) {
      console.warn('⚠️ fragments 為 null，無法重命名標籤')
      return
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
  }, [mode, pendingTags, setPendingTags, selectedTags, setSelectedTags, excludedTags, setExcludedTags, fragments, setFragments])

  // 刪除選中的標籤
  const handleDeleteSelectedTags = useCallback((selectedTagsToDelete: string[], allTags: any, setAllTags: any) => {
    if (!selectedTagsToDelete.length || !confirm(`確定要刪除這 ${selectedTagsToDelete.length} 個標籤嗎？此操作無法撤銷。`)) return
    
    syncRemoveTags(selectedTagsToDelete)

    setAllTags(allTags.filter((tag: any) => !selectedTagsToDelete.includes(tag.name)))
    
    const stored = JSON.parse(localStorage.getItem('mur_tags_global') || '[]') as string[]
    localStorage.setItem('mur_tags_global', JSON.stringify(
      stored.filter(t => !selectedTagsToDelete.includes(t))
    ))
    
    if (mode === 'add') {
      setPendingTags(pendingTags.filter((t: string) => !selectedTagsToDelete.includes(t)))
    } else {
      setSelectedTags(selectedTags.filter((t: string) => !selectedTagsToDelete.includes(t)))
      setExcludedTags(excludedTags.filter((t: string) => !selectedTagsToDelete.includes(t)))
    }

    if (!fragments) {
      console.warn('⚠️ fragments 為 null，無法刪除標籤')
      return
    }
      
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
  }, [mode, pendingTags, setPendingTags, selectedTags, setSelectedTags, excludedTags, setExcludedTags, fragments, setFragments, syncRemoveTags])

  // 狀態檢查函數
  const isPos = useCallback((tagName: string) => {
    return mode === 'add' ? pendingTags.includes(tagName) : selectedTags.includes(tagName)
  }, [mode, pendingTags, selectedTags])

  const isNeg = useCallback((tagName: string) => {
    return mode === 'add' ? false : excludedTags.includes(tagName)
  }, [mode, excludedTags])

  return {
    handleTagSelect,
    handleTagExclude,
    handleTagRename,
    handleDeleteSelectedTags,
    recordTagUsage,
    isPos,
    isNeg
  }
}