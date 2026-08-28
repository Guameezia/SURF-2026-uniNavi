import { useCallback, useEffect, useRef, useState } from "react";

interface PanZoom {
  scale: number;
  translate: { x: number; y: number };
}

interface UseTwoFingerPanZoomOptions {
  minScale?: number;
  maxScale?: number;
  enabled?: boolean;
}

interface TouchPoint {
  clientX: number;
  clientY: number;
}

function touchDistance(touches: TouchPoint[]): number {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

function touchMidpoint(touches: TouchPoint[]): { x: number; y: number } {
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  };
}

function toTouchPoints(touches: { length: number; [index: number]: TouchPoint }): TouchPoint[] {
  return [touches[0], touches[1]];
}

export function useTwoFingerPanZoom({
  minScale = 0.5,
  maxScale = 2.5,
  enabled = true,
}: UseTwoFingerPanZoomOptions = {}) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isGesturing, setIsGesturing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const panZoomRef = useRef<PanZoom>({ scale: 1, translate: { x: 0, y: 0 } });
  const gestureRef = useRef<{
    startDist: number;
    startScale: number;
    startTranslate: { x: number; y: number };
    startMid: { x: number; y: number };
  } | null>(null);

  const clampScale = useCallback(
    (value: number) => Math.min(maxScale, Math.max(minScale, value)),
    [minScale, maxScale]
  );

  useEffect(() => {
    panZoomRef.current = { scale, translate };
  }, [scale, translate]);

  const resetView = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    gestureRef.current = null;
    setIsGesturing(false);
  }, []);

  const zoomBy = useCallback(
    (delta: number) => {
      setScale((s) => clampScale(s + delta));
    },
    [clampScale]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || e.touches.length !== 2) return;
      const points = toTouchPoints(e.touches);
      const startDist = touchDistance(points);
      if (startDist < 1) return;
      const { scale: s, translate: t } = panZoomRef.current;
      gestureRef.current = {
        startDist,
        startScale: s,
        startTranslate: { ...t },
        startMid: touchMidpoint(points),
      };
      setIsGesturing(true);
    },
    [enabled]
  );

  const endGesture = useCallback((touches: { length: number }) => {
    if (touches.length >= 2) return;
    gestureRef.current = null;
    setIsGesturing(false);
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      endGesture(e.touches);
    },
    [endGesture]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !enabled) return;

    const onTouchMove = (e: TouchEvent) => {
      const gesture = gestureRef.current;
      if (!gesture || e.touches.length !== 2) return;
      e.preventDefault();

      const points = toTouchPoints(e.touches);
      const dist = touchDistance(points);
      const mid = touchMidpoint(points);
      const ratio = dist / gesture.startDist;

      setScale(clampScale(gesture.startScale * ratio));
      setTranslate({
        x: gesture.startTranslate.x + (mid.x - gesture.startMid.x),
        y: gesture.startTranslate.y + (mid.y - gesture.startMid.y),
      });
    };

    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, [enabled, clampScale]);

  return {
    containerRef,
    scale,
    translate,
    isGesturing,
    resetView,
    zoomBy,
    handleTouchStart,
    handleTouchEnd,
    handleTouchCancel: handleTouchEnd,
  };
}
