// src/features/fragments/layout/useLayoutFragments.ts
// 注意：所有碰撞與間距檢查請統一使用此函式
// 間距固定為 CARD_SPACING（目前為 1 格）

import { useMemo } from 'react'
import { Fragment } from '../types/fragment'
import { 
  FragmentSize, 
  GridPosition, 
  GridFragment,
  DirectionMap,
  RelevanceMap
} from '../types/gridTypes'
import { 
  GRID_SIZE, 
  MAX_CONTENT_LENGTH, 
  MAX_NOTE_LENGTH,
  CONTAINER_WIDTH
} from '../constants'
import { truncateText, decideDirection } from '../utils'

// 卡片尺寸限制
const MIN_CARD_WIDTH = 5;   // 最小寬度（格子數）
const MAX_CARD_WIDTH = 15;  // 最大寬度（格子數）
const MIN_CARD_HEIGHT = 4;  // 最小高度（格子數）
const MAX_CARD_HEIGHT = 12; // 最大高度（格子數）

// 固定間距
const CARD_SPACING = 1;     // 卡片間距（格子數）

// 計算容器最大列數
const CONTAINER_COLS = Math.floor(CONTAINER_WIDTH / GRID_SIZE);

// 計算字體大小
export function calculateFontSize(relevanceScore: number = 0): number {

  return 14; // 或者您想要的任何固定字體大小
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
  const tagsLength = fragment.tags.length;
  
  // 根據字體大小計算所需空間 (字級越大占空間越多)
  const fontFactor = fontSize / 14;
  
  let cardWidth: number;
  let cardHeight: number;
  
  // 根據內容長度動態計算所需空間，但設置合理上下限
  if (direction === 'horizontal') {
    // 橫排：計算所需行數
    const charsPerLine = Math.max(10, Math.ceil(15 / fontFactor)); // 每行字數有下限，調整為更合理的值
    const contentLines = Math.ceil(contentLength / charsPerLine) || 1;
    const noteLines = noteLength ? Math.ceil(noteLength / charsPerLine) : 0;
    const tagLines = Math.min(2, Math.ceil(tagsLength / 4)); // 標籤最多顯示2行
    
    // 限制最大行數
    const maxContentLines = 8;
    const finalContentLines = Math.min(contentLines, maxContentLines);
    const finalNoteLines = Math.min(noteLines, Math.max(0, maxContentLines - finalContentLines));
    
    // 總高度（行數 * 行高）+ 內邊距 + 額外間距
    const lineHeight = fontFactor * 1.4; // 稍微調整行高
    const contentHeight = finalContentLines * lineHeight;
    const noteHeight = finalNoteLines * lineHeight * 0.8;
    const tagHeight = tagLines > 0 ? (tagLines * 1.5 + 1.5) : 0; // 標籤高度 + 額外間距
    const paddingHeight = 3.5; // 增加內邊距
    
    // 總寬度計算
    const avgCharsPerLine = Math.min(charsPerLine, 20);
    const charWidth = fontFactor * 0.6;
    const contentWidth = avgCharsPerLine * charWidth;
    const paddingWidth = 2;
    
    cardWidth = Math.round(contentWidth + paddingWidth);
    cardHeight = Math.round(contentHeight + noteHeight + tagHeight + paddingHeight);
  } else {
    // 豎排：計算所需列數
    const charsPerColumn = Math.max(10, Math.ceil(15 / fontFactor));
    const contentColumns = Math.ceil(contentLength / charsPerColumn) || 1;
    const noteColumns = noteLength ? Math.ceil(noteLength / charsPerColumn) : 0;
    const tagColumns = Math.min(tagsLength, 3); // 豎排標籤最多3列
    
    // 限制最大列數
    const maxColumns = 8;
    const finalContentColumns = Math.min(contentColumns, maxColumns);
    const finalNoteColumns = Math.min(noteColumns, Math.max(0, maxColumns - finalContentColumns));
    
    // 總寬度（列數 * 列寬）+ 內邊距 + 額外間距
    const columnWidth = fontFactor * 1.6;
    const contentWidth = finalContentColumns * columnWidth;
    const noteWidth = finalNoteColumns * columnWidth * 0.8;
    const tagWidth = tagColumns > 0 ? (tagColumns * 1.5 + 1.5) : 0; // 標籤寬度 + 額外間距
    const paddingWidth = 3.5; // 增加內邊距
    
    // 總高度計算
    const avgCharsPerColumn = Math.min(charsPerColumn, 20);
    const charHeight = fontFactor * 1.1;
    const contentHeight = avgCharsPerColumn * charHeight;
    const paddingHeight = 2;
    
    cardWidth = Math.round(contentWidth + noteWidth + tagWidth + paddingWidth);
    cardHeight = Math.round(contentHeight + paddingHeight);
  }
  
  // 應用尺寸限制
  return {
    width: Math.max(MIN_CARD_WIDTH, Math.min(MAX_CARD_WIDTH, cardWidth)),
    height: Math.max(MIN_CARD_HEIGHT, Math.min(MAX_CARD_HEIGHT, cardHeight))
  };
}


