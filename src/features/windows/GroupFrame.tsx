'use client'

import { useGroupsStore } from '@/features/windows/useGroupsStore'
import { useState, useEffect } from 'react'
import type { FloatingWindow } from '@/features/windows/useGroupsStore'

export default function GroupFrame() {
  const { groups, windows, moveGroup } = useGroupsStore()
  const [draggingGroupId, setDraggingGroupId] = useState<string | null>(null)
  const [startMousePos, setStartMousePos] = useState<{ x: number, y: number }>({ x: 0, y: 0 })
  const [, forceUpdate] = useState(0)

  // 📌 自動 re-render when resize
  useEffect(() => {
    const onResize = () => forceUpdate(n => n + 1)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // 📌 拖曳整組視窗
  const updateGroupAndMemberPositions = (deltaX: number, deltaY: number) => {
    if (!draggingGroupId) return
    const group = groups.find(g => g.id === draggingGroupId)
    if (!group) return

    moveGroup(draggingGroupId, deltaX, deltaY)

    group.memberIds.forEach(id => {
      const el = document.getElementById(id)
      if (el) {
        const left = parseFloat(el.style.left || '0') + deltaX
        const top = parseFloat(el.style.top || '0') + deltaY
        el.style.left = `${left}px`
        el.style.top = `${top}px`
      }
    })
  }

  // 📌 ResizeObserver 監看每個群組的 DOM 尺寸
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      window.dispatchEvent(new Event('resize'))
    })

    groups.forEach(group => {
      group.memberIds.forEach(id => {
        const el = document.getElementById(id)
        if (el) observer.observe(el)
      })
    })

    return () => observer.disconnect()
  }, [groups])

  // 📌 滑鼠拖曳事件綁定
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingGroupId) return
      const deltaX = e.clientX - startMousePos.x
      const deltaY = e.clientY - startMousePos.y
      updateGroupAndMemberPositions(deltaX, deltaY)
      setStartMousePos({ x: e.clientX, y: e.clientY })
    }

    const handleMouseUp = () => setDraggingGroupId(null)

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [draggingGroupId, startMousePos, moveGroup, groups, windows])

  return (
    <>
      {groups.map(group => {
        const members = group.memberIds
          .map(id => {
            const el = document.getElementById(id)
            if (!el) return null
            const rect = el.getBoundingClientRect()
            return {
              id,
              x: rect.left,
              y: rect.top,
              width: rect.width,
              height: rect.height
            }
          })
          .filter((w): w is FloatingWindow => !!w)
          if (members.length < 2) return null

        const buffer = 20
        const minX = Math.min(...members.map(w => w.x))
        const minY = Math.min(...members.map(w => w.y))
        const maxX = Math.max(...members.map(w => w.x + w.width))
        const maxY = Math.max(...members.map(w => w.y + w.height))

        return (
          <div
            key={group.id}
            id={`group-${group.id}`}
            onMouseDown={e => {
              e.stopPropagation()
              setDraggingGroupId(group.id)
              setStartMousePos({ x: e.clientX, y: e.clientY })
            }}
            className="group-window"
            style={{
              position: 'fixed',
              left: minX - buffer,
              top: minY - buffer,
              width: maxX - minX + buffer * 2,
              height: maxY - minY + buffer * 2,
              border: '2px dashed gray',
              borderRadius: '12px',
              backgroundColor: 'rgba(255,255,255,0.4)',
              cursor: 'move',
              zIndex: 1,
              display: 'flex',
              alignItems: 'start',
              justifyContent: 'center',
              pointerEvents: 'auto',
              fontSize: '12px',
              fontWeight: 'bold',
              color: 'gray'
            }}
          >
            <div style={{
              marginTop: '-10px',
              background: 'white',
              padding: '0 8px',
              borderRadius: '8px'
            }}>
              群組
            </div>
          </div>
        )
      })}
    </>
  )
}
