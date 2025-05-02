// components/fragments/ActionButtons.tsx
'use client'

import React, { RefObject, useState } from 'react';
import SlideToDeleteButton from './SlideToDeleteButton';

interface ActionButtonsProps {
  isFullScreen: boolean;
  totalCharCount: number;
  clearDragActive: boolean;
  clearButtonRef: RefObject<HTMLButtonElement | null>;
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