// 計算網格是否被佔用（包含間距）
export function isGridOccupied(
  grid: boolean[][],
  position: GridPosition,
  size: FragmentSize
): boolean {
  // 檢查範圍是否超出網格
  const endRow = position.row + size.height;
  const endCol = position.col + size.width;
  
  if (
    position.row < 0 ||
    position.col < 0 ||
    endRow >= grid.length ||
    endCol >= grid[0].length
  ) {
    return true // 超出邊界視為佔用
  }

  // 檢查碎片本身的格子
  for (let r = position.row; r < endRow; r++) {
    for (let c = position.col; c < endCol; c++) {
      if (grid[r] && grid[r][c]) {
        return true
      }
    }
  }

  // 檢查右側和下側的間距格子
  // 右側間距
  if (endCol < grid[0].length) {
    for (let r = position.row; r < endRow; r++) {
      if (grid[r] && grid[r][endCol]) {
        return true
      }
    }
  }
  
  // 下側間距
  if (endRow < grid.length) {
    for (let c = position.col; c < endCol; c++) {
      if (grid[endRow] && grid[endRow][c]) {
        return true
      }
    }
  }
  
  // 右下角間距
  if (endRow < grid.length && endCol < grid[0].length) {
    if (grid[endRow] && grid[endRow][endCol]) {
      return true
    }
  }

  return false // 所有格子都未被佔用
}

// 標記網格為已佔用（包含間距）
export function markGridAsOccupied(
  grid: boolean[][],
  position: GridPosition,
  size: FragmentSize
): void {
  const endRow = position.row + size.height;
  const endCol = position.col + size.width;
  
  // 標記碎片本身的格子
  for (let r = position.row; r < endRow; r++) {
    for (let c = position.col; c < endCol; c++) {
      if (r >= 0 && c >= 0 && r < grid.length && c < grid[0].length) {
        grid[r][c] = true
      }
    }
  }
  
  // 標記右側間距
  if (endCol < grid[0].length) {
    for (let r = position.row; r < endRow; r++) {
      if (r >= 0 && r < grid.length) {
        grid[r][endCol] = true
      }
    }
  }
  
  // 下側間距
  if (endRow < grid.length) {
    for (let c = position.col; c < endCol; c++) {
      if (c >= 0 && c < grid[0].length) {
        grid[endRow][c] = true
      }
    }
  }
  
  // 標記右下角間距
  if (endRow < grid.length && endCol < grid[0].length) {
    grid[endRow][endCol] = true
  }
}

// 找到可放置位置（用於新加入的碎片）
export function findPlacementPosition(
  grid: boolean[][],
  size: FragmentSize
): GridPosition | null {
  const rows = grid.length;
  const maxCols = Math.min(grid[0].length, CONTAINER_COLS);
  
  // 從上到下，從左到右尋找可放置的位置
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < maxCols; c++) {
      const position = { row: r, col: c };
      // 檢查是否會超出容器寬度
      if (c + size.width <= CONTAINER_COLS && !isGridOccupied(grid, position, size)) {
        return position;
      }
    }
  }
  
  return null;
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
    row: Math.max(0, Math.round(top / GRID_SIZE)),
    col: Math.max(0, Math.round(left / GRID_SIZE))
  }
}

// 創建碎片方向映射的函數
export function createDirectionMap(fragments: Fragment[]): DirectionMap {
  const map: DirectionMap = {};
  
  fragments.forEach(frag => {
    if (frag.direction) {
      map[frag.id] = frag.direction;
    } else {
      map[frag.id] = decideDirection(
        frag.content, 
        frag.notes?.[0]?.value,
        true // UI顯示時使用隨機性
      );
    }
  });
  
  return map;
}

