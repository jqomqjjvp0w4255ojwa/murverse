//FragmentsRepository.ts

'use client'

import { Fragment } from '../types/fragment'
import { STORAGE_KEY } from '../constants'
import { decideDirection } from '../utils'

/**
 * 豐富碎片數據（填充預設值）
 */
function enrichFragment(f: Fragment): Fragment {
  if (!f.direction) {
    return {
      ...f,
      direction: decideDirection(f.content, f.notes?.[0]?.value, false), // 存儲時使用確定性邏輯
      showContent: true,
      showNote: true,
      showTags: true,
    }
  }
  return f
}

/**
 * 儲存碎片資料到 localStorage
 */
export const saveFragments = (fragments: Fragment[]) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fragments))
}

/**
 * 從 localStorage 載入碎片資料
 */
export const loadFragments = (): Fragment[] => {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(STORAGE_KEY)
  if (!data) return []
  try {
    const parsed = JSON.parse(data) as Fragment[]
    return parsed.map(enrichFragment)
  } catch (error) {
    console.error('Error parsing fragments:', error)
    return []
  }
}

/**
 * 匯出碎片資料到檔案
 */
export const exportFragments = (fragments: Fragment[]) => {
  if (typeof window === 'undefined') return
  const blob = new Blob([JSON.stringify(fragments, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'murverse_fragments.json'
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * 從檔案匯入碎片資料
 */
export const importFragments = (file: File): Promise<Fragment[]> => {
  if (typeof window === 'undefined') 
    return Promise.reject(new Error('Cannot import fragments on server side'))

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const json = JSON.parse(text)
        if (Array.isArray(json)) {
          const enriched = json.map(enrichFragment)
          resolve(enriched)
        } else {
          reject(new Error('Invalid fragment format'))
        }
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = (error) => reject(error)
    reader.readAsText(file)
  })
}