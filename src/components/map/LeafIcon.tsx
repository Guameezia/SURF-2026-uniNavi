import { useId, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import type { LeafNoteIconId, LeafNoteStatus, LeafNoteTagId } from "../../types/leafNote";
import { getIconEmoji } from "../../utils/leafNoteIcons";
import { getStatusLabel, getTagDef } from "../../utils/leafNoteTags";
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
  iconId?: LeafNoteIconId;
  tags?: LeafNoteTagId[];
  status?: LeafNoteStatus;
  helpfulCount?: number;
  isHeating?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export function LeafMarker({
  x,
  y,
  text,
  iconId = "leaf",
  tags = [],
  status = "active",
  helpfulCount = 0,
  isHeating = false,
  onClick,
}: LeafMarkerProps) {
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

  const likeLabel =
    helpfulCount > 99 ? "99+" : String(helpfulCount);
  const badgeWidth = Math.max(26, 16 + likeLabel.length * 6);

  return (
    <>
      <g
        className={`leaf-note-marker${status !== "active" ? " leaf-note-marker--muted" : ""}`}
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
        <circle r={14} fill="rgba(255,255,255,0.85)" stroke="#c8e6c9" strokeWidth="1" />
        <text
          className="leaf-note-marker-emoji"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="15"
          y={1}
        >
          {getIconEmoji(iconId)}
        </text>
        <g className="leaf-note-marker-like" transform="translate(12, -10)">
          <rect
            className="leaf-note-marker-like-bg"
            x={0}
            y={0}
            width={badgeWidth}
            height={16}
            rx={8}
            ry={8}
          />
          <text
            className="leaf-note-marker-like-text"
            x={badgeWidth / 2}
            y={11}
            textAnchor="middle"
            fontSize="9"
          >
            ♥{likeLabel}
          </text>
        </g>
        {isHeating && (
          <g className="leaf-note-marker-heating" transform="translate(-18, -10)">
            <rect x={0} y={0} width={28} height={14} rx={7} ry={7} />
            <text x={14} y={10} textAnchor="middle" fontSize="8">
              🔥升温
            </text>
          </g>
        )}
      </g>

      {hovered &&
        createPortal(
          <div
            className="leaf-note-tooltip"
            style={{ left: tooltipPos.x + 14, top: tooltipPos.y - 8 }}
            role="tooltip"
          >
            {tags.length > 0 && (
              <div className="leaf-note-tooltip-tags">
                {tags.slice(0, 3).map((id) => (
                  <span
                    key={id}
                    className="leaf-note-tooltip-tag"
                    style={{ color: getTagDef(id).color }}
                  >
                    #{getTagDef(id).label}
                  </span>
                ))}
              </div>
            )}
            <span className="leaf-note-tooltip-label">
              {status !== "active" ? getStatusLabel(status) : "便签"}
            </span>
            <p className="leaf-note-tooltip-text">{truncateText(text, 120)}</p>
            <span className="leaf-note-tooltip-hint">
              有用 {helpfulCount} · 点击查看
            </span>
          </div>,
          document.body
        )}
    </>
  );
}
