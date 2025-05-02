// components/fragments/NotesList.tsx
'use client'

import React, { useState } from 'react';
import { Note } from '@/types/fragment';
import NoteItem from './NoteItem';

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
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // 處理筆記拖曳排序
  const handleNoteDragStart = (e: React.DragEvent, id: string) => {
    // 阻止事件冒泡，防止與窗口拖曳衝突
    e.stopPropagation();
    
    setDraggedNoteId(id);
    e.dataTransfer.setData('noteId', id);
    
    // 設置拖曳效果
    const el = e.currentTarget as HTMLElement;
    el.style.opacity = '0.4';
    
    if (el.classList) {
      el.classList.add('scale-105');
      el.classList.add('shadow-md');
    }
  }
  
  const handleNoteDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }
  
  const handleNoteDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
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
  }
  
  const handleNoteDragEnd = (e: React.DragEvent) => {
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
  }

  return (
    <div className={`overflow-y-auto space-y-3 ${isFullScreen ? 'h-140' : 'max-h-80'}`}>
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
          className="px-2 py-1 bg-blue-500 text-white rounded-full text-xs"
          onClick={onAddNote}
        >
          ＋ 新增筆記
        </button>
      </div>
    </div>
  );
};

export default NotesList;