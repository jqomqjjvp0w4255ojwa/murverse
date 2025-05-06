import { useMemo } from 'react'
import { Fragment } from '@/features/fragments/types/fragment'

// 格子大小常數
const GRID_SIZE = 20 // 每個格子20px
const GRID_GAP = 3   // 格子間的間距係數

// 內容字數限制
const MAX_CONTENT_LENGTH = 100
const MAX_NOTE_LENGTH = 500
const MAX_TAGS_COUNT = 20

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

// 帶網格位置的碎片
export interface GridFragment extends Fragment {
  position: GridPosition
  size: FragmentSize
  fontSize: number  // 字體大小（隨重要性調整）
}

// 截短文字（超出長度加上省略號）
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '......';
}

// 根據內容決定方向
export function decideDirection(content: string, note?: string): 'horizontal' | 'vertical' {
  const full = `${content} ${note ?? ''}`
  const hasEnglish = /[a-zA-Z]/.test(full)
  const isOnlyCJK = /^[\u4e00-\u9fa5\u3040-\u30ff\s]+$/.test(full)

  // 純中文或日文有30%機率採用豎排
  if (isOnlyCJK && Math.random() < 0.3) return 'vertical'
  
  // 其他情況一律橫排
  return 'horizontal'
}

// 計算字體大小（根據重要性)
export function calculateFontSize(relevanceScore: number = 0): number {
  // 基本字型大小 14px，根據重要性增加
  return Math.floor(14 + relevanceScore * 6); // 最大增加 6px
}

// 計算根據文字內容的卡片尺寸
export function calculateFragmentSize(
  fragment: Fragment, 
  direction: 'horizontal' | 'vertical',
  fontSize: number
): FragmentSize {
  // 處理內容字數限制
  const content = truncateText(fragment.content, MAX_CONTENT_LENGTH);
  const contentLength = content.length;
  
  // 處理筆記內容
  const noteText = fragment.notes?.[0]?.value || '';
  const note = truncateText(noteText, MAX_NOTE_LENGTH);
  const noteLength = note.length;
  
  // 處理標籤數量
  const tags = fragment.tags.slice(0, MAX_TAGS_COUNT);
  const tagsLength = tags.join(' ').length;
  
  // 根據字體大小計算所需空間 (字級越大占空間越多)
  const fontFactor = fontSize / 14;
  
  // 根據內容長度動態計算所需空間，不預設卡片尺寸
  if (direction === 'horizontal') {
    // 橫排：計算所需行數
    const charsPerLine = Math.ceil(18 / fontFactor); // 每行字數會根據字型大小調整
    const contentLines = Math.ceil(contentLength / charsPerLine) || 1;
    const noteLines = noteLength ? Math.ceil(noteLength / charsPerLine) : 0;
    const tagLines = Math.ceil(tags.length / 3);
    
    // 總高度（行數 * 行高）+ 內邊距
    const lineHeight = fontFactor * 1.5; // 行高是字體大小的1.5倍
    const contentHeight = contentLines * lineHeight;
    const noteHeight = noteLines * lineHeight * 0.9; // 筆記行高稍小
    const tagHeight = tagLines * 2; // 標籤高度
    const paddingHeight = 3; // 內邊距
    
    // 總寬度（最長行 * 字寬）+ 內邊距
    const maxLineLength = Math.max(
      ...content.split('\n').map(line => line.length),
      ...(note.split('\n').map(line => line.length))
    );
    const charWidth = fontFactor * 0.7; // 字寬是字體大小的0.7倍
    const contentWidth = Math.max(maxLineLength * charWidth, 10); // 最小寬度10格
    const paddingWidth = 2; // 內邊距
    
    return {
      width: Math.ceil(contentWidth + paddingWidth),
      height: Math.ceil(contentHeight + noteHeight + tagHeight + paddingHeight)
    };
  } else {
    // 豎排：計算所需列數
    const charsPerColumn = Math.ceil(18 / fontFactor); // 每列字數會根據字型大小調整
    const contentColumns = Math.ceil(contentLength / charsPerColumn) || 1;
    const noteColumns = noteLength ? Math.ceil(noteLength / charsPerColumn) : 0;
    const tagColumns = tags.length; // 豎排標籤每個佔一列
    
    // 總寬度（列數 * 列寬）+ 內邊距
    const columnWidth = fontFactor * 1.8; // 列寬是字體大小的1.8倍
    const contentWidth = contentColumns * columnWidth;
    const noteWidth = noteColumns * columnWidth * 0.9; // 筆記列寬稍小
    const tagWidth = tagColumns > 0 ? 2 : 0; // 標籤寬度
    const paddingWidth = 3; // 內邊距
    
    // 總高度（最長列 * 字高）+ 內邊距
    const maxColumnLength = Math.max(contentLength, noteLength);
    const charHeight = fontFactor * 1.2; // 字高是字體大小的1.2倍
    const contentHeight = Math.max(maxColumnLength * charHeight, 12); // 最小高度12格
    const paddingHeight = 2; // 內邊距
    
    return {
      width: Math.ceil(contentWidth + noteWidth + tagWidth + paddingWidth),
      height: Math.ceil(contentHeight + paddingHeight)
    };
  }
}

