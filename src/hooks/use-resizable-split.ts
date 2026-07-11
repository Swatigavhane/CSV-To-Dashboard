import { useState, useRef, useEffect } from 'react';

export interface UseResizableSplitOptions {
  initialLeftWidth?: number;
  minLeft?: number;
  minRight?: number;
}

export function useResizableSplit({
  initialLeftWidth = 50,
  minLeft = 20,
  minRight = 20,
}: UseResizableSplitOptions = {}) {
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dragging) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const nextWidth = ((event.clientX - rect.left) / rect.width) * 100;
      const rightWidth = 100 - nextWidth;

      if (nextWidth < minLeft || rightWidth < minRight) {
        return;
      }

      setLeftWidth(nextWidth);
    };

    const stopDragging = () => setDragging(false);

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', stopDragging);

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', stopDragging);
    };
  }, [dragging, minLeft, minRight]);

  const onPointerDown = () => setDragging(true);

  return {
    containerRef,
    leftWidth,
    onPointerDown,
  };
}
