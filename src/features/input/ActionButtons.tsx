// components/fragments/ActionButtons.tsx
/**
 * ActionButtons.tsx
 *
 * 📌 用途說明：
 * 提供輸入介面（例如 FloatingInputBar）下方的操作按鈕區域，
 * 包含「儲存」與「清除」兩個主要動作。
 *
 * 🧩 功能特色：
 * - 儲存按鈕：執行傳入的 `onSubmit` callback。
 * - 清除按鈕：點擊後顯示 `SlideToDeleteButton` 元件，需滑動確認才會觸發 `onClear`。
 * - 在全螢幕模式下，會顯示總字數統計。
 * - 提供 `clearButtonRef` 可供連接動畫或位置定位。
 *
 * ✅ 使用場景：
 * - 嵌入於 FloatingInputBar 的底部操作列中。
 */


'use client'

import React, { RefObject, useState } from 'react';
import SlideToDeleteButton from '../../features/interaction/SlideToDeleteButton';

interface ActionButtonsProps {
  isFullScreen: boolean;
  totalCharCount: number;
  clearDragActive: boolean;
  // 修改类型定义，允许为 null
  clearButtonRef: RefObject<HTMLButtonElement> | null;
  onSubmit: () => void;
  onClear: () => void;
  onClearDragStart: (e: React.DragEvent) => void;
  onClearDragEnd: (e: React.DragEvent) => void;
}

export default function ActionButtons({
  isFullScreen,
  totalCharCount,
  clearButtonRef,
  onSubmit,
  onClear,
}: ActionButtonsProps) {
  const [confirmingClear, setConfirmingClear] = useState(false);

  return (
    <>
      <div className={isFullScreen ? "absolute bottom-5 left-0 right-0 px-6 flex items-center" : "flex gap-4 justify-center mt-4"}>
        <div className="flex-1" />

        <div className="flex gap-4 justify-center">
          <button
            className="px-4 py-1 bg-green-600 text-white rounded text-sm"
            onClick={onSubmit}
          >
            儲存
          </button>

          {confirmingClear ? (
            <SlideToDeleteButton
              trackWidth={120}
              confirmText="滑動清除"
              usePortal={false}
              onCancel={() => setConfirmingClear(false)}
              onConfirm={() => {
                onClear();
                setConfirmingClear(false);
              }}
            />
          ) : (
            <button
              className="px-4 py-1 bg-gray-400 text-white rounded text-sm"
              onClick={() => setConfirmingClear(true)}
            >
              清除
            </button>
          )}
        </div>

        {isFullScreen && (
          <div className="flex-1 text-right text-xs text-gray-500 pr-1">
            {`總字數：${totalCharCount}`}
          </div>
        )}
      </div>
    </>
  );
}