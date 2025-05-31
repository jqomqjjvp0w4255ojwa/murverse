// src/features/fragments/constants.ts
// 統一管理常數，避免重複定義

export const GRID_SIZE = 20 // 每個格子20px
export const GRID_GAP = 3   // 格子間的間距係數

// 容器常數
export const CONTAINER_WIDTH = 1200  // 固定容器寬度

// 內容字數限制
export const MAX_CONTENT_LENGTH = 100
export const MAX_NOTE_LENGTH = 500
export const MAX_TAGS_COUNT = 20

// 視圖模式
export const VIEW_MODES = {
  GRID: 'grid',
  FLOW: 'flow'
} as const

// 排序方式
export const SORT_FIELDS = {
  CREATED_AT: 'createdAt',
  CONTENT: 'content',
  UPDATED_AT: 'updatedAt'
} as const

export const SORT_ORDERS = {
  ASC: 'asc',
  DESC: 'desc'
} as const

// 儲存相關
export const STORAGE_KEY = 'murverse_fragments'
export const STORAGE_KEY_POSITIONS = 'murverse_fragment_positions'