// 主要布局函數 - 徹底修復版本
  export function useLayoutFragments(
    fragments: Fragment[],
    positions: Record<string, GridPosition>,
    directionMap: DirectionMap = {}
  ): {
    gridFragments: GridFragment[],
    newPositions: Record<string, GridPosition>
  } {
  return useMemo(() => {
    const rows = 200;
    const cols = 200;
    const grid: boolean[][] = Array(rows).fill(0).map(() => Array(cols).fill(false));

    const fragsWithProps = fragments.map(frag => {
      const direction = frag.direction || directionMap[frag.id] || 'horizontal';
      const fontSize = calculateFontSize(); // 不再傳遞 relevance 參數
      const size = calculateFragmentSize(frag, direction, fontSize);
      
      return {
        ...frag,
        direction,
        fontSize,
        size,
        showContent: frag.showContent !== false,
        showNote: frag.showNote !== false,
        showTags: frag.showTags !== false,
        ...(positions[frag.id] ? { position: positions[frag.id] } : {})
      };
    });

    const placedFrags: GridFragment[] = [];
    const newPositions: Record<string, GridPosition> = {};

    // 🧩 有位置信息的碎片（例如 localStorage 已保存的）
    const fragsWithPosition = fragsWithProps.filter(frag => !!positions[frag.id]);

    fragsWithPosition.forEach(frag => {
      let position = { ...positions[frag.id] };

      // 防止超出右邊界
      if (position.col + frag.size.width > CONTAINER_COLS) {
        position.col = Math.max(0, CONTAINER_COLS - frag.size.width);
      }

      const isZeroPosition = position.row === 0 && position.col === 0;
      const isValidPosition = !isGridOccupied(grid, position, frag.size);

      if (isValidPosition && !isZeroPosition) {
        markGridAsOccupied(grid, position, frag.size);
        placedFrags.push({ ...frag, position });
        newPositions[frag.id] = position;
      } else {
        placedFrags.push({ ...frag, position });   // 仍然渲染
        console.warn(`位置衝突，以原座標顯示以免卡片消失`);
        console.warn(`⚠️ 已儲存的位置 ${JSON.stringify(position)} 無效或為 (0,0)，將重新布局碎片 ${frag.id}`);
      }
    });

    // 🆕 沒有位置的新碎片
    const fragsWithoutPosition = fragsWithProps.filter(frag => !positions[frag.id]);

    fragsWithoutPosition.forEach(frag => {
      const position = findPlacementPosition(grid, frag.size);

      if (position) {
        markGridAsOccupied(grid, position, frag.size);
        placedFrags.push({ ...frag, position });
        newPositions[frag.id] = position;
      } else {
        const originalPosition = positions[frag.id];
        let fallbackPosition: GridPosition | null = null;

        if (
          originalPosition &&
          !isGridOccupied(grid, originalPosition, frag.size)
        ) {
          fallbackPosition = originalPosition;
          console.warn(`找不到空位，碎片 ${frag.id} 回退至原始位置`);
        } else {
          const retryPosition = findPlacementPosition(grid, frag.size);
          if (retryPosition) {
            fallbackPosition = retryPosition;
            console.warn(`碎片 ${frag.id} 回退失敗，但找到其他空位放置`);
          } else {
            console.error(`碎片 ${frag.id} 完全無處可放！你應考慮擴展網格或提示用戶手動處理`);
            return;
          }
        }

        if (fallbackPosition) {
          if (fallbackPosition.row === 0 && fallbackPosition.col === 0) {
          console.error(`🛑 嘗試將碎片 ${frag.id} fallback 到 (0,0)，已阻止`)
          return;
        }
          markGridAsOccupied(grid, fallbackPosition, frag.size);
          placedFrags.push({ ...frag, position: fallbackPosition });
          newPositions[frag.id] = fallbackPosition;
        } else {
          console.error(`碎片 ${frag.id} fallbackPosition 無效，跳過放置避免落在 (0,0)`);
        }
      }
    });

    return { gridFragments: placedFrags, newPositions };
  }, [fragments, positions, directionMap]); // 移除 relevanceMap 依賴
}