// components/fragments/NoteItem.tsx
'use client'

import React, { useState, useRef, useEffect } from 'react';
import { Note } from '@/types/fragment';
import SlideToDeleteButton from './SlideToDeleteButton';

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

  useEffect(() => {
    if (isDeleteMode && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDeletePos({
        x: rect.left + rect.width / 2 - 75, // 150 寬的一半
        y: rect.top + rect.height / 2 - 16, // 約 h-8 的一半
      });
    }
  }, [isDeleteMode]);

  return (
    <>
      <div
        ref={containerRef}
        className={`relative flex items-start rounded-lg transition-all hover:bg-gray-50 ${
          isDragOver ? 'border-t-2 border-blue-400' : ''
        } ${isDragging ? 'opacity-50' : 'opacity-100'} mb-3 border border-gray-200 bg-white`}
        draggable={!isDeleteMode}
        onDragStart={(e) => !isDeleteMode && onDragStart(e, note.id)}
        onDragOver={(e) => !isDeleteMode && onDragOver(e, index)}
        onDrop={(e) => !isDeleteMode && onDrop(e, index)}
        onDragEnd={(e) => !isDeleteMode && onDragEnd(e)}
      >
        {/* 遮罩 */}
        {isDeleteMode && (
           <div className="absolute inset-0 z-40 rounded-lg backdrop-blur-sm bg-black/10 pointer-events-none" />
        )}

        {/* 拖曳手柄 */}
        <div
          className="cursor-move px-2 py-3 flex items-center text-gray-400 self-stretch z-20"
          onMouseDown={(e) => isDeleteMode && e.stopPropagation()}
        >
          ⋮⋮
        </div>

        {/* 筆記內容 */}
        <div className="flex-1 p-3 relative z-20">
          <div className="mb-2">
            <input
              type="text"
              value={note.title}
              disabled={isDeleteMode}
              onChange={(e) => onUpdateNote(note.id, 'title', e.target.value)}
              placeholder={`筆記小標${index + 1}`}
              className="w-full text-sm font-semibold text-gray-500 placeholder-gray-300 outline-none pb-1"
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
          />
        </div>

        {/* 刪除按鈕 */}
        {!isDeleteMode && (
          <div className="pt-3 pr-2 z-30">
            <button
              className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-md text-xs"
              onClick={() => setIsDeleteMode(true)}
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
