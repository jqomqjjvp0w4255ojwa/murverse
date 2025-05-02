'use client'

import React, { useRef, useEffect, useState } from 'react';

interface ScrollableCanvasProps {
  width?: number;
  height?: number;
  children: React.ReactNode;
}

const ScrollableCanvas: React.FC<ScrollableCanvasProps> = ({
  width = 4000,
  height = 3000,
  children
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const start = useRef({ x: 0, scrollX: 0 });

  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - start.current.x;
      container.scrollLeft = start.current.scrollX - dx;
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      setDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;
    isDragging.current = true;
    setDragging(true);
    start.current = {
      x: e.clientX,
      scrollX: container.scrollLeft,
    };
  };

  return (
    <div
      ref={containerRef}
      className={`w-full h-screen overflow-auto ${dragging ? 'cursor-grabbing' : 'cursor-grab'} select-none`}
      onMouseDown={handleMouseDown}
    >
      <div
        style={{ width: `${width}px`, height: `${height}px` }}
        className="relative bg-neutral-100"
      >
        {children}
      </div>
    </div>
  );
};

export default ScrollableCanvas;
