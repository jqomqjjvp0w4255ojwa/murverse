'use client'

import { useState } from 'react'
import { useFragmentsStore } from '@/stores/useFragmentsStore'
import { Fragment, Note } from '@/types/fragment'
import { v4 as uuidv4 } from 'uuid'

export default function NewFragmentForm() {
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [showSuccess, setShowSuccess] = useState(false)

  const { fragments, setFragments, save } = useFragmentsStore()

  const addNote = () => {
    const newNote: Note = {
      id: uuidv4(),
      title: '',
      value: '',
    }
    setNotes((prev) => [...prev, newNote])
  }

  const updateNote = (id: string, field: 'title' | 'value', value: string) => {
    setNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, [field]: value } : note))
    )
  }

  const removeNote = (id: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== id))
  }

  const handleSubmit = () => {
    if (!content.trim()) {
      alert('碎片主文不能空白！')
      return
    }

    const now = new Date().toISOString()

    const newFragment: Fragment = {
      id: uuidv4(),
      content,
      type: 'fragment',
      tags,
      notes,
      createdAt: now,
      updatedAt: now,
    }

    setFragments([newFragment, ...fragments])
    save()

    // 重置表單
    setContent('')
    setTags([])
    setNotes([])

    // 顯示成功提示
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 2000) // 2秒後淡出
  }

  return (
    <div className="p-4 space-y-4 relative">
      <h2 className="text-xl font-bold">新增碎片</h2>

      {/* 儲存成功提示 */}
      {showSuccess && (
        <div className="absolute top-0 right-0 mt-2 mr-2 bg-green-500 text-white px-4 py-2 rounded transition-opacity duration-500">
          儲存成功！
        </div>
      )}

      <div>
        <label className="block font-semibold">主文</label>
        <textarea
          className="w-full p-2 border rounded"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="輸入碎片內容..."
        />
      </div>

      <div>
        <label className="block font-semibold">標籤（用逗號分隔）</label>
        <input
          className="w-full p-2 border rounded"
          value={tags.join(',')}
          onChange={(e) => setTags(e.target.value.split(',').map((tag) => tag.trim()))}
          placeholder="輸入標籤，例如 #思考, #記錄"
        />
      </div>

      <div>
        <label className="block font-semibold mb-2">筆記</label>
        {notes.map((note) => (
          <div key={note.id} className="mb-2 p-2 border rounded space-y-2">
            <input
              className="w-full p-1 border rounded"
              placeholder="筆記標題"
              value={note.title}
              onChange={(e) => updateNote(note.id, 'title', e.target.value)}
            />
            <textarea
              className="w-full p-1 border rounded"
              placeholder="筆記內容"
              value={note.value}
              onChange={(e) => updateNote(note.id, 'value', e.target.value)}
            />
            <button
              className="text-red-500 text-sm"
              onClick={() => removeNote(note.id)}
            >
              刪除筆記
            </button>
          </div>
        ))}
        <button
          className="mt-2 px-3 py-1 bg-blue-500 text-white rounded"
          onClick={addNote}
        >
          ➕ 新增筆記
        </button>
      </div>

      <button
        className="px-4 py-2 bg-green-600 text-white rounded"
        onClick={handleSubmit}
      >
        儲存碎片
      </button>
    </div>
  )
}
