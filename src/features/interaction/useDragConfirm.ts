// hooks/useDragConfirm.ts
'use client'

import { useState, useRef, useEffect } from 'react'

interface DragZoneOptions {
  onConfirm: () => void
  onCancel?: () => void
}

export function useDragConfirm(options: DragZoneOptions) {
  const [isDragActive, setIsDragActive] = useState(false)
  const triggerButtonRef = useRef<HTMLButtonElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)
  
  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation()
    e.dataTransfer.setData('dragConfirm', 'true')
    e.currentTarget.classList.add('opacity-50')
  }
  
  const handleDragEnd = (e: React.DragEvent) => {
    if (e.target && 'classList' in e.target) {
      (e.target as HTMLElement).classList.remove('opacity-50')
    }
    setTimeout(() => {
      setIsDragActive(false)
    }, 300)
    options.onCancel?.()
  }
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.add('bg-red-100')
  }
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('bg-red-100')
  }
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.remove('bg-red-100')
    
    const isDragConfirm = e.dataTransfer.getData('dragConfirm') === 'true'
    if (isDragConfirm) {
      options.onConfirm()
      setIsDragActive(false)
    }
  }
  
  useEffect(() => {
    if (isDragActive && triggerButtonRef.current && dropZoneRef.current) {
      const updateDropZonePosition = () => {
        const buttonRect = triggerButtonRef.current?.getBoundingClientRect()
        
        if (buttonRect && dropZoneRef.current) {
          dropZoneRef.current.style.left = `${buttonRect.right + 10}px`
          dropZoneRef.current.style.top = `${buttonRect.top}px`
        }
      }
      
      updateDropZonePosition()
      window.addEventListener('resize', updateDropZonePosition)
      
      return () => {
        window.removeEventListener('resize', updateDropZonePosition)
      }
    }
  }, [isDragActive])
  
  return {
    isDragActive,
    setIsDragActive,
    triggerButtonRef,
    dropZoneRef,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop
  }
}