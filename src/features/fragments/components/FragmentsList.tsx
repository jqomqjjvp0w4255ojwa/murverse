/**
 * FragmentsList.tsx
 *
 * 📌 用途說明：
 * 顯示所有符合條件的碎片清單，支援拖曳排序、點擊選取與搜尋功能。
 *
 * 🧩 功能特色：
 * - 即時搜尋（Debounce 實作）
 * - 拖曳排序（整合 `@dnd-kit` 套件）
 * - 點擊碎片顯示詳細資料（與 FragmentDetailModal 聯動）
 * - 根據標籤篩選與搜尋關鍵字過濾清單
 *
 * ✅ 使用場景：
 * - `FragmentsView` 元件中當切換至「清單視圖」時載入
 */



'use client'

import { useEffect, useState, useCallback } from 'react'
import { useFragmentsStore } from '@/features/fragments/store/useFragmentsStore'
import { useTagsStore } from '@/features/tags/store/useTagsStore'
import { Fragment } from '@/features/fragments/types/fragment'
import debounce from 'lodash.debounce'
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function SortableItem({ fragment }: { fragment: Fragment }) {
  const { setSelectedFragment } = useFragmentsStore()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: fragment.id })

  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => setSelectedFragment(fragment)}
      className={`p-4 border rounded bg-white select-none ${
        isDragging ? 'cursor-grabbing' : 'hover:cursor-pointer'
      }`}
    >
      <div className="text-lg font-semibold">{fragment.content}</div>
      <div className="text-sm text-gray-500">
        標籤: {fragment.tags?.join(', ') || '無'}
      </div>
      <div className="text-sm text-gray-400">
        筆記數: {fragment.notes?.length || 0}
      </div>
      <div className="text-xs text-gray-400">
        建立時間: {new Date(fragment.createdAt).toLocaleString()}
      </div>
    </div>
  )
}

export default function FragmentsList() {
  const {
    fragments,
    load,
    save,
    setFragments,
    searchQuery,
    setSearchQuery,
  } = useFragmentsStore()

  const { selectedTags, excludedTags } = useTagsStore()
  const [items, setItems] = useState<string[]>([])

  useEffect(() => {
    load()
  }, [load])

  // Debounce 搜尋文字
  const debouncedSetSearch = useCallback(
    debounce((q: string) => setSearchQuery(q), 300),
    []
  )

  // 拖曳設定
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  const handleDragEnd = (event: any) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = items.indexOf(active.id)
      const newIndex = items.indexOf(over.id)
      const newItems = arrayMove(items, oldIndex, newIndex)
      setItems(newItems)

      const newFragments = fragments.map((f) => ({
        ...f,
        order: newItems.indexOf(f.id),
      }))
      setFragments(newFragments)
      save()
    }
  }

  // 計算顯示的碎片
  const visibleFragments = fragments
    .filter(f =>
      f.content.toLowerCase().includes(searchQuery.toLowerCase()) &&
      selectedTags.every(tag => f.tags.includes(tag)) &&
      excludedTags.every(tag => !f.tags.includes(tag))
    )
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">碎片清單（搜尋＋點擊＋拖曳排序）</h2>

      <div className="w-full mb-4">
        <input
          type="text"
          placeholder="搜尋碎片內容..."
          className="w-full p-2 border rounded"
          onChange={(e) => debouncedSetSearch(e.target.value)}
        />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={visibleFragments.map(f => f.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {visibleFragments.map((f) => (
              <SortableItem key={f.id} fragment={f} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
