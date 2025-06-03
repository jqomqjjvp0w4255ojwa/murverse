// components/fragments/SlideToDeleteButton.tsx
/**
 * SlideToDeleteButton.tsx
 *
 * 📌 用途說明：
 * 這是一個互動式「滑動確認刪除」按鈕元件，適合用於避免意外點擊刪除操作。
 * 使用者必須拖動滑塊到最右邊才能觸發刪除，具備倒數取消與動畫提示。
 *
 * 🧩 功能特色：
 * - 拖曳滑塊至右側觸發 `onConfirm`
 * - 倒數 3 秒未操作則自動取消（呼叫 `onCancel`）
 * - 可選擇是否使用 Portal（浮動顯示於指定畫面座標）
 * - 自定義寬度、確認文字、位置與樣式
 *
 * ✅ 使用場景範例：
 * - 刪除筆記、碎片、標籤時的安全確認
 * - 結合浮動元件或 tooltip 類提示
 */



'use client'

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
    style={{
      ...(usePortal && position
        ? {
            position: 'absolute',
            top: `${position.y}px`,
            left: `${position.x}px`,
            zIndex: 9999,
          }
        : {
            position: 'relative',
          }),
    }}
  >
    {/* ⬅️ 取消按鈕（右上角） */}
    {onCancel && (
      <button
        onClick={onCancel}
        className="absolute -top-4 -right-2 text-gray-400 hover:text-gray-600 text-sm"
        style={{ zIndex: 10000 }}
      >
        ×
      </button>
    )}

    {/* 滑動區域 */}
    <div
      ref={trackRef}
      className="h-8 bg-red-100 rounded-full overflow-hidden relative"
      style={{
        width: `${trackWidth}px`,
      }}
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
  </div>
);

  return usePortal && position ? ReactDOM.createPortal(content, document.body) : content;
};

export default SlideToDeleteButton;
