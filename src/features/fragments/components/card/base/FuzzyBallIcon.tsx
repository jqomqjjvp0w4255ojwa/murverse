import React from 'react'

interface FuzzyBallIconProps {
  size?: number
  color?: string
  isHovered?: boolean
}

const FuzzyBallIcon: React.FC<FuzzyBallIconProps> = ({
  size = 16,
  color = '#d1b684',
  isHovered = false
}) => {
  const lineCount = 12
  const radius = size * 0.5
  const innerRadius = radius * 0.6
  const outerRadius = radius
  const lineLength = outerRadius - innerRadius

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        position: 'relative',
        transform: isHovered ? 'scale(1.3) rotate(5deg)' : 'scale(1) rotate(0)',
        transition: 'transform 0.3s cubic-bezier(0.33, 1, 0.68, 1)', // 🌀 蓬鬆感
      }}
    >
      {[...Array(lineCount)].map((_, i) => {
        const angle = (360 / lineCount) * i

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: isHovered ? `${lineLength + 1}px` : `${lineLength}px`,
              height: isHovered ? '1.5px' : '1px',
              backgroundColor: color,
              top: '50%',
              left: '50%',
              opacity: isHovered ? 1 : 0.8,
              borderRadius: '1px',
              transformOrigin: `${-innerRadius}px 50%`,
              transform: `translate(${-innerRadius}px, -50%) rotate(${angle}deg)`,
              transition: 'all 0.25s ease-out',
            }}
          />
        )
      })}
    </div>
  )
}

export default FuzzyBallIcon
