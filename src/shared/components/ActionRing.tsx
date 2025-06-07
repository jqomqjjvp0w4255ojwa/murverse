'use client'
// 📄 src/components/ui/ActionRing.tsx

import React, { useState, useEffect, useRef } from 'react'


interface ActionOption {
  icon: string
  label: string
  action: () => void
  isDisabled?: boolean
  isHighlighted?: boolean
}

interface ActionRingProps {
  title: string
  subtitle?: string
  position: { x: number; y: number }
  options: ActionOption[]
  onClose: () => void
  confirmDialog?: {
    isOpen: boolean
    title: string
    description: string
    onConfirm: () => void
    onCancel: () => void
    confirmText?: string
    cancelText?: string
    confirmColor?: string
  }
}

const ActionRing: React.FC<ActionRingProps> = ({
  title,
  subtitle,
  position,
  options,
  onClose,
  confirmDialog
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  // 環形佈局的半徑和選項大小
  const RING_RADIUS = 60
  const OPTION_SIZE = 44
  
  // 點擊外部關閉 - 使用事件捕獲階段
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ringRef.current && !ringRef.current.contains(e.target as Node)) {
        e.stopPropagation()
        e.preventDefault()
        
        if (confirmDialog?.isOpen) {
          confirmDialog.onCancel()
        } else {
          onClose()
        }
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside, true)
    return () => document.removeEventListener('mousedown', handleClickOutside, true)
  }, [onClose, confirmDialog])

  // 監聽滾動事件，滾動時關閉行動環
  useEffect(() => {
    const handleScroll = () => {
      if (confirmDialog?.isOpen) {
        confirmDialog.onCancel()
      }
      onClose()
    }
    
    window.addEventListener('scroll', handleScroll, true)
    return () => window.removeEventListener('scroll', handleScroll, true)
  }, [onClose, confirmDialog])

  // 監聽滾輪事件
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (confirmDialog?.isOpen) {
        confirmDialog.onCancel()
      }
      onClose()
    }
    
    window.addEventListener('wheel', handleWheel, true)
    return () => window.removeEventListener('wheel', handleWheel, true)
  }, [onClose, confirmDialog])

  // 鍵盤操作
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!options.length) return
      
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => 
            prev === null ? 0 : (prev + 1) % options.length
          )
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => 
            prev === null ? options.length - 1 : (prev - 1 + options.length) % options.length
          )
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          if (selectedIndex !== null && !options[selectedIndex].isDisabled) {
            options[selectedIndex].action()
          }
          break
        case 'Escape':
          e.preventDefault()
          if (confirmDialog?.isOpen) {
            confirmDialog.onCancel()
          } else {
            onClose()
          }
          break
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [options, selectedIndex, confirmDialog, onClose])

  return (
    <>
      {/* 背景遮罩層 */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0)',
          zIndex: 2400,
          pointerEvents: 'auto',
        }}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onClose()
        }}
      />

      <div
        ref={ringRef}
        style={{
          position: 'fixed', 
          top: position.y,
          left: position.x,
          width: '0',
          height: '0',
          zIndex: 2500, 
          pointerEvents: 'none', 
        }}
      >
        {/* 背景光環效果 */}
        <div
          style={{
            position: 'absolute',
            top: '0',
            left: '0',
            width: `${RING_RADIUS * 2 + OPTION_SIZE}px`,
            height: `${RING_RADIUS * 2 + OPTION_SIZE}px`,
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(155, 128, 104, 0.5) 0%, rgba(0, 0, 0, 0) 70%)',
            backdropFilter: 'blur(3px)',
            pointerEvents: 'none',
            zIndex: 2499,
          }}
        />

        {/* 正下方關閉按鈕 */}
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onClose()
          }}
          style={{
            position: 'absolute',
            top: `${RING_RADIUS + OPTION_SIZE/2 + 15}px`, 
            left: '0px',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            color: 'white',
            border: 'none',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 2502,
            pointerEvents: 'auto',
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
            padding: 0,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 0, 0, 0.7)'
            e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)'
            e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)'
          }}
        >
          ✕
        </button>

        {/* 標題資訊小提示 - 置中在行動環中央 */}
        <div
          style={{
            position: 'absolute',
            top: '0',
            left: '0',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: '0.375rem 0.75rem',
            borderRadius: '1rem',
            fontSize: '0.75rem',
            color: 'white',
            whiteSpace: 'nowrap',
            zIndex: 2501,
            pointerEvents: 'none',
            animation: 'centerFadeIn 0.3s ease-out',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.125rem',
          }}
        >
          <span style={{ fontWeight: 'bold' }}>{title}</span>
          {subtitle && (
            <span style={{ fontSize: '0.625rem', opacity: 0.8 }}>{subtitle}</span>
          )}
        </div>
        
        {/* 確認對話框 */}
        {confirmDialog?.isOpen && (
          <div
            style={{
              position: 'absolute',
              top: '0',
              left: '50%',
              transform: 'translate(-50%, -150%)',
              backgroundColor: '#fff',
              padding: '15px',
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
              zIndex: 2501,
              width: '220px',
              textAlign: 'center',
              pointerEvents: 'auto',
              animation: 'scaleIn 0.2s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ color: '#333', marginBottom: '10px', fontWeight: 500 }}>
              {confirmDialog.title}
            </div>
            <div style={{ color: '#888', fontSize: '13px', marginBottom: '15px' }}>
              {confirmDialog.description}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  confirmDialog.onCancel()
                }}
                style={{
                  flex: 1,
                  backgroundColor: '#eee',
                  border: 'none',
                  padding: '8px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                {confirmDialog.cancelText || '取消'}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  confirmDialog.onConfirm()
                }}
                style={{
                  flex: 1,
                  backgroundColor: confirmDialog.confirmColor || '#f79d41',
                  color: 'white',
                  border: 'none',
                  padding: '8px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                {confirmDialog.confirmText || '確認'}
              </button>
            </div>
          </div>
        )}

        {/* 環形選項 */}
        {options.map((option, index) => {
          const angle = (2 * Math.PI * index) / options.length - Math.PI / 2
          const left = Math.cos(angle) * RING_RADIUS
          const top = Math.sin(angle) * RING_RADIUS
          const isSelected = selectedIndex === index
          
          return (
            <div
              key={option.label}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (!option.isDisabled) {
                  option.action()
                }
              }}
              onMouseEnter={() => setSelectedIndex(index)}
              style={{
                position: 'absolute',
                top: `${top}px`,
                left: `${left}px`,
                width: `${OPTION_SIZE}px`,
                height: `${OPTION_SIZE}px`,
                borderRadius: '50%',
                backgroundColor: isSelected
                  ? (option.isHighlighted ? '#ffd475' : '#f0e4c5')
                  : (option.isHighlighted ? '#fff0d0' : '#fff8e1'),
                color: option.isDisabled ? '#aaa' : '#6b4d2e',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: option.isDisabled ? 'not-allowed' : 'pointer',
                transform: `translate(-50%, -50%) ${isSelected ? 'scale(1.1)' : 'scale(1)'}`,
                transition: 'all 0.2s ease',
                boxShadow: isSelected 
                  ? '0 5px 15px rgba(0, 0, 0, 0.3), 0 0 8px 2px rgba(255, 255, 255, 0.8)' 
                  : '0 2px 8px rgba(0, 0, 0, 0.15)',
                zIndex: isSelected ? 2501 : 2500,
                pointerEvents: 'auto',
                animation: `popIn 0.3s ease-out ${index * 0.05}s both`,
                opacity: option.isDisabled ? 0.6 : 1,
              }}
            >
              <div style={{ fontSize: '16px', marginBottom: '2px' }}>{option.icon}</div>
              <div style={{ fontSize: '10px', textAlign: 'center' }}>{option.label}</div>
            </div>
          )
        })}
      </div>

      {/* 動畫樣式 */}
      <style jsx global>{`
        @keyframes popIn {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
          70% { transform: translate(-50%, -50%) scale(1.1); }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        @keyframes centerFadeIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: translate(-50%, -150%) scale(0.8); }
          to { opacity: 1; transform: translate(-50%, -150%) scale(1); }
        }
      `}</style>
    </>
  )
}

export default ActionRing