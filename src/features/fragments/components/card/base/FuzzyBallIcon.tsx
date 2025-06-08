import React from 'react'
import classNames from 'classnames'

interface FuzzyBallIconProps {
  size?: number
  color?: string
  isHovered?: boolean
  variant?: 'none' | 'breathe' | 'pulse' | 'hoverScale' | 'sway' | 'loading' | 'failed' | 'swing'
}

const FuzzyBallIcon: React.FC<FuzzyBallIconProps> = ({
  size = 16,
  color = '#d1b684',
  isHovered = false,
  variant = 'none'
}) => {
  const lineCount = 12
  const radius = size / 2
  const innerRadius = radius * 0.6
  const baseLength = radius * 0.2
  const expandedLength = baseLength + 1.5

  const getLineColor = () => {
    if (variant === 'failed') return '#ef4444'
    return color
  }

  const containerClass = classNames({
    'fuzzy-breathe': variant === 'breathe' && isHovered,
    'fuzzy-pulse': variant === 'pulse' && isHovered,
    'fuzzy-hover': variant === 'hoverScale' && isHovered,
    'fuzzy-sway': variant === 'sway',
    'fuzzy-loading': variant === 'loading',
    'fuzzy-failed': variant === 'failed',
    'fuzzy-swing': variant === 'swing',
  })

  const eyeSize = size * 0.08
  const eyeSpacing = size * 0.12 // 雙眼間距

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
      {/* 毛刺 */}
      {[...Array(lineCount)].map((_, i) => {
        const angle = (360 / lineCount) * i
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: `${radius}px`,
              left: `${radius}px`,
              width: `${isHovered ? expandedLength : baseLength}px`,
              height: isHovered ? '1.5px' : '1px',
              backgroundColor: getLineColor(),
              opacity: isHovered ? 1 : 0.8,
              borderRadius: '1px',
              transform: `rotate(${angle}deg) translateX(${innerRadius}px)`,
              transformOrigin: 'center',
              transition: variant === 'failed' ? 'none' : 'all 0.25s ease-out',
            }}
          />
        )
      })}

      {/* 👁️ 眼睛（尖尖形狀 + 精準置中） */}
        <div
          style={{
            position: 'absolute',
            top: `${radius - eyeSize / 2}px`,
            left: `${radius}px`,
            transform: 'translate(-40%, -50%)',
            display: 'flex',
            gap: `${eyeSpacing}px`,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {/* 左眼 */}
          <div
            style={{
              width: `${eyeSize}px`,
              height: `${eyeSize * 1.2}px`, // 高一點拉出眼角感
              backgroundColor: getLineColor(),
              clipPath: 'ellipse(50% 40% at 50% 50%)',
            }}
          />

          {/* 右眼 */}
          <div
            style={{
              width: `${eyeSize}px`,
              height: `${eyeSize * 1.2}px`,
              backgroundColor: getLineColor(),
              clipPath: 'ellipse(50% 40% at 50% 50%)',
            }}
          />
        </div>

    </div>
  )
}

export default FuzzyBallIcon
