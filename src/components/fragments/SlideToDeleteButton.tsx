// components/fragments/SlideToDeleteButton.tsx
import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';

interface SlideToDeleteButtonProps {
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  trackWidth?: number;
  position?: { x: number; y: number }; // 僅在 usePortal 為 true 時需要
  usePortal?: boolean; // 是否使用 Portal，預設 true
}

const SlideToDeleteButton: React.FC<SlideToDeleteButtonProps> = ({
  onConfirm,
  onCancel,
  confirmText = '滑動確認刪除',
  trackWidth = 150,
  position,
  usePortal = true,
}) => {
  const [pos, setPos] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [remainingTime, setRemainingTime] = useState(3);
  const cancelTimer = useRef<NodeJS.Timeout | null>(null);
  const countdownTimer = useRef<NodeJS.Timeout | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const max = trackWidth - 40;

  useEffect(() => {
    setRemainingTime(3);
    cancelTimer.current = setTimeout(() => {
      onCancel?.();
    }, 3000);

    countdownTimer.current = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimer.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(cancelTimer.current!);
      clearInterval(countdownTimer.current!);
    };
  }, []);

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
  };

  const handleDragMove = (e: MouseEvent) => {
    if (!trackRef.current) return;
    const trackRect = trackRef.current.getBoundingClientRect();
    const newX = Math.max(0, Math.min(e.clientX - trackRect.left, max));
    setPos(newX);
    if (newX >= max * 0.9) {
      setPos(max);
      handleConfirm();
      handleDragEnd();
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    window.removeEventListener('mousemove', handleDragMove);
    window.removeEventListener('mouseup', handleDragEnd);
    if (pos < max * 0.9) setPos(0);
  };

  const handleConfirm = () => {
    onConfirm();
  };

  const content = (
    <div
      ref={trackRef}
      style={{
        ...(usePortal && position
          ? {
              position: 'absolute',
              top: `${position.y}px`,
              left: `${position.x}px`,
              zIndex: 9999,
              width: `${trackWidth}px`,
            }
          : {
              position: 'relative',
              width: `${trackWidth}px`,
            }),
      }}
      className="h-8 bg-red-100 rounded-full overflow-hidden"
      onDragStart={(e) => e.preventDefault()}
    >
      <div
        className="absolute inset-0 bg-red-300 rounded-full"
        style={{
          width: `${(pos / max) * 100}%`,
          transition: 'width 0.2s',
        }}
      />
      <div
        className="absolute top-1 left-1 w-6 h-6 bg-red-500 rounded-full cursor-grab shadow-md flex items-center justify-center text-white"
        style={{
          left: `${pos}px`,
          transition: isDragging ? 'none' : 'left 0.2s',
        }}
        onMouseDown={handleDragStart}
        onDragStart={(e) => e.preventDefault()}
      >
        →
      </div>
      <div className="absolute inset-0 flex items-center justify-center text-red-700 text-xs pointer-events-none">
        {confirmText} ({remainingTime})
      </div>
    </div>
  );

  return usePortal && position ? ReactDOM.createPortal(content, document.body) : content;
};

export default SlideToDeleteButton;
