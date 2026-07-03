import {
  useRef,
  useState,
  useCallback,
  type ReactNode,
  type TouchEvent,
} from "react";

const PULL_THRESHOLD = 64;
const MAX_PULL = 96;

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

export function PullToRefresh({
  onRefresh,
  children,
  className = "",
  disabled = false,
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const pullingRef = useRef(false);
  const pullDistanceRef = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const canPull = useCallback(() => {
    const el = containerRef.current;
    return !!el && el.scrollTop <= 0;
  }, []);

  const setPull = (value: number) => {
    pullDistanceRef.current = value;
    setPullDistance(value);
  };

  const handleTouchStart = (e: TouchEvent) => {
    if (disabled || refreshing) return;
    if (!canPull()) return;
    startYRef.current = e.touches[0].clientY;
    pullingRef.current = true;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!pullingRef.current || disabled || refreshing) return;
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta <= 0) {
      setPull(0);
      return;
    }
    if (!canPull()) {
      pullingRef.current = false;
      setPull(0);
      return;
    }
    e.preventDefault();
    setPull(Math.min(delta * 0.45, MAX_PULL));
  };

  const handleTouchEnd = async () => {
    if (!pullingRef.current) return;
    pullingRef.current = false;

    const dist = pullDistanceRef.current;
    setPull(0);

    if (dist < PULL_THRESHOLD || disabled || refreshing) return;

    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleTouchCancel = () => {
    pullingRef.current = false;
    setPull(0);
  };

  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const indicatorOffset = refreshing ? 48 : pullDistance;

  return (
    <div className={`ptr-root ${className}`.trim()}>
      <div
        className="ptr-indicator"
        style={{
          height: indicatorOffset,
          opacity: refreshing || pullDistance > 0 ? 1 : 0,
        }}
        aria-live="polite"
      >
        <div
          className={`ptr-spinner${refreshing ? " ptr-spinner--active" : ""}`}
          style={{ transform: `rotate(${progress * 360}deg)` }}
        />
        <span className="ptr-label">
          {refreshing
            ? "刷新中…"
            : pullDistance >= PULL_THRESHOLD
              ? "松开刷新"
              : "下拉刷新便签"}
        </span>
      </div>

      <div
        ref={containerRef}
        className="ptr-scroll"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => void handleTouchEnd()}
        onTouchCancel={handleTouchCancel}
        style={
          pullDistance > 0 && !refreshing
            ? { transform: `translateY(${pullDistance}px)` }
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );
}
