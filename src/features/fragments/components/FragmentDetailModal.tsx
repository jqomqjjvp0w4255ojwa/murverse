'use client'

import { Fragment } from '@/features/fragments/types/fragment'
import { useEffect, useRef, useState } from 'react'

interface FragmentDetailModalProps {
  fragment: Fragment | null
  onClose: () => void
}

export default function FragmentDetailModal({ fragment, onClose }: FragmentDetailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [showAllTags, setShowAllTags] = useState(false)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    let lastClickTime = 0
    let clickCount = 0

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        const now = Date.now()
        if (now - lastClickTime < 300) {
          clickCount += 1
        } else {
          clickCount = 1
        }
        lastClickTime = now

        if (clickCount >= 2) {
          onClose()
        }
      }
    }

    document.addEventListener('keydown', handleEscape)
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  if (!fragment) return null

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
  }

  const tagsToShow = showAllTags ? fragment.tags : fragment.tags.slice(0, 5)
  const hasMoreTags = fragment.tags.length > 5

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-[9999] p-4"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        overflowY: 'auto',
      }}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-xl max-w-3xl w-full"
        style={{
          backgroundColor: '#fffdf7',
          border: '1px solid #e2e2e2',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '95vh',
          overflow: 'hidden',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
          position: 'relative',
          zIndex: 10000, // 確保在所有元素上方
        }}
      >
        {/* 標題列 */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 sticky top-0 bg-[#fffdf7] z-10">
          <h3
            className="text-xl font-semibold text-gray-800 truncate"
            style={{
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              maxWidth: '80%',
            }}
          >
            {fragment.content.split('\n')[0]}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 內容區域 */}
        <div
          className="p-6 space-y-6 overflow-y-auto"
          style={{
            flex: 1,
            minHeight: 0,
          }}
        >
          {/* 主內容 */}
          <div
            className="bg-white rounded border border-gray-100 shadow-sm"
            style={{
              padding: '16px',
              fontSize: '16px',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
              color: '#333',
            }}
          >
            {fragment.content}
          </div>

          {/* 標籤 */}
          {fragment.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tagsToShow.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 text-sm rounded transition-all duration-200"
                  style={{
                    backgroundColor: '#f9f1d8',
                    color: '#6b4f1d',
                    borderRadius: '16px',
                    maxWidth: '200px',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    display: 'inline-block',
                  }}
                >
                  #{tag}
                </span>
              ))}
              {hasMoreTags && (
                <button
                  onClick={() => setShowAllTags(!showAllTags)}
                  className="px-3 py-1 text-sm rounded"
                  style={{
                    backgroundColor: '#e0e0e0',
                    color: '#666',
                    borderRadius: '16px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {showAllTags ? '收起' : `+${fragment.tags.length - 5}`}
                </button>
              )}
            </div>
          )}

          {/* 筆記 */}
          {fragment.notes && fragment.notes.length > 0 && (
            <div className="space-y-4">
              {fragment.notes.map((note) => (
                <div key={note.id}>
                  {note.title && (
                    <h4 className="text-sm font-medium text-gray-500 mb-1">{note.title}</h4>
                  )}
                  <div
                    className="p-3 rounded"
                    style={{
                      backgroundColor: '#f9f6e9',
                      minHeight: '50px',
                      fontSize: '14px',
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap',
                      color: '#444',
                    }}
                  >
                    {note.value}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 時間資訊 */}
          <div className="pt-4 border-t border-gray-200 flex justify-between items-center text-xs text-gray-400">
            <span>創建於 {formatDate(fragment.createdAt)}</span>
            <span>
              {fragment.updatedAt && fragment.updatedAt !== fragment.createdAt
                ? `更新於 ${formatDate(fragment.updatedAt)}`
                : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}