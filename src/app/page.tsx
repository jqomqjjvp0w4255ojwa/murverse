'use client'
import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useFragmentsStore } from '@/stores/useFragmentsStore'

// 由於這些組件可能依賴於客戶端的 API，使用動態導入以避免服務器端渲染問題
const FloatingFragmentsField = dynamic(() => import('@/components/FloatingFragmentsField'), { ssr: false })
const FragmentDetailModal = dynamic(() => import('@/components/FragmentDetailModal'), { ssr: false })
const FloatingInputBar = dynamic(() => import('@/components/FloatingInputBar'), { ssr: false })
const FloatingActionButton = dynamic(() => import('@/components/FloatingActionButton'), { ssr: false })
const TagsFloatingWindow = dynamic(() => import('@/components/TagsFloatingWindow'), { ssr: false })
const GroupFrame = dynamic(() => import('@/components/GroupFrame'), { ssr: false })
const FragmentsView = dynamic(() => import('@/components/fragments/FragmentsView'), { ssr: false })

export default function Home() {
  // 初始設定空字串或預設值，避免服務器端渲染時的不匹配
  const [currentMode, setCurrentMode] = useState('float')
  
  // 使用 store
  const { mode, load } = useFragmentsStore()
  
  useEffect(() => {
    // 確保只在客戶端執行
    load()
    // 同步 mode 到本地狀態
    setCurrentMode(mode)
    
    // 訂閱 mode 變化（可選）
    const unsubscribe = useFragmentsStore.subscribe(
      state => setCurrentMode(state.mode)
    )
    
    return () => {
      // 清理訂閱（可選）
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [load, mode])
  
  // 在服務器端渲染時返回一個基本的佔位符
  if (typeof window === 'undefined') {
    return <div>Loading...</div>
  }
  
  return (
    <>
      {/* 背景漂浮場 - 使用本地狀態 */}
      {currentMode === 'float' && (
        <>
          <FloatingFragmentsField />
          <FloatingInputBar />
          <TagsFloatingWindow />
          <GroupFrame />
        </>
      )}

      {/* 清單模式 - 使用本地狀態 */}
      {currentMode === 'list' && (
        <FragmentsView />
      )}

      {/* 公用：詳情Modal、右下角切換按鈕 */}
      <FragmentDetailModal />
      <FloatingActionButton />
    </>
  )
}