// 計算網格是否被佔用
export function isGridOccupied(
  grid: boolean[][],
  position: GridPosition,
  size: FragmentSize
): boolean {
  // 檢查範圍是否超出網格
  if (
    position.row < 0 ||
    position.col < 0 ||
    position.row + size.height > grid.length ||
    position.col + size.width > grid[0].length
  ) {
    return true // 超出邊界視為佔用
  }

  // 檢查各個格子是否已被佔用
  for (let r = position.row; r < position.row + size.height; r++) {
    for (let c = position.col; c < position.col + size.width; c++) {
      if (grid[r][c]) {
        return true // 有任何一個格子被佔用，就視為整體被佔用
      }
    }
  }

  return false // 所有格子都未被佔用
}

// 標記網格為已佔用
export function markGridAsOccupied(
  grid: boolean[][],
  position: GridPosition,
  size: FragmentSize
): void {
  for (let r = position.row; r < position.row + size.height; r++) {
    for (let c = position.col; c < position.col + size.width; c++) {
      grid[r][c] = true // 標記為已佔用
    }
  }
}

// 尋找可放置碎片的位置（貪婪排序）
export function findPlacementPosition(
  grid: boolean[][],
  size: FragmentSize
): GridPosition | null {
  const rows = grid.length
  const cols = grid[0].length

  // 從左上角開始，逐行逐列尋找可放置的位置，但要保持間距
  for (let r = 0; r < rows; r += GRID_GAP) {
    for (let c = 0; c < cols; c += GRID_GAP) {
      const position = { row: r, col: c }
      if (!isGridOccupied(grid, position, size)) {
        return position // 找到第一個可放置的位置
      }
    }
  }

  return null // 找不到可放置的位置
}

// 將網格位置轉換為像素位置
export function gridToPixel(position: GridPosition): { top: number, left: number } {
  return {
    top: position.row * GRID_SIZE,
    left: position.col * GRID_SIZE
  }
}

// 將像素位置轉換為網格位置
export function pixelToGrid(top: number, left: number): GridPosition {
  return {
    row: Math.round(top / GRID_SIZE),
    col: Math.round(left / GRID_SIZE)
  }
}

// 創建碎片方向映射的函數
export function createDirectionMap(fragments: Fragment[]): Record<string, 'horizontal' | 'vertical'> {
  const map: Record<string, 'horizontal' | 'vertical'> = {};
  
  fragments.forEach(frag => {
    if (frag.direction) {
      map[frag.id] = frag.direction;
    } else {
      map[frag.id] = decideDirection(frag.content, frag.notes?.[0]?.value);
    }
  });
  
  return map;
}

// 格式化日期
export function formatDate(dateString?: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

// 主要布局函數
export function useLayoutFragments(
  fragments: Fragment[],
  positions: Record<string, GridPosition>,
  relevanceMap: Record<string, number> = {},
  directionMap: Record<string, 'horizontal' | 'vertical'> = {}
): {
  gridFragments: GridFragment[],
  newPositions: Record<string, GridPosition>
} {
  return useMemo(() => {
    // 創建網格（預設大小100x100，可根據實際需求調整）
    const rows = 100
    const cols = 100
    const grid: boolean[][] = Array(rows).fill(0).map(() => Array(cols).fill(false))
    
    // 為每個碎片計算方向和大小
    const fragsWithProps = fragments.map(frag => {
      // 使用碎片的已有方向或從方向映射中獲取，或決定新方向
      const direction = frag.direction || directionMap[frag.id] || 'horizontal';
      
      const relevance = relevanceMap[frag.id] || 0
      const fontSize = calculateFontSize(relevance)
      const size = calculateFragmentSize(frag, direction, fontSize)
      
      return {
        ...frag,
        direction,
        fontSize,
        size,
        position: positions[frag.id] || { row: 0, col: 0 } // 使用已保存的位置或初始位置
      }
    })
    
    // 對碎片進行優先級排序（可以根據需求調整排序邏輯）
    const sortedFrags = [...fragsWithProps].sort((a, b) => {
      // 優先放置較大的碎片
      const aArea = a.size.width * a.size.height
      const bArea = b.size.width * b.size.height
      return bArea - aArea
    })
    
    // 為每個碎片尋找位置
    const placedFrags: GridFragment[] = []
    const newPositions: Record<string, GridPosition> = {}
    
    for (const frag of sortedFrags) {
      // 如果已有保存的位置且該位置未被佔用，則使用該位置
      if (positions[frag.id]) {
        const pos = positions[frag.id]
        if (!isGridOccupied(grid, pos, frag.size)) {
          markGridAsOccupied(grid, pos, frag.size)
          placedFrags.push({
            ...frag,
            position: pos
          })
          newPositions[frag.id] = pos
          continue
        }
      }
      
      // 否則尋找新位置
      const position = findPlacementPosition(grid, frag.size)
      
      if (position) {
        // 找到位置，標記為已佔用
        markGridAsOccupied(grid, position, frag.size)
        
        // 添加到已放置碎片列表
        placedFrags.push({
          ...frag,
          position
        })
        
        // 記錄新位置
        newPositions[frag.id] = position
      } else {
        console.warn(`無法為碎片 ${frag.id} 找到位置`)
      }
    }
    
    return { gridFragments: placedFrags, newPositions }
  }, [fragments, positions, relevanceMap, directionMap])
}