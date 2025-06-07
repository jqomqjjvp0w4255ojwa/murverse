import React from 'react'
import classNames from 'classnames'

interface FuzzyBallIconProps {
  size?: number
  color?: string
  isHovered?: boolean
  variant?: 'none' | 'breathe' | 'pulse' | 'hoverScale' | 'sway' | 'loading' | 'failed'
}

const FuzzyBallIcon: React.FC<FuzzyBallIconProps> = ({
  size = 16,
  color = '#d1b684',
  isHovered = false,
  variant = 'none'
}) => {
  const lineCount = 12
  const radius = size * 0.5
  const innerRadius = radius * 0.6
  const outerRadius = radius
  const baseLength = outerRadius - innerRadius
  const expandedLength = baseLength + 1.5

  // 🔧 修復：根據狀態決定顏色
  const getLineColor = () => {
    if (variant === 'failed') return '#ef4444' // 紅色
    return color
  }

  // 🔧 修復：統一類名命名規則，使用 kebab-case
  const containerClass = classNames({
    'fuzzy-breathe': variant === 'breathe' && isHovered,
    'fuzzy-pulse': variant === 'pulse' && isHovered,
    'fuzzy-hover': variant === 'hoverScale' && isHovered,
    'fuzzy-sway': variant === 'sway',
    'fuzzy-loading': variant === 'loading',
    'fuzzy-failed': variant === 'failed',
  })

  return (
    <div
      className={containerClass}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        position: 'relative',
        transition: 'transform 0.3s ease',
      }}
    >
      {[...Array(lineCount)].map((_, i) => {
        const angle = (360 / lineCount) * i
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: `${isHovered ? expandedLength : baseLength}px`,
              height: isHovered ? '1.5px' : '1px',
              backgroundColor: getLineColor(),
              top: '50%',
              left: '50%',
              opacity: isHovered ? 1 : 0.8,
              borderRadius: '1px',
              transformOrigin: `${-innerRadius}px 50%`,
              transform: `translate(${-innerRadius}px, -50%) rotate(${angle}deg)`,
              transition: variant === 'failed' ? 'none' : 'all 0.25s ease-out',
            }}
          />
        )
      })}
    </div>
  )
}

export default FuzzyBallIcon