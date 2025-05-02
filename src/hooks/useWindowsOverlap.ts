// src/hooks/useWindowsOverlap.ts
import { useEffect } from 'react';
import { useGroupsStore } from '@/stores/useGroupsStore';
import { isRectOverlap } from '@/utils/groupUtils';

/**
 * 此Hook用于检测和处理窗口重叠
 * @param windowId 当前窗口ID
 * @param ref 窗口的DOM引用
 */
export function useWindowsOverlap(windowId: string, ref: React.RefObject<HTMLElement>) {
  const { windows, adjustWindowPosition } = useGroupsStore();
  
  // 监听窗口位置和大小变化
  useEffect(() => {
    const checkOverlap = () => {
      if (!ref.current) return;
      
      const myRect = ref.current.getBoundingClientRect();
      const myWindow = windows.find(w => w.id === windowId);
      
      if (!myWindow) return;
      
      // 找出与当前窗口重叠的其他窗口
      const overlappingWindows = windows
        .filter(w => w.id !== windowId)
        .map(w => {
          const el = document.getElementById(w.id);
          if (!el) return null;
          
          const rect = el.getBoundingClientRect();
          if (isRectOverlap(myRect, rect)) {
            return { window: w, rect };
          }
          return null;
        })
        .filter(item => item !== null);
      
      // 如果有重叠的窗口，调整位置
      if (overlappingWindows.length > 0) {
        adjustWindowPosition(windowId, overlappingWindows.map(item => item!));
      }
    };
    
    // 在窗口大小变化时，检查重叠
    const resizeObserver = new ResizeObserver(() => {
      checkOverlap();
    });
    
    if (ref.current) {
      resizeObserver.observe(ref.current);
    }
    
    // 在窗口拖动完成时检查重叠
    const handleMouseUp = () => {
      checkOverlap();
    };
    
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [windowId, windows, adjustWindowPosition, ref]);
}