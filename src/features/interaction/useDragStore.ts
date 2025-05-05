// src/stores/useDragStore.ts
'use client'

import { create } from 'zustand'

interface DragStore {
  draggingWindowId: string | null
  setDraggingWindowId: (id: string | null) => void
  getDraggingWindowId: () => string | null
}

export const useDragStore = create<DragStore>((set, get) => ({
  draggingWindowId: null,
  setDraggingWindowId: (id) => set({ draggingWindowId: id }),
  getDraggingWindowId: () => get().draggingWindowId,
}))