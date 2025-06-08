'use client'

import React, { useEffect, useRef } from 'react'
import { Fragment } from '@/features/fragments/types/fragment'
import { useTagCollectionStore } from '@/features/tags/store/useTagCollectionStore'
import { TagsService } from '@/features/tags/services/TagsService'
import { useFragmentsStore } from '@/features/fragments/store/useFragmentsStore' // 新增導入

interface TagDetailModalProps {
  tag: string
  relatedFragments: Fragment[]
  onClose: () => void
}

const TagDetailModal: React.FC<TagDetailModalProps> = ({
  tag,
  relatedFragments,
  onClose,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const { isCollected, addTag, removeTag } = useTagCollectionStore();
  const { fragments } = useFragmentsStore(); // 獲取 fragments
  const alreadyCollected = isCollected(tag);
  
  // 添加雙擊檢測變數
  const lastClickTimeRef = useRef<number>(0);
  const clickCountRef = useRef<number>(0);
  
  // 只保留 Escape 鍵的處理
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };


  // 尋找相似標籤 - 修正：傳入 fragments 和 tag 參數
  const similarTags = fragments 
  ? TagsService.findSimilarTagsByCooccurrence(tag, fragments, 5)
  : [];

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-[9999] p-4"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        overflowY: 'auto',
        userSelect: 'none',  // 防止文本選擇
        pointerEvents: 'auto', // 確保可以捕獲所有指針事件
        cursor: 'auto', // 確保顯示正常光標而不是拖曳手形
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation(); // 阻止事件冒泡

        // 雙擊檢測邏輯 - 修正為使用 ref 值
        const now = Date.now();
        if (now - lastClickTimeRef.current < 300) {
          clickCountRef.current += 1;
        } else {
          clickCountRef.current = 1;
        }
        lastClickTimeRef.current = now;

        if (clickCountRef.current >= 2) {
          onClose();
        }
      }}
      onMouseDown={(e) => {
        // 阻止任何鼠標按下事件觸發拖曳
        e.preventDefault();
        e.stopPropagation();
      }}
      onDragStart={(e) => {
        // 防止拖曳開始
        e.preventDefault();
        e.stopPropagation();
        return false;
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
        onClick={(e) => {
          e.stopPropagation(); 
        }}
      >
        {/* 標題列 */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 sticky top-0 bg-[#fffdf7] z-10">
          <h3
            className="text-xl font-semibold text-gray-800 flex items-center"
            style={{
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              maxWidth: '80%',
            }}
          >
            <span className="mr-2" style={{ color: '#8d6a38' }}>🏷️</span>
            {tag}
          </h3>
          <div className="flex items-center gap-3">
            <button
            //暫時移除取消收藏標籤功能
               //onClick={() => {
               //if (alreadyCollected) {
              //  removeTag(tag)
              //} else {
               //   addTag(tag)
               // }
              // }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded transition-colors
                ${alreadyCollected
                  ? 'text-amber-600' // 不加 hover 效果
                  : 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'}`}
              style={{
                fontSize: '0.875rem', // 請見第 2 題解說
              }}
            >
              <span>{alreadyCollected ? '⭐ 已擁有' : '☆ 收錄標籤'}</span>
            </button>
            <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation(); // 阻止事件冒泡
              onClose();
            }}
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
        </div>

        {/* 內容區域 */}
        <div
          className="p-6 space-y-6 overflow-y-auto"
          style={{
            flex: 1,
            minHeight: 0,
          }}
        >
          {/* 標籤統計 */}
          <div className="bg-amber-50 rounded-lg p-4 flex flex-wrap gap-4">
            <div className="flex flex-col items-center justify-center bg-white rounded-lg p-3 shadow-sm min-w-[100px]">
              <div className="text-2xl font-bold text-amber-700">{relatedFragments.length}</div>
              <div className="text-xs text-gray-500">相關碎片</div>
            </div>
            
            <div className="flex flex-col items-center justify-center bg-white rounded-lg p-3 shadow-sm min-w-[100px]">
              <div className="text-2xl font-bold text-amber-700">
                {similarTags.length > 0 ? similarTags.length : 0}
              </div>
              <div className="text-xs text-gray-500">相似標籤</div>
            </div>
            
            <div className="flex flex-col items-center justify-center bg-white rounded-lg p-3 shadow-sm min-w-[100px]">
              <div className="text-2xl font-bold text-amber-700">
                {relatedFragments.length > 0 
                  ? new Date(relatedFragments[0].updatedAt).toLocaleDateString('zh-TW') 
                  : '-'}
              </div>
              <div className="text-xs text-gray-500">最近使用</div>
            </div>
          </div>

          {/* 相似標籤 */}
          {similarTags.length > 0 && (
            <div className="mb-6">
              <h4 className="text-base font-medium text-gray-700 mb-2">相似標籤</h4>
              <div className="flex flex-wrap gap-2">
                {similarTags.map(tag => (
                  <div
                    key={tag.name}
                    className="px-3 py-1.5 text-sm bg-amber-50 text-amber-700 rounded-lg flex items-center gap-1"
                  >
                    <span>{tag.name}</span>
                    <span className="text-xs bg-amber-100 px-1.5 py-0.5 rounded-full text-amber-800">
                      {tag.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 相關碎片列表 */}
          <div>
            <h4 className="text-base font-medium text-gray-700 mb-2 flex items-center gap-2">
              <span>相關碎片</span>
              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">
                {relatedFragments.length}
              </span>
            </h4>
            
            {relatedFragments.length > 0 ? (
              <div className="space-y-3">
                {relatedFragments.map((fragment) => (
                  <div 
                    key={fragment.id} 
                    className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="font-medium text-gray-800 mb-1 line-clamp-1">
                      {fragment.content.split('\n')[0]}
                    </div>
                    <div className="text-sm text-gray-600 line-clamp-2">
                      {fragment.content}
                    </div>
                    <div className="mt-2 flex gap-1 flex-wrap">
                      {fragment.tags.filter(t => t !== tag).slice(0, 5).map(t => (
                        <span 
                          key={t} 
                          className="inline-block px-2 py-0.5 text-xs bg-amber-50 text-amber-700 rounded"
                        >
                          {t}
                        </span>
                      ))}
                      {fragment.tags.length > 6 && (
                        <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                          +{fragment.tags.length - 6}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      更新於: {formatDate(fragment.updatedAt)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 p-6 bg-gray-50 rounded-lg">
                沒有相關碎片
              </div>
            )}
          </div>
        </div>

        {/* 底部操作列 */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
          <div className="text-xs text-gray-500">
            
          </div>
        </div>
      </div>
    </div>
  )
}

export default TagDetailModal