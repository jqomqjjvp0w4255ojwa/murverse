import { useState, useCallback } from 'react'

/**
 *C:\Users\user\murverse\src\features\interaction\useHoverScrollbar.ts
 * 
 * 偵測滑鼠是否靠近容器右側，用於顯示捲軸樣式。
 * 
 * @param threshold - 距離右側多少像素內才觸發（預設 20px）
 * @returns [hovering, handlers] - 是否靠近右側、以及要綁在容器上的 mouse handlers
 */
export function useHoverScrollbar(threshold: number = 20) {
  const [hovering, setHovering] = useState(false)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const bounds = e.currentTarget.getBoundingClientRect()
    const distanceFromRight = bounds.right - e.clientX
    setHovering(distanceFromRight < threshold)
  }, [threshold])

  const handleMouseLeave = useCallback(() => {
    setHovering(false)
  }, [])

  return {
    hovering,
    bind: {
      onMouseMove: handleMouseMove,
      onMouseLeave: handleMouseLeave
    }
  }
}
