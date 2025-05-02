
'use client'


import { useState, useRef, useEffect } from 'react';

import { FloatingWindow, useGroupsStore } from '../stores/useGroupsStore';


interface DraggableOptions {
  id: string;
  width: number;
  height: number;
}

export function useDraggable({ id, width, height }: DraggableOptions) {
  const {
    windows,
    updateWindow,
    groups,
    createGroup,
    removeWindowFromGroup,
    moveGroup,
  } = useGroupsStore();

  const [isDragging, setIsDragging] = useState(false);
  const [draggingGroupId, setDraggingGroupId] = useState<string | null>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const startMouse = useRef({ x: 0, y: 0 });
  const [groupCandidate, setGroupCandidate] = useState<string | null>(null);
  const groupTimer = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  function onMouseDown(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    startMouse.current = { x: e.clientX, y: e.clientY };
    // 問題 2: 參數 'w' 隱式具有 'any' 類型
    // 解決方案: 添加類型註解
    const win = windows.find((w: FloatingWindow) => w.id === id);
    if (win?.groupId) {
      setDraggingGroupId(win.groupId);
    } else {
      startPos.current = { x: win?.x || 0, y: win?.y || 0 };
    }
    setIsDragging(true);
  }

  function onMouseMove(e: MouseEvent) {
    if (!isDragging) return;

    const dx = e.clientX - startMouse.current.x;
    const dy = e.clientY - startMouse.current.y;

    if (draggingGroupId) {
      moveGroup(draggingGroupId, dx, dy);
    } else {
      const newX = startPos.current.x + dx;
      const newY = startPos.current.y + dy;
    
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(() => {
        updateWindow(id, { x: newX, y: newY });
      });
    
      detectGroupCandidate(id);
    
      // 偵測是否拖出群組範圍
      const win = windows.find(w => w.id === id);
      if (win?.groupId) {
        const group = groups.find(g => g.id === win.groupId);
        if (group) {
          const isOutOfGroup =
            newX < group.x - 20 ||
            newX > group.x + group.width + 20 ||
            newY < group.y - 20 ||
            newY > group.y + group.height + 20;
    
          if (isOutOfGroup) {
            removeWindowFromGroup(id);
          }
        }
      }
    }
        
  }

  function onMouseUp() {
    if (!isDragging) return;

    if (groupCandidate) {
      createGroup([id, groupCandidate]);
    }

    setIsDragging(false);
    setDraggingGroupId(null);
    setGroupCandidate(null);
    if (groupTimer.current) {
      clearTimeout(groupTimer.current);
      groupTimer.current = null;
    }
  }

  function detectGroupCandidate(currentId: string) {
    const current = windows.find(w => w.id === currentId);
    if (!current) return;
  
    let bestCandidate: FloatingWindow | null = null;
    let bestDistance = Infinity;
  
    for (const other of windows) {
      if (other.id === currentId) continue;
  
      const verticalDistanceTop = Math.abs((current.y) - (other.y + other.height));
      const verticalDistanceBottom = Math.abs((current.y + current.height) - (other.y));
  
      const isHorizontallyAligned = (
        (current.x + current.width > other.x) &&
        (current.x < other.x + other.width)
      );
  
      // 吸附條件：水平方向有重疊，且上下距離小於20px
      if (isHorizontallyAligned) {
        if (verticalDistanceTop <= 20 && verticalDistanceTop < bestDistance) {
          bestCandidate = other;
          bestDistance = verticalDistanceTop;
        }
        if (verticalDistanceBottom <= 20 && verticalDistanceBottom < bestDistance) {
          bestCandidate = other;
          bestDistance = verticalDistanceBottom;
        }
      }
    }
  
    if (bestCandidate) {
      if (!groupTimer.current) {
        groupTimer.current = setTimeout(() => {
          setGroupCandidate(bestCandidate!.id);
        }, 300); // 300ms延遲群組化
      }
    } else {
      if (groupTimer.current) {
        clearTimeout(groupTimer.current);
        groupTimer.current = null;
      }
      setGroupCandidate(null);
    }
  }
  

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('blur', onMouseUp); // <<<< 新增防呆：視窗失焦也視為放開滑鼠
    } else {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('blur', onMouseUp); // <<<< 解除監聽
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('blur', onMouseUp);
    };
  }, [isDragging]);

  return {
    onMouseDown,
    isDragging,
    groupCandidate, // 提供給畫面層畫「虛線框」用
  };
}