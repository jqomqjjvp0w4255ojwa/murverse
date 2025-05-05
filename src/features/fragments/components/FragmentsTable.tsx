/**
 * FragmentsTable.tsx
 *
 * 📌 用途說明：
 * 顯示所有符合搜尋與標籤篩選條件的碎片資料，以表格形式呈現。
 *
 * 🧩 功能特色：
 * - 根據關鍵字與標籤（selected/excluded）動態過濾碎片
 * - 顯示內容、標籤、筆記數與建立時間
 * - 以 `<table>` 呈現清晰可讀的靜態清單
 *
 * ✅ 使用場景：
 * - `FragmentsView` 元件中當切換至「表格視圖」時載入
 */




'use client'

import { useFragmentsStore } from '@/features/fragments/store/useFragmentsStore'
import { useTagsStore } from '@/features/tags/store/useTagsStore'

export default function FragmentsTable() {
  const { fragments, searchQuery } = useFragmentsStore()
  const { selectedTags, excludedTags } = useTagsStore()

  // 應用搜尋與標籤篩選
  const visibleFragments = fragments.filter(f =>
    f.content.toLowerCase().includes(searchQuery.toLowerCase()) &&
    selectedTags.every(tag => f.tags.includes(tag)) &&
    excludedTags.every(tag => !f.tags.includes(tag))
  )

  return (
    <div className="p-8 space-y-4">
      <h2 className="text-2xl font-bold">碎片清單</h2>

      <div className="overflow-x-auto">
        <table className="table-auto w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="px-4 py-2 border">內容</th>
              <th className="px-4 py-2 border">標籤</th>
              <th className="px-4 py-2 border">筆記數量</th>
              <th className="px-4 py-2 border">建立時間</th>
            </tr>
          </thead>
          <tbody>
            {visibleFragments.map((fragment) => (
              <tr key={fragment.id}>
                <td className="px-4 py-2 border">{fragment.content}</td>
                <td className="px-4 py-2 border">{fragment.tags.join(', ')}</td>
                <td className="px-4 py-2 border">{fragment.notes?.length || 0}</td>
                <td className="px-4 py-2 border">
                  {new Date(fragment.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
