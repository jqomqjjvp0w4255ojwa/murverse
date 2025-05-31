// src/features/fragments/types/gridTypes.ts
// 網格佈局相關類型定義

import { Fragment } from './fragment'

// 碎片的尺寸定義（以格子數量計算）
export interface FragmentSize {
  width: number  // 寬度（格子數量）
  height: number // 高度（格子數量）
}

// 網格位置類型
export interface GridPosition {
  row: number
  col: number
}

// 帶網格位置的碎片（UI 呈現使用）
export interface GridFragment extends Fragment {
  position: GridPosition
  size: FragmentSize
  fontSize: number
  direction: 'horizontal' | 'vertical'
  showContent: boolean
  showNote: boolean
  showTags: boolean
  driftOffset?: number
}

// 像素位置類型
export interface PixelPosition {
  top: number
  left: number
}

// 碎片相關性映射類型
export type RelevanceMap = Record<string, number>

// 方向映射類型
export type DirectionMap = Record<string, 'horizontal' | 'vertical'>