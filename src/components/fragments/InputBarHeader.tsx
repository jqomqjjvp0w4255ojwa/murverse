// components/fragments/InputBarHeader.tsx
import React from 'react'

interface InputBarHeaderProps {
  isFullScreen: boolean
  onCollapse: () => void
  onToggleFullScreen: () => void
}

export default function InputBarHeader({
  isFullScreen,
  onCollapse,
  onToggleFullScreen
}: InputBarHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-2">
      <div className="text-sm font-medium text-gray-700">碎片</div>
      <div className="flex items-center gap-2">
        <button
          onClick={onCollapse}
          className="w-6 h-6 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
        <button
          onClick={onToggleFullScreen}
          className="w-6 h-6 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
        >
          {isFullScreen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3v3a2 2 0 0 1-2 2H3"></path>
              <path d="M21 8h-3a2 2 0 0 1-2-2V3"></path>
              <path d="M3 16h3a2 2 0 0 1 2 2v3"></path>
              <path d="M16 21v-3a2 2 0 0 1 2-2h3"></path>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9"></polyline>
              <polyline points="9 21 3 21 3 15"></polyline>
              <line x1="21" y1="3" x2="14" y2="10"></line>
              <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}