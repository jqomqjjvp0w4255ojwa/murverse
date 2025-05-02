'use client'

import React, { useEffect, useState } from 'react'
import { useGroupsStore } from '../stores/useGroupsStore'

function distance(a: any, b: any) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

export function GroupOverlay() {
  const { windows } = useGroupsStore()
  const [groupBounds, setGroupBounds] = useState<{ x: number, y: number, width: number, height: number } | null>(null)

  useEffect(() => {
    const threshold = 100
    let matched: any[] = []

    for (let i = 0; i < windows.length; i++) {
      for (let j = i + 1; j < windows.length; j++) {
        const a = windows[i]
        const b = windows[j]
        if (distance(a, b) < threshold) {
          matched = [a, b]
          break
        }
      }
      if (matched.length) break
    }

    if (matched.length) {
      const minX = Math.min(...matched.map(w => w.x))
      const minY = Math.min(...matched.map(w => w.y))
      const maxX = Math.max(...matched.map(w => w.x + w.width))
      const maxY = Math.max(...matched.map(w => w.y + w.height))

      setGroupBounds({
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      })
    } else {
      setGroupBounds(null)
    }
  }, [windows])

  if (!groupBounds) return null

  return (
    <div
      style={{
        position: 'absolute',
        left: groupBounds.x,
        top: groupBounds.y,
        width: groupBounds.width,
        height: groupBounds.height,
        border: '2px dashed blue',
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    />
  )
}
