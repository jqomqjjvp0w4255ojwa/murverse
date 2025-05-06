'use client'

import { Fragment } from '@/features/fragments/types/fragment'

const STORAGE_KEY = 'murverse_fragments'

function decideDirection(content: string, note?: string): 'horizontal' | 'vertical' {
  const full = `${content} ${note ?? ''}`
  const hasEnglish = /[a-zA-Z]/.test(full)
  const isOnlyCJK = /^[\u4e00-\u9fa5\u3040-\u30ff\s]+$/.test(full)

  // Remove the random condition and make it deterministic:
  if (hasEnglish || /\d/.test(full) || /[{}[\]()=;:]/.test(full)) return 'horizontal'
  if (isOnlyCJK) return 'vertical' // Removed Math.random() < 0.3 condition
  return 'horizontal'
}

function enrichFragment(f: Fragment): Fragment {
  if (!f.direction) {
    return {
      ...f,
      direction: decideDirection(f.content, f.notes?.[0]?.value),
      showContent: true,
      showNote: true,
      showTags: true,
    }
  }
  return f
}

export const saveFragments = (fragments: Fragment[]) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fragments))
}

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