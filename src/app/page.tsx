'use client'
import { useEffect, useRef, useState } from 'react' //
import FloatingFragmentsField from '@/components/FloatingFragmentsField'
import FragmentDetailModal from '@/components/FragmentDetailModal'
import FloatingInputBar from '@/components/FloatingInputBar'
import FloatingActionButton from '@/components/FloatingActionButton'
import TagsFloatingWindow from '@/components/TagsFloatingWindow'
import { useFragmentsStore } from '@/stores/useFragmentsStore'
import GroupFrame from '@/components/GroupFrame'
import FragmentsView from '@/components/fragments/FragmentsView'

export default function Home() {
  const { mode, load } = useFragmentsStore() // mode: 'float' | 'list'
  

  useEffect(() => {
    load() // ✅ 頁面載入時自動從 localStorage 讀取碎片
  }, [load])

  
  return (
    <>
      {/* 背景漂浮場 */}
      {mode === 'float' && (
      <>
        <FloatingFragmentsField />
        <FloatingInputBar />
        <TagsFloatingWindow />
        <GroupFrame />
      </>
    )}

      {/* 清單模式 */}
      {mode === 'list' && (
         <FragmentsView />
      )}

      {/* 公用：詳情Modal、右下角切換按鈕 */}
      <FragmentDetailModal />
      <FloatingActionButton />
    </>
  )
}
