// components/fragments/NoteItem.tsx
/**
 * NoteItem.tsx
 *
 * 📌 用途說明：
 * 這是一個筆記輸入項元件，用於顯示並編輯單一筆記內容，支援拖曳排序與滑動刪除。
 * 搭配 NotesList 一起使用，通常出現在 FloatingInputBar 中。
 *
 * 🧩 功能特色：
 * - 輸入筆記標題與內容，並可即時更新
 * - 支援拖曳排序（含樣式變化、阻止冒泡）
 * - 支援刪除模式，開啟滑動確認刪除 UI（整合 SlideToDeleteButton）
 * - 可用於全螢幕與非全螢幕模式下（介面適應）
 *
 * ✅ 使用場景範例：
 * - FloatingInputBar 的筆記輸入區
 * - 任意需要可排序、可刪除的備註欄位清單
 */



'use client'

import React, { useState, useRef, useEffect } from 'react';
import { Note } from '@/features/fragments/types/fragment';
import SlideToDeleteButton from '../interaction/SlideToDeleteButton';

interface NoteItemProps {
  note: Note;
  index: number;
  onUpdateNote: (id: string, field: 'title' | 'value', value: string) => void;
  onDeleteNote: (id: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragEnd: (e: React.DragEvent) => void;
  isDragging: boolean;
  isDragOver: boolean;
  isFullScreen?: boolean;
}

const NoteItem: React.FC<NoteItemProps> = ({
  note,
  index,
  onUpdateNote,
  onDeleteNote,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging,
  isDragOver,
  isFullScreen = false
}) => {
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [deletePos, setDeletePos] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // 記錄拖曳開始時間，用於識別是否是長時間的拖曳操作
  const dragStartTime = useRef<number | null>(null);

  useEffect(() => {
    if (isDeleteMode && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDeletePos({
        x: rect.left + rect.width / 2 - 75, // 150 寬的一半
        y: rect.top + rect.height / 2 - 16, // 約 h-8 的一半
      });
    }
  }, [isDeleteMode]);

  // 當組件卸載時，確保不會留下未完成的拖曳狀態
  useEffect(() => {
    return () => {
      if (isDragging) {
        // 強制觸發拖曳結束事件
        window.dispatchEvent(new MouseEvent('mouseup', {
          bubbles: true,
          cancelable: true,
          view: window
        }));
      }
    };
  }, [isDragging]);

  // 處理拖曳開始
  const handleDragStart = (e: React.DragEvent) => {
    // 確保事件冒泡被阻止
    e.stopPropagation();
    
    if (!isDeleteMode) {
      dragStartTime.current = Date.now();
      onDragStart(e, note.id);
    } else {
      // 如果處於刪除模式，則阻止拖曳
      e.preventDefault();
    }
  };

  // 處理拖曳經過
  const handleDragOver = (e: React.DragEvent) => {
    // 確保事件冒泡被阻止
    e.stopPropagation();
    
    if (!isDeleteMode) {
      onDragOver(e, index);
    }
  };

  // 處理放置
  const handleDrop = (e: React.DragEvent) => {
    // 確保事件冒泡被阻止
    e.stopPropagation();
    
    if (!isDeleteMode) {
      onDrop(e, index);
      
      // 重置拖曳開始時間
      dragStartTime.current = null;
    }
  };

  // 處理拖曳結束
  const handleDragEnd = (e: React.DragEvent) => {
    // 確保事件冒泡被阻止
    e.stopPropagation();
    
    if (!isDeleteMode) {
      onDragEnd(e);
      
      // 重置拖曳開始時間
      dragStartTime.current = null;
      
      // 確保窗口拖曳狀態被重置
      setTimeout(() => {
        window.dispatchEvent(new MouseEvent('mouseup', {
          bubbles: true,
          cancelable: true,
          view: window
        }));
      }, 0);
    }
  };

  return (
    <>
      <div
        ref={containerRef}
        className={`relative flex items-start rounded-lg transition-all hover:bg-gray-50 ${
          isDragOver ? 'border-t-2 border-blue-400' : ''
        } ${isDragging ? 'opacity-50' : 'opacity-100'} mb-3 border border-gray-200 bg-white`}
        draggable={!isDeleteMode}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
        // 加入滑鼠事件處理
        onMouseDown={(e) => {
          // 阻止冒泡，防止觸發窗口拖曳
          e.stopPropagation();
        }}
        onMouseUp={(e) => {
          // 阻止冒泡
          e.stopPropagation();
        }}
      >
        {/* 遮罩 */}
        {isDeleteMode && (
           <div className="absolute inset-0 z-40 rounded-lg backdrop-blur-sm bg-black/10 pointer-events-none" />
        )}

        {/* 拖曳手柄 */}
        <div
          className="cursor-move px-2 py-3 flex items-center text-gray-400 self-stretch z-20"
          onMouseDown={(e) => {
            // 阻止冒泡，防止觸發窗口拖曳
            e.stopPropagation();
            if (isDeleteMode) {
              e.preventDefault();
            }
          }}
        >
          ⋮⋮
        </div>

        {/* 筆記內容 */}
        <div 
          className="flex-1 p-3 relative z-20"
          onMouseDown={(e) => {
            // 阻止冒泡，防止觸發窗口拖曳
            e.stopPropagation();
          }}
        >
          <div className="mb-2">
            <input
              type="text"
              value={note.title}
              disabled={isDeleteMode}
              onChange={(e) => onUpdateNote(note.id, 'title', e.target.value)}
              placeholder={`筆記小標${index + 1}`}
              className="w-full text-sm font-semibold text-gray-500 placeholder-gray-300 outline-none pb-1"
              // 阻止輸入框的滑鼠事件冒泡
              onMouseDown={(e) => e.stopPropagation()}
            />
          </div>
          <textarea
            value={note.value}
            disabled={isDeleteMode}
            onChange={(e) => {
              onUpdateNote(note.id, 'value', e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            placeholder="筆記內容..."
            className="w-full text-sm resize-none overflow-hidden outline-none placeholder-gray-400"
            rows={isFullScreen ? 4 : 1}
            // 阻止文本區域的滑鼠事件冒泡
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>

        {/* 刪除按鈕 */}
        {!isDeleteMode && (
          <div 
            className="pt-3 pr-2 z-30"
            // 阻止刪除按鈕的滑鼠事件冒泡
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-md text-xs"
              onClick={(e) => {
                // 阻止冒泡
                e.stopPropagation();
                setIsDeleteMode(true);
              }}
            >
              －
            </button>
          </div>
        )}
      </div>

      {/* Portal 渲染滑桿 */}
      {isDeleteMode && deletePos && (
        <SlideToDeleteButton
          position={deletePos}
          onConfirm={() => {
            onDeleteNote(note.id);
            setIsDeleteMode(false);
          }}
          onCancel={() => setIsDeleteMode(false)}
          trackWidth={150}
          confirmText="→ 滑動刪除"
        />
      )}
    </>
  );
};

export default NoteItem;