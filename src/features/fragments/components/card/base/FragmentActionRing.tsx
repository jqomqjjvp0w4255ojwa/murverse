// 📄 src/features/fragments/components/card/base/FragmentActionRing.tsx

'use client'

import React, { useState } from 'react'
import { GridFragment } from '@/features/fragments/types/gridTypes'
import ActionRing from '@/shared/components/ActionRing'


interface FragmentActionRingProps {
  fragment: GridFragment
  position: { x: number; y: number }
  onClose: () => void
  onEdit: (fragment: GridFragment) => void
  onDelete: (fragment: GridFragment) => void
}

const FragmentActionRing: React.FC<FragmentActionRingProps> = ({
  fragment,
  position,
  onClose,
  onEdit,
  onDelete
}) => {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  
  // 處理編輯
  const handleEdit = () => {
    onEdit(fragment)
    onClose()
  }

  // 處理刪除請求
  const handleDeleteRequest = () => {
    setIsConfirmingDelete(true)
  }

  // 確認刪除
  const handleConfirmDelete = () => {
    onDelete(fragment)
    setIsConfirmingDelete(false)
    onClose()
  }

  // 取消刪除
  const handleCancelDelete = () => {
    setIsConfirmingDelete(false)
  }

  // 獲取碎片顯示標題 - 保持簡潔
  const getFragmentTitle = () => {
    const maxLength = 15 // 保持簡短，避免擋住按鈕
    const content = fragment.content || '無標題碎片'
    return content.length > maxLength 
      ? content.substring(0, maxLength) + '...' 
      : content
  }
  
  // 定義行動選項
  const options = [
    { 
      icon: '✏️', 
      label: '編輯', 
      action: handleEdit,
      isHighlighted: true
    },
    { 
      icon: '🗑️', 
      label: '刪除', 
      action: handleDeleteRequest,
      isHighlighted: false
    }
  ]

  // 確認對話框配置
  const confirmDialog = isConfirmingDelete ? {
    isOpen: true,
    title: '刪除碎片？',
    description: '此操作將永久刪除這個碎片及其所有內容。',
    onConfirm: handleConfirmDelete,
    onCancel: handleCancelDelete,
    confirmText: '確認刪除',
    cancelText: '取消',
    confirmColor: '#f44336'
  } : undefined

  return (
    <ActionRing
    
      title={getFragmentTitle()}
      position={position}
      options={options}
      onClose={onClose}
      confirmDialog={confirmDialog}
    />
  )
}

export default FragmentActionRing