'use client'

/* 這是 Next.js 中的首頁頁面元件，包含以下內容：

使用 use client 指令來標示這是一個客戶端元件（React hooks 被使用）。

透過 next/dynamic 動態導入元件，以避免 SSR 問題。

根據 useFragmentsStore 的資料（狀態管理），顯示不同的 UI 模式（float 浮動模式 vs list 清單模式）。

匯入了數個客製元件（如 FloatingFragmentsField, FragmentsView 等），依不同狀態顯示。

包含一個 useEffect hook 來同步 mode 狀態、載入資料並訂閱變化。

這個檔案就是你專案的主畫面邏輯與元件組合點。
 */

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useFragmentsStore } from '@/features/fragments/store/useFragmentsStore'
import { Fragment } from '@/features/fragments/types/fragment'

// 由於這些組件可能依賴於客戶端的 API，使用動態導入以避免服務器端渲染問題
const FloatingFragmentsField = dynamic(() => import('@/features/fragments/FloatingFragmentsField'), { ssr: false })
const FragmentDetailModal = dynamic(() => import('@/features/fragments/components/FragmentDetailModal'), { ssr: false })
const FloatingInputBar = dynamic(() => import('@/features/input/FloatingInputBar'), { ssr: false })
const FloatingActionButton = dynamic(() => import('@/features/fragments/components/FloatingActionButton'), { ssr: false })
const TagsFloatingWindow = dynamic(() => import('@/features/tags/TagsFloatingWindow'), { ssr: false })
const GroupFrame = dynamic(() => import('@/features/windows/GroupFrame'), { ssr: false })
const FragmentsView = dynamic(() => import('@/features/fragments/FragmentsView'), { ssr: false })


export default function Home() {
  // 初始設定空字串或預設值，避免服務器端渲染時的不匹配
  const [currentMode, setCurrentMode] = useState('float')
  const [fragment, setFragment] = useState<Fragment | null>(null)  // 設定 fragment 狀態，初始為 null

  
  // 使用 store
  const { mode, load } = useFragmentsStore()

  // 設定關閉函數
  const handleClose = () => {
    setFragment(null)  // 關閉時清除 fragment
  }

  
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
      <FragmentDetailModal fragment={fragment} onClose={handleClose} />  {/* 傳遞 fragment 和 onClose */}
      <FloatingActionButton />
    </>
  )
}