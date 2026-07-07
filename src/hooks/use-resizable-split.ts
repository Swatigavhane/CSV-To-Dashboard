import * as React from 'react';

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
  const [leftWidth, setLeftWidth] = React.useState(initialLeftWidth);
  const [dragging, setDragging] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
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
