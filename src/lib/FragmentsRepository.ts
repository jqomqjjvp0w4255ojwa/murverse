// src/lib/FragmentsRepository.ts
'use client'


import { Fragment } from '@/types/fragment'

const STORAGE_KEY = 'murverse_fragments'

export const saveFragments = (fragments: Fragment[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fragments))
}

export const loadFragments = (): Fragment[] => {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(STORAGE_KEY)
  if (!data) return []
  try {
    return JSON.parse(data) as Fragment[]
  } catch (error) {
    console.error('Error parsing fragments:', error)
    return []
  }
}

export const exportFragments = (fragments: Fragment[]) => {
  const blob = new Blob([JSON.stringify(fragments, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'murverse_fragments.json'
  a.click()
  URL.revokeObjectURL(url)
}

export const importFragments = (file: File): Promise<Fragment[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const json = JSON.parse(text)
        if (Array.isArray(json)) {
          resolve(json as Fragment[])
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
