// components/fragments/NotesList.tsx
/**
 * NotesList.tsx
 *
 * 📌 用途說明：
 * 這是一個筆記項目清單元件，用於顯示多筆筆記（NoteItem），支援拖曳排序與新增筆記操作。
 * 通常作為 FloatingInputBar 的子元件使用。
 *
 * 🧩 功能特色：
 * - 顯示所有筆記並提供編輯、刪除、拖曳排序功能
 * - 拖曳重排支援 mouse event 隔離，避免與視窗拖曳衝突
 * - 拖曳效果具有動態樣式（透明度、縮放、陰影）
 * - 支援全螢幕與非全螢幕顯示高度切換
 * - 提供「新增筆記」按鈕
 *
 * ✅ 使用場景範例：
 * - FloatingInputBar 的多筆記錄輸入介面
 * - 複雜筆記編輯介面的子結構
 */

'use client'

import React, { useState, useEffect } from 'react';
import { Note } from '@/features/fragments/types/fragment';
import NoteItem from './NoteItem';
import { useHoverScrollbar } from '@/features/interaction/useHoverScrollbar'

interface NotesListProps {
  notes: Note[];
  isFullScreen: boolean;
  onUpdateNote: (id: string, field: 'title' | 'value', value: string) => void;
  onDeleteNote: (id: string) => void;
  onReorderNotes: (newNotes: Note[]) => void;
  onAddNote: () => void;
}

const NotesList: React.FC<NotesListProps> = ({
  notes,
  isFullScreen,
  onUpdateNote,
  onDeleteNote,
  onReorderNotes,
  onAddNote
}) => {
  const { hovering: isHoveringScrollbar, bind: scrollbarHoverHandlers } = useHoverScrollbar(20)
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  // 新增狀態用於追蹤是否正在拖曳筆記
  const [isNoteDragging, setIsNoteDragging] = useState(false);

  // 處理筆記拖曳排序
  const handleNoteDragStart = (e: React.DragEvent, id: string) => {
    // 阻止事件冒泡，防止與窗口拖曳衝突
    e.stopPropagation();
    
    // 設置正在拖曳狀態
    setIsNoteDragging(true);
    
    setDraggedNoteId(id);
    // 使用更明確的資料格式以避免與其他拖曳混淆
    e.dataTransfer.setData('application/note-drag', id);
    // 清除其他可能的資料格式
    e.dataTransfer.clearData('text/plain');
    
    // 設置拖曳效果
    const el = e.currentTarget as HTMLElement;
    el.style.opacity = '0.4';
    
    if (el.classList) {
      el.classList.add('scale-105');
      el.classList.add('shadow-md');
    }
  }
  
  const handleNoteDragOver = (e: React.DragEvent, index: number) => {
    // 必須阻止默認行為才能觸發 drop
    e.preventDefault();
    // 阻止冒泡
    e.stopPropagation();
    
    // 只有當數據是來自筆記拖曳時才處理
    if (e.dataTransfer.types.includes('application/note-drag')) {
      setDragOverIndex(index);
    }
  }
  
  const handleNoteDrop = (e: React.DragEvent, index: number) => {
    // 阻止默認行為
    e.preventDefault();
    // 阻止冒泡
    e.stopPropagation();
    
    // 確認數據是來自筆記拖曳
    if (!e.dataTransfer.types.includes('application/note-drag')) return;
    
    const draggedId = draggedNoteId;
    if (!draggedId) return;
  
    const currentIndex = notes.findIndex(n => n.id === draggedId);
    if (currentIndex === -1 || currentIndex === index) return;
  
    const newNotes = [...notes];
    const draggedNote = newNotes.splice(currentIndex, 1)[0];
    newNotes.splice(index, 0, draggedNote);
  
    onReorderNotes(newNotes);
    setDraggedNoteId(null);
    setDragOverIndex(null);
    
    // 拖曳完成
    setIsNoteDragging(false);
    
    // 強制觸發一個全局的 mouseup 事件，確保窗口拖曳狀態被重置
    setTimeout(() => {
      window.dispatchEvent(new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true,
        view: window
      }));
    }, 0);
  }
  
  const handleNoteDragEnd = (e: React.DragEvent) => {
    // 阻止冒泡
    e.stopPropagation();
    
    if (e.currentTarget && 'style' in e.currentTarget) {
      const el = e.currentTarget as HTMLElement;
      el.style.opacity = '1';
      if (el.classList) {
        el.classList.remove('scale-105');
        el.classList.remove('shadow-md');
      }
    }
    
    setDraggedNoteId(null);
    setDragOverIndex(null);
    
    // 拖曳結束
    setIsNoteDragging(false);
    
    // 強制觸發一個全局的 mouseup 事件，確保窗口拖曳狀態被重置
    setTimeout(() => {
      window.dispatchEvent(new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true,
        view: window
      }));
    }, 0);
  }

  // 確保拖曳筆記完成後，不論成功或取消，都重置窗口拖曳狀態
  useEffect(() => {
    // 當筆記的拖曳狀態從 true 變為 false 時，確保窗口拖曳狀態也被重置
    let cleanup: number;
    
    if (!isNoteDragging && draggedNoteId === null) {
      cleanup = window.setTimeout(() => {
        window.dispatchEvent(new MouseEvent('mouseup', {
          bubbles: true,
          cancelable: true,
          view: window
        }));
      }, 50);
    }
    
    return () => {
      if (cleanup) clearTimeout(cleanup);
    };
  }, [isNoteDragging, draggedNoteId]);

  return (
    <div 
      className={`overflow-y-auto space-y-3 ${isHoveringScrollbar ? 'scrollbar-hover' : 'scrollbar-invisible'} ${
        isFullScreen ? 'h-[35rem]' : 'max-h-[20rem]'
      }`}
      {...scrollbarHoverHandlers}
      onDragStart={(e) => {
        if (!draggedNoteId) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      {notes.map((note, idx) => (
        <NoteItem
          key={note.id}
          note={note}
          index={idx}
          onUpdateNote={onUpdateNote}
          onDeleteNote={onDeleteNote}
          onDragStart={handleNoteDragStart}
          onDragOver={handleNoteDragOver}
          onDrop={handleNoteDrop}
          onDragEnd={handleNoteDragEnd}
          isDragging={draggedNoteId === note.id}
          isDragOver={dragOverIndex === idx}
          isFullScreen={isFullScreen}
        />
      ))}

            {/* 新增按鈕 */}
      <div className="flex justify-end p-2">
        <button
          className="w-8 h-8 text-gray-400 rounded-full text-lg font-light transition-all duration-200 hover:text-gray-600 hover:scale-110 flex items-center justify-center"
          onClick={onAddNote}
        >
          +
        </button>
      </div>
    </div>
  );
};

export default NotesList;