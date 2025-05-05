/**
 * FragmentsView.tsx
 *
 * 📌 用途說明：
 * 提供一個按鈕控制介面，讓使用者在「清單視圖」與「表格視圖」之間切換碎片資料的呈現方式。
 *
 * 🧩 功能特色：
 * - 兩個切換按鈕：清單 / 表格
 * - 根據狀態顯示對應元件：FragmentsList 或 FragmentsTable
 *
 * ✅ 使用場景：
 * - 嵌入於主頁面（如 page.tsx）中切換碎片顯示模式
 */



'use client'

import { useState } from 'react'
import FragmentsList from './components/FragmentsList'
import FragmentsTable from './components/FragmentsTable'

export default function FragmentsView() {
  const [view, setView] = useState<'list' | 'table'>('list')

  return (
    <div className="p-4">
      <div className="mb-4 space-x-2">
        <button
          onClick={() => setView('list')}
          className={`btn ${view === 'list' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          列表視圖
        </button>
        <button
          onClick={() => setView('table')}
          className={`btn ${view === 'table' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          表格視圖
        </button>
      </div>

      {view === 'list' ? <FragmentsList /> : <FragmentsTable />}
    </div>
  )
}
