'use client'

import { Fragment } from '@/features/fragments/types/fragment'
import { useEffect, useRef } from 'react'

interface FragmentDetailModalProps {
  fragment: Fragment | null
  onClose: () => void
}

export default function FragmentDetailModal({ fragment, onClose }: FragmentDetailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  // 點擊外部關閉
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [onClose])

  // ESC 鍵關閉
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  // 如果沒有碎片，不顯示彈窗
  if (!fragment) return null

  // 決定碎片方向
  const hasEnglish = /[a-zA-Z]/.test(fragment.content)
  const isOnlyCJK = /^[\u4e00-\u9fa5\u3040-\u30ff\s]+$/.test(fragment.content)
  const direction = (fragment.direction) || (
    hasEnglish || /\d/.test(fragment.content) || /[{}[\]()=;:]/.test(fragment.content)
      ? 'horizontal'
      : isOnlyCJK ? 'vertical' : 'horizontal'
  )

  // 格式化日期
  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-auto"
        style={{
          backgroundColor: '#fffbef',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          padding: '24px',
        }}
      >
        {/* 模態框頂部 */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-800">碎片詳情</h3>
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

        {/* 碎片內容 */}
        <div className="space-y-6">
          {/* 主內容 */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">主內容</h4>
            <div
              className="p-4 bg-white rounded border border-gray-100 shadow-sm"
              style={{
                writingMode: direction === 'vertical' ? 'vertical-rl' : 'horizontal-tb',
                height: direction === 'vertical' ? '300px' : 'auto',
                minHeight: '100px',
                overflowX: 'auto',
                fontSize: '16px',
                lineHeight: '1.6',
              }}
            >
              {fragment.content}
            </div>
          </div>

          {/* 筆記 */}
          {fragment.notes && fragment.notes.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">筆記</h4>
              <div className="space-y-3">
                {fragment.notes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3 bg-gray-50 rounded"
                    style={{
                      backgroundColor: '#f9f6e9',
                      writingMode: direction === 'vertical' ? 'vertical-rl' : 'horizontal-tb',
                      height: direction === 'vertical' ? '200px' : 'auto',
                      minHeight: direction === 'vertical' ? '200px' : '50px',
                      overflowX: 'auto',
                    }}
                  >
                    {note.value}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 標籤 */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">標籤</h4>
            <div className="flex flex-wrap gap-2">
              {fragment.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 text-sm rounded"
                  style={{
                    backgroundColor: '#f3e8c7',
                    color: '#8d6a38',
                    borderRadius: '16px',
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* 創建時間 */}
          <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
            <span className="text-xs text-gray-400">
              創建於 {formatDate(fragment.createdAt)}
            </span>
            <span className="text-xs text-gray-400">
              {fragment.updatedAt && fragment.updatedAt !== fragment.createdAt
                ? `更新於 ${formatDate(fragment.updatedAt)}`
                : ''}
            </span>
          </div>ㄇ
        </div>
      </div>
    </div>
  )
}