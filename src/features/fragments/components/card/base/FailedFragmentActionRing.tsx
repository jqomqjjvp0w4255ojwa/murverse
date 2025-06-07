// 📄 FailedFragmentActionRing.tsx - 處理失敗狀態的行動環

'use client'

import React from 'react'
import { Fragment } from '@/features/fragments/types/fragment'
import ActionRing from '@/shared/components/ActionRing'

interface FailedFragmentActionRingProps {
  fragment: Fragment
  position: { x: number; y: number }
  onClose: () => void
  onRetry: (fragmentId: string) => void
  onAbandon: (fragmentId: string) => void
}

const FailedFragmentActionRing: React.FC<FailedFragmentActionRingProps> = ({
  fragment,
  position,
  onClose,
  onRetry,
  onAbandon
}) => {
  
  // 根據操作類型決定標題和選項
  const isCreateFailed = fragment._operationType === 'create'
  const isDeleteFailed = fragment._operationType === 'delete'
  
  const getTitle = () => {
    if (isCreateFailed) return '上傳失敗'
    if (isDeleteFailed) return '刪除失敗'
    return '操作失敗'
  }
  
  const getSubtitle = () => {
    return fragment._failureReason || '請選擇下一步操作'
  }

  // 處理重試
  const handleRetry = () => {
    onRetry(fragment.id)
    onClose()
  }

  // 處理放棄
  const handleAbandon = () => {
    onAbandon(fragment.id)
    onClose()
  }

  // 定義行動選項
  const options = [
    { 
      icon: '🔄', 
      label: isCreateFailed ? '重新上傳' : '重新刪除', 
      action: handleRetry,
      isHighlighted: true
    },
    { 
      icon: '❌', 
      label: isCreateFailed ? '放棄上傳' : '取消刪除', 
      action: handleAbandon,
      isHighlighted: false
    }
  ]

  return (
    <ActionRing
      title={getTitle()}
      subtitle={getSubtitle()}
      position={position}
      options={options}
      onClose={onClose}
    />
  )
}

export default FailedFragmentActionRing