'use client'
//C:\Users\user\murverse\src\features\tags\components\TagActionRing.tsx

import React, { useState, useEffect } from 'react'
import { useTagCollectionStore } from '@/features/tags/store/useTagCollectionStore'
import { useFragmentsStore } from '@/features/fragments/store/useFragmentsStore'
import { TagsService } from '@/features/tags/services/TagsService'
import ActionRing from '@/shared/components/ActionRing'

interface TagActionRingProps {
  tag: string
  position: { x: number; y: number }
  onClose: () => void
  onOpenDetail: (tag: string) => void
  onDeleteTag?: (tag: string) => void
  fragmentId?: string
}

const TagActionRing: React.FC<TagActionRingProps> = ({
  tag,
  position,
  onClose,
  onOpenDetail,
  onDeleteTag,
  fragmentId
}) => {
  const { isCollected, addTag, removeTag } = useTagCollectionStore()
  const { fragments } = useFragmentsStore()
  const alreadyCollected = isCollected(tag)
  const [isRemovingFromThisFragment, setIsRemovingFromThisFragment] = useState(false)
  
  // 計算此標籤在幾個片段中出現
  const fragmentsWithTag = fragments.filter(f => f.tags.includes(tag)).length

  // 處理標籤詳情打開
  const handleOpenDetail = () => {
    onOpenDetail(tag)
  }

  // 處理收錄/移除收錄
  const handleToggleCollection = () => {
    if (!alreadyCollected) {
      addTag(tag)
    } else {
      removeTag(tag)
    }
    onClose()
  }

  // 處理從當前碎片移除標籤
  const handleRemoveFromFragment = () => {
    if (fragmentId) {
      setIsRemovingFromThisFragment(true)
    } else {
      console.warn('無法移除：未提供碎片ID')
      onClose()
    }
  }

  // 確認從當前碎片移除標籤
  const handleConfirmRemoveFromFragment = async () => {
    if (!fragmentId) return
    
    const result = await TagsService.removeTagFromFragment(fragmentId, tag)
    console.log(`✂️ ${result.message || '已從當前碎片移除標籤'}`)
    setIsRemovingFromThisFragment(false)
    onClose()
  }

  // 取消移除操作
  const handleCancelRemove = () => {
    setIsRemovingFromThisFragment(false)
  }

  // 定義行動選項
  const options = [
    { 
      icon: '🔍', 
      label: '查看', 
      action: handleOpenDetail
    },
    { 
      icon: alreadyCollected ? '⭐' : '☆', 
      label: alreadyCollected ? '已擁有' : '收錄', 
      action: handleToggleCollection,
      isDisabled: false,
      isHighlighted: !alreadyCollected
    },
    { 
      icon: '✂️', 
      label: '移除', 
      action: handleRemoveFromFragment,
      isDisabled: !fragmentId,
      isHighlighted: false
    }
  ]

  // 確認對話框配置
  const confirmDialog = isRemovingFromThisFragment ? {
    isOpen: true,
    title: `移除標籤「${tag}」？`,
    description: '僅從當前碎片中移除此標籤。',
    onConfirm: handleConfirmRemoveFromFragment,
    onCancel: handleCancelRemove,
    confirmText: '確認移除',
    cancelText: '取消',
    confirmColor: '#f79d41'
  } : undefined

  // 如果未收藏，自動添加（單用戶模式下）
  useEffect(() => {
    if (!alreadyCollected) {
      console.log(`發現未收藏標籤: ${tag}，自動添加到收藏`)
      addTag(tag)
    }
  }, [tag, alreadyCollected, addTag])

  return (
    <ActionRing
      title={tag}
      subtitle={`(${fragmentsWithTag}個碎片)`}
      position={position}
      options={options}
      onClose={onClose}
      confirmDialog={confirmDialog}
    />
  )
}

export default TagActionRing