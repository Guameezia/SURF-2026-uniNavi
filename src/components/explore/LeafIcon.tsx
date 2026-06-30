import { useId, useState, useCallback } from "react";
import { createPortal } from "react-dom";

export function LeafIcon({ size = 20 }: { size?: number }) {
  const gradId = useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="leaf-icon"
    >
      <path
        d="M12 2C8 6 4 8 4 13c0 4 3.5 7 8 9 4.5-2 8-5 8-9 0-5-4-7-8-11z"
        fill={`url(#${gradId})`}
        stroke="#2e7d32"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M12 5v14"
        stroke="#1b5e20"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.5"
      />
      <defs>
        <linearGradient id={gradId} x1="4" y1="2" x2="20" y2="22">
          <stop offset="0%" stopColor="#81c784" />
          <stop offset="100%" stopColor="#43a047" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function truncateText(text: string, maxLen: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen)}…`;
}

interface LeafMarkerProps {
  x: number;
  y: number;
  text: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function LeafMarker({ x, y, text, onClick }: LeafMarkerProps) {
  const [hovered, setHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const handleEnter = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setTooltipPos({ x: e.clientX, y: e.clientY });
    setHovered(true);
  }, []);

  const handleMove = useCallback((e: React.MouseEvent) => {
    if (!hovered) return;
    setTooltipPos({ x: e.clientX, y: e.clientY });
  }, [hovered]);

  const handleLeave = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setHovered(false);
  }, []);

  const stopBubble = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <>
      <g
        className="leaf-note-marker"
        transform={`translate(${x}, ${y})`}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(e);
        }}
        onMouseDown={stopBubble}
        onMouseEnter={handleEnter}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        style={{ cursor: "pointer" }}
      >
        <circle r={14} fill="transparent" />
        <g className="leaf-note-marker-icon" transform="translate(-10, -10)">
          <LeafIcon size={20} />
        </g>
      </g>

      {hovered &&
        createPortal(
          <div
            className="leaf-note-tooltip"
            style={{ left: tooltipPos.x + 14, top: tooltipPos.y - 8 }}
            role="tooltip"
          >
            <span className="leaf-note-tooltip-label">Leaf Note</span>
            <p className="leaf-note-tooltip-text">{truncateText(text, 120)}</p>
            <span className="leaf-note-tooltip-hint">Click to open</span>
          </div>,
          document.body
        )}
    </>
  );
}
