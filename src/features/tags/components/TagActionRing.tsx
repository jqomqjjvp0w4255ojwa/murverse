'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useTagCollectionStore } from '@/features/tags/store/useTagCollectionStore'
import { useFragmentsStore } from '@/features/fragments/store/useFragmentsStore'
import { TagsService } from '@/features/tags/services/TagsService'

interface TagActionRingProps {
  tag: string
  position: { x: number; y: number }
  onClose: () => void
  onOpenDetail: (tag: string) => void
  onDeleteTag?: (tag: string) => void
  fragmentId?: string
}

// 定義行動選項
interface ActionOption {
  icon: string
  label: string
  action: () => void
  isDisabled?: boolean
  isHighlighted?: boolean
}

const TagActionRing: React.FC<TagActionRingProps> = ({
  tag,
  position,
  onClose,
  onOpenDetail,
  onDeleteTag,
  fragmentId
}) => {
  const { isCollected, addTag, removeTag } = useTagCollectionStore()
  const { fragments } = useFragmentsStore()
  const alreadyCollected = isCollected(tag);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [isRemovingFromThisFragment, setIsRemovingFromThisFragment] = useState(false)
  const ringRef = useRef<HTMLDivElement>(null)
  
  // 計算此標籤在幾個片段中出現
  const fragmentsWithTag = fragments.filter(f => f.tags.includes(tag)).length

  // 處理標籤詳情打開 - 直接調用onOpenDetail
  const handleOpenDetail = () => {
    onOpenDetail(tag)
  }

  // 根據標籤定義選項 - 移除"刪除所有標籤"選項
  const options: ActionOption[] = [
    { 
      icon: '🔍', 
      label: '查看', 
      action: handleOpenDetail
    },
    { 
      icon: alreadyCollected ? '⭐' : '☆', 
      label: alreadyCollected ? '已擁有' : '收錄', 
      action: () => {
        if (!alreadyCollected) {
          addTag(tag)
        } else {
          removeTag(tag)
        }
        onClose()
      },
      isDisabled: false,
      isHighlighted: !alreadyCollected
    },
    { 
      icon: '✂️', 
      label: '移除', 
      action: () => {
        if (fragmentId) {
          setIsRemovingFromThisFragment(true)
        } else {
          console.warn('無法移除：未提供碎片ID')
          onClose()
        }
      },
      isDisabled: !fragmentId,
      isHighlighted: false
    }
  ]

  // 環形佈局的半徑
  const RING_RADIUS = 60
  const OPTION_SIZE = 44
  
  // 點擊外部關閉 - 修改為事件捕獲階段，確保先捕獲到事件
  useEffect(() => {
    // 使用事件捕獲
    const handleClickOutside = (e: MouseEvent) => {
      if (ringRef.current && !ringRef.current.contains(e.target as Node)) {
        // 阻止事件繼續傳播，防止觸發碎片點擊
        e.stopPropagation();
        e.preventDefault();
        
        if (isRemovingFromThisFragment) {
          setIsRemovingFromThisFragment(false);
        } else {
          onClose();
        }
      }
    };
    
    // 第三個參數 true 代表在捕獲階段監聽
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [onClose, isRemovingFromThisFragment]);

  // 監聽滾動事件，滾動時關閉行動環
  useEffect(() => {
    const handleScroll = () => {
      if (isRemovingFromThisFragment) {
        setIsRemovingFromThisFragment(false);
      }
      onClose();
    };
    
    // 添加滾動事件監聽
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [onClose, isRemovingFromThisFragment]);

  // 監聽滾輪事件 (wheel)，滾輪滾動時關閉行動環
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (isRemovingFromThisFragment) {
        setIsRemovingFromThisFragment(false);
      }
      onClose();
    };
    
    // 添加滾輪事件監聽，使用捕獲階段
    window.addEventListener('wheel', handleWheel, true);
    return () => window.removeEventListener('wheel', handleWheel, true);
  }, [onClose, isRemovingFromThisFragment]);

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
          if (selectedIndex !== null) {
            options[selectedIndex].action()
          }
          break
        case 'Escape':
          e.preventDefault()
          if (isRemovingFromThisFragment) {
            setIsRemovingFromThisFragment(false)
          } else {
            onClose()
          }
          break
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [options, selectedIndex, isRemovingFromThisFragment, onClose])

  // 當從當前碎片中移除標籤
  const handleRemoveFromThisFragment = () => {
    if (!fragmentId) return
    
    // 從當前碎片中移除標籤
    const result = TagsService.removeTagFromFragment(fragmentId, tag)
    console.log(`✂️ ${result.message || '已從當前碎片移除標籤'}`)
    onClose()
  }

  // 如果未收藏，自動添加（單用戶模式下）
  useEffect(() => {
    if (!alreadyCollected) {
      console.log(`發現未收藏標籤: ${tag}，自動添加到收藏`);
      addTag(tag);
    }
  }, [tag, alreadyCollected, addTag]);

  return (
    <>
      {/* 背景遮罩層 - 用於攔截點擊，但完全透明 */}
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
        {/* 黑色底盤效果 - 環形下方 */}
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

        {/* 新增: 右上角關閉按鈕 */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          style={{
            position: 'absolute',
            top: '34px', left: '0px',
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
            zIndex: 2502,  // 確保在最上層
            pointerEvents: 'auto',
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
            padding: 0,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
            e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
            e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)';
          }}
        >
          ✕
        </button>

        {/* 標籤資訊小提示 - 分兩行顯示 */}
        <div
          style={{
            position: 'absolute',
            top: '-2rem', // 改用 rem (50px)
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: '0.375rem 0.75rem', // 改用 rem
            borderRadius: '1rem', // 改用 rem
            fontSize: '0.75rem', // 改用 rem
            color: 'white',
            whiteSpace: 'nowrap',
            zIndex: 2501,
            pointerEvents: 'auto',
            animation: 'fadeIn 0.3s ease-out',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.125rem', // 改用 rem
          }}
        >
          <span style={{ fontWeight: 'bold' }}>{tag}</span>
          <span style={{ fontSize: '0.625rem', opacity: 0.8 }}>({fragmentsWithTag}個碎片)</span>
        </div>
        
        {/* 確認從此碎片移除標籤 */}
        {isRemovingFromThisFragment && (
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
            onClick={(e) => e.stopPropagation()} // 防止點擊傳遞
          >
            <div style={{ color: '#333', marginBottom: '10px', fontWeight: 500 }}>
              移除標籤「{tag}」？
            </div>
            <div style={{ color: '#888', fontSize: '13px', marginBottom: '15px' }}>
              僅從<strong>當前碎片</strong>中移除此標籤。
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsRemovingFromThisFragment(false)
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
                取消
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemoveFromThisFragment()
                }}
                style={{
                  flex: 1,
                  backgroundColor: '#f79d41',
                  color: 'white',
                  border: 'none',
                  padding: '8px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                確認移除
              </button>
            </div>
          </div>
        )}

        {/* 環形選項 */}
        {options.map((option, index) => {
          // 計算環形位置
          const angle = (2 * Math.PI * index) / options.length - Math.PI / 2
          const left = Math.cos(angle) * RING_RADIUS
          const top = Math.sin(angle) * RING_RADIUS
          
          // 判斷是否為選中狀態
          const isSelected = selectedIndex === index
          
          return (
            <div
              key={option.label}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation() // 防止事件冒泡到背景層
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

      {/* 添加動畫樣式 */}
      <style jsx global>{`
        @keyframes popIn {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
          70% { transform: translate(-50%, -50%) scale(1.1); }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: translate(-50%, -150%) scale(0.8); }
          to { opacity: 1; transform: translate(-50%, -150%) scale(1); }
        }
      `}</style>
    </>
  )
}

export default TagActionRing