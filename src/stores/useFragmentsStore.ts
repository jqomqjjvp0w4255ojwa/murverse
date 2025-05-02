'use client'

import { create } from 'zustand'
import { Fragment, Note } from '@/types/fragment'
import { loadFragments, saveFragments } from '@/lib/FragmentsRepository'
import { v4 as uuidv4 } from 'uuid'

type SortField = 'createdAt' | 'content'
type SortOrder = 'asc' | 'desc'
type Mode = 'float' | 'list'

export type TagLogicMode = 'AND' | 'OR'

interface FragmentsState {
  fragments: Fragment[]
  searchQuery: string
  selectedTags: string[]
  excludedTags: string[]
  tagLogicMode: TagLogicMode
  sortField: SortField
  sortOrder: SortOrder
  selectedFragment: Fragment | null
  mode: Mode

  // 操作方法
  load: () => void
  save: () => void
  setFragments: (fragments: Fragment[]) => void
  setSearchQuery: (query: string) => void
  setSelectedTags: (tags: string[]) => void
  setExcludedTags: (tags: string[]) => void
  setTagLogicMode: (mode: TagLogicMode) => void
  setSortField: (field: SortField) => void
  setSortOrder: (order: SortOrder) => void
  setSelectedFragment: (fragment: Fragment | null) => void
  setMode: (mode: Mode) => void

  // 進階功能
  getFilteredFragments: () => Fragment[]

  // Fragment 操作
  addFragment: (content: string, tags: string[], notes: Note[]) => void
  addNoteToFragment: (fragmentId: string, note: Note) => void
  updateNoteInFragment: (fragmentId: string, noteId: string, updates: Partial<Note>) => void
  removeNoteFromFragment: (fragmentId: string, noteId: string) => void
  reorderNotesInFragment: (fragmentId: string, newOrder: string[]) => void
  addTagToFragment: (fragmentId: string, tag: string) => void
  removeTagFromFragment: (fragmentId: string, tag: string) => void
}

// 檢查是否在客戶端環境
const isClient = typeof window !== 'undefined'

export const useFragmentsStore = create<FragmentsState>((set, get) => ({
  fragments: [],
  searchQuery: '',
  selectedTags: [],
  excludedTags: [],
  tagLogicMode: 'AND',
  sortField: 'createdAt',
  sortOrder: 'desc',
  selectedFragment: null,
  mode: 'float',

  load: () => {
    if (!isClient) return
    const fragments = loadFragments()
    set({ fragments })
  },

  save: () => {
    if (!isClient) return
    const { fragments } = get()
    saveFragments(fragments)
  },

  setFragments: (fragments) => set({ fragments }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedTags: (tags) => set({ selectedTags: tags }),
  setExcludedTags: (tags) => set({ excludedTags: tags }),
  setTagLogicMode: (mode) => set({ tagLogicMode: mode }),
  setSortField: (field) => set({ sortField: field }),
  setSortOrder: (order) => set({ sortOrder: order }),
  setSelectedFragment: (fragment) => set({ selectedFragment: fragment }),
  setMode: (mode) => set({ mode }),

  getFilteredFragments: () => {
    const { fragments, searchQuery, selectedTags, excludedTags, tagLogicMode } = get()
    
    return fragments.filter(fragment => {
      if (searchQuery && !fragment.content.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      if (excludedTags.length > 0 && excludedTags.some(tag => fragment.tags.includes(tag))) {
        return false
      }
      if (selectedTags.length === 0) {
        return true
      }
      if (tagLogicMode === 'AND') {
        return selectedTags.every(tag => fragment.tags.includes(tag))
      } else {
        return selectedTags.some(tag => fragment.tags.includes(tag))
      }
    })
  },

  addFragment: (content, tags, notes) => {
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

    set(state => ({
      fragments: [newFragment, ...state.fragments]
    }))

    if (isClient) {
      get().save()
    }
  },

  addNoteToFragment: (fragmentId, note) => {
    set(state => ({
      fragments: state.fragments.map(f =>
        f.id === fragmentId
          ? { ...f, notes: [...f.notes, note], updatedAt: new Date().toISOString() }
          : f
      )
    }))
    if (isClient) {
      get().save()
    }
  },

  updateNoteInFragment: (fragmentId, noteId, updates) => {
    set(state => ({
      fragments: state.fragments.map(f =>
        f.id === fragmentId
          ? {
            ...f,
            notes: f.notes.map(n => n.id === noteId ? { ...n, ...updates } : n),
            updatedAt: new Date().toISOString()
          }
          : f
      )
    }))
    if (isClient) {
      get().save()
    }
  },

  removeNoteFromFragment: (fragmentId, noteId) => {
    set(state => ({
      fragments: state.fragments.map(f =>
        f.id === fragmentId
          ? {
            ...f,
            notes: f.notes.filter(n => n.id !== noteId),
            updatedAt: new Date().toISOString()
          }
          : f
      )
    }))
    if (isClient) {
      get().save()
    }
  },

  reorderNotesInFragment: (fragmentId, newOrder) => {
    set(state => ({
      fragments: state.fragments.map(f => {
        if (f.id !== fragmentId) return f
        const notesMap = Object.fromEntries(f.notes.map(n => [n.id, n]))
        const orderedNotes = newOrder.map(id => notesMap[id]).filter(Boolean)
        return {
          ...f,
          notes: orderedNotes,
          updatedAt: new Date().toISOString()
        }
      })
    }))
    if (isClient) {
      get().save()
    }
  },

  addTagToFragment: (fragmentId, tag) => {
    set(state => ({
      fragments: state.fragments.map(f =>
        f.id === fragmentId && !f.tags.includes(tag)
          ? {
            ...f,
            tags: [...f.tags, tag],
            updatedAt: new Date().toISOString()
          }
          : f
      )
    }))
    if (isClient) {
      get().save()
    }
  },

  removeTagFromFragment: (fragmentId, tag) => {
    set(state => ({
      fragments: state.fragments.map(f =>
        f.id === fragmentId
          ? {
            ...f,
            tags: f.tags.filter(t => t !== tag),
            updatedAt: new Date().toISOString()
          }
          : f
      )
    }))
    if (isClient) {
      get().save()
    }
  },
}))