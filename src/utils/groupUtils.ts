// groupUtils.ts

'use client'

export const GROUP_DISTANCE_THRESHOLD = 1000

export function getDistance(rectA: DOMRect, rectB: DOMRect): number {
  const centerAX = rectA.left + rectA.width / 2
  const centerAY = rectA.top + rectA.height / 2
  const centerBX = rectB.left + rectB.width / 2
  const centerBY = rectB.top + rectB.height / 2

  const dx = centerAX - centerBX
  const dy = centerAY - centerBY

  return Math.sqrt(dx * dx + dy * dy)
}

export function isRectOverlap(a: DOMRect, b: DOMRect, padding = 0): boolean {
  return !(
    a.right < b.left - padding ||
    a.left > b.right + padding ||
    a.bottom < b.top - padding ||
    a.top > b.bottom + padding
  )
}

// ✅ 統一判斷一個視窗是否離其他視窗太遠
export function isTooFarFromGroup(rectA: DOMRect, others: DOMRect[], threshold = GROUP_DISTANCE_THRESHOLD): boolean {
  return others.every(rectB => getDistance(rectA, rectB) > threshold)
}
