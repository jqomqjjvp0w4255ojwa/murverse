// src/app/page.tsx - 清理後版本
'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useFragmentsStore } from '@/features/fragments/store/useFragmentsStore'
import { Fragment } from '@/features/fragments/types/fragment'
import { useTagDragManager } from '@/features/fragments/layout/useTagDragManager'
import AuthButton from '@/features/fragments/components/AuthButton'

// 動態導入組件
const TagsFloatingWindow = dynamic(() =>
  import('@/features/tags/TagsDrawerWindow').then(mod => ({
    default: (mod as any).default
  })),
  { ssr: false }
)

const FloatingFragmentsField = dynamic(() => import('@/features/fragments/FloatingFragmentsField'), { ssr: false })
const FragmentDetailModal = dynamic(() => import('@/features/fragments/components/FragmentDetailModal'), { ssr: false })
const FloatingInputBar = dynamic(() => import('@/features/input/FloatingInputBar'), { ssr: false })
const FloatingActionButton = dynamic(() => import('@/features/fragments/components/FloatingActionButton'), { ssr: false })
const GroupFrame = dynamic(() => import('@/features/windows/GroupFrame'), { ssr: false })

// 標籤拖曳相關組件
const TagDragPreview = dynamic(() => import('@/features/fragments/components/TagDragPreview'), { ssr: false })
const DragToDeleteZone = dynamic(() => import('@/features/tags/components/DragToDeleteZone'), { ssr: false })

export default function Home() {
  // 檢查是否在客戶端
  const [isClient, setIsClient] = useState(false)
  const [fragment, setFragment] = useState<Fragment | null>(null)

  // 使用標籤拖曳管理器（只在客戶端）
  const { draggingTag, dragPosition, isDragging } = useTagDragManager()
  
  // 🔧 簡化：移除 mode 相關邏輯，因為現在只有 float 模式
  const { initialize } = useFragmentsStore()

  // 設定關閉函數
  const handleClose = () => {
    setFragment(null)
  }

  useEffect(() => {
    // 設定客戶端標記
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient) return

    // 🔧 簡化：只需要初始化，不需要手動 load
    initialize()
  }, [isClient, initialize])
  
  // 在服務器端渲染時返回一個基本的佔位符
  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }
  
  return (
    <>
      <AuthButton />
      

      {/* 🔧 簡化：只保留 float 模式 */}
      <FloatingFragmentsField />
      <FloatingInputBar />
      <TagsFloatingWindow />
      <GroupFrame />

      {/* 公用組件 */}
      <FragmentDetailModal fragment={fragment} onClose={() => setFragment(null)} />
      <FloatingActionButton />
      
      {/* 標籤拖曳預覽 - 在所有視圖模式下都顯示 */}
      {isDragging && draggingTag && dragPosition && (
        <TagDragPreview tag={draggingTag} position={dragPosition} />
      )}
      
      {/* 標籤刪除區域 - 只在拖曳標籤時顯示 */}
      <DragToDeleteZone position="bottom-right" />
      
      {/* 全局樣式 */}
      <style jsx global>{`
        /* 原有的拖曳目標高亮樣式 */
        .fragment-card.tag-drop-target {
          box-shadow: 0 0 0 2px rgba(201, 155, 53, 0.7) !important;
          transform: scale(1.02) !important;
          transition: all 0.2s ease !important;
        }
        
        /* 直排標籤文字修正 */
        .tag-button[style*="writing-mode: vertical-rl"] {
          white-space: normal !important;
          overflow: hidden !important;
          word-break: break-all !important;
          line-height: 1.2 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          text-align: center !important;
        }
        
        /* 移除 Tab 模式的左側 margin，讓內容區域佔滿整個螢幕 */
        .floating-fragments-container {
          margin-left: 0; /* 改為 0，移除左側空白區域 */
          transition: margin-left 0.3s ease;
        }
      `}</style>
    </>
  )
}