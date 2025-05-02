'use client'

import { Fragment, Note } from '@/types/fragment'
import { useFragmentsStore } from '@/stores/useFragmentsStore'
import { useEffect, useState } from 'react'


export default function FragmentDetailModal() {
  const { selectedFragment, setSelectedFragment } = useFragmentsStore()
  const [isEditMode, setIsEditMode] = useState(false)

  useEffect(() => {
    if (selectedFragment) {
      setIsEditMode(false)
    }
  }, [selectedFragment])
  console.log('目前 selectedFragment', selectedFragment)

  if (!selectedFragment) return null

  const handleClose = () => {
    setSelectedFragment(null)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-lg w-full max-w-xl relative transition-all duration-300 transform scale-95 hover:scale-100">
        {/* 關閉按鈕 */}
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-black"
          onClick={handleClose}
        >
          ✖️
        </button>

        {/* 內容區 */}
        {isEditMode ? (
          <div>
            <h2 className="text-xl font-bold mb-4">編輯模式</h2>
            <p className="text-gray-500">（這裡預留未來編輯功能）</p>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-bold mb-4">{selectedFragment.content}</h2>

            <div className="mb-4">
              <strong>標籤：</strong>
              <div className="flex flex-wrap gap-2 mt-1">
                {selectedFragment.tags.length > 0 ? (
                  selectedFragment.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-gray-200 rounded text-sm"
                    >
                      #{tag}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-400">（無標籤）</span>
                )}
              </div>
            </div>

            <div className="mb-4">
              <strong>筆記：</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                {selectedFragment.notes.length > 0 ? (
                  selectedFragment.notes.map((note: Note) => (
                    <li key={note.id}>
                      <strong>{note.title}：</strong> {note.value}
                    </li>
                  ))
                ) : (
                  <li className="text-gray-400">（無筆記）</li>
                )}
              </ul>
            </div>

            <div className="text-sm text-gray-500 mt-4 space-y-1">
              <div>建立於：{new Date(selectedFragment.createdAt).toLocaleString()}</div>
              <div>最後修改：{new Date(selectedFragment.updatedAt).toLocaleString()}</div>
            </div>

            <button
              className="mt-6 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={() => setIsEditMode(true)}
            >
              編輯
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
