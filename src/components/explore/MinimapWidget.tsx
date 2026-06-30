import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import type { RoomDef } from "../../types/room";
import { FLOOR_0F_OVERVIEW } from "../../data/roomConfig";
import {
  computeLocalMinimapViewBox,
  clampMinimapZoom,
  MINIMAP_ZOOM,
  viewportForMinimapZoom,
  shiftMinimapViewBox,
} from "../../utils/minimapView";
import { useExploreStore } from "../../store/exploreStore";

interface MinimapWidgetProps {
  rooms: RoomDef[];
  currentRoomId: string;
  onBackToMap: () => void;
}

const DRAG_THRESHOLD = 4;

export function MinimapWidget({
  rooms,
  currentRoomId,
  onBackToMap,
}: MinimapWidgetProps) {
  const { width, height, imageSrc } = FLOOR_0F_OVERVIEW;
  const currentRoom = rooms.find((r) => r.id === currentRoomId);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragMovedRef = useRef(false);
  const dragStartRef = useRef({ clientX: 0, clientY: 0, panX: 0, panY: 0 });

  const minimapExpanded = useExploreStore((s) => s.minimapExpanded);
  const setMinimapExpanded = useExploreStore((s) => s.setMinimapExpanded);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [currentRoomId]);

  const baseViewBox = useMemo(() => {
    if (!currentRoom) return { x: 0, y: 0, w: width, h: height };
    const viewport = viewportForMinimapZoom(zoom);
    return computeLocalMinimapViewBox(
      width,
      height,
      currentRoom.overviewRect,
      viewport
    );
  }, [currentRoom, width, height, zoom]);

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: MouseEvent) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const scaleX = baseViewBox.w / rect.width;
      const scaleY = baseViewBox.h / rect.height;
      const dx = e.clientX - dragStartRef.current.clientX;
      const dy = e.clientY - dragStartRef.current.clientY;
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD) dragMovedRef.current = true;
      setPan({
        x: dragStartRef.current.panX - dx * scaleX,
        y: dragStartRef.current.panY - dy * scaleY,
      });
    };

    const onUp = () => setDragging(false);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, baseViewBox.w, baseViewBox.h]);

  const viewBox = useMemo(
    () => shiftMinimapViewBox(baseViewBox, pan.x, pan.y, width, height),
    [baseViewBox, pan, width, height]
  );

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta =
      e.deltaY > 0 ? -MINIMAP_ZOOM.wheelFactor : MINIMAP_ZOOM.wheelFactor;
    setZoom((z) => clampMinimapZoom(z + delta * z));
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      dragMovedRef.current = false;
      dragStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };
      setDragging(true);
    },
    [pan.x, pan.y]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (dragMovedRef.current) return;
      onBackToMap();
    },
    [onBackToMap]
  );

  const viewBoxStr = `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`;

  return (
    <div
      className={`minimap-widget${minimapExpanded ? " minimap-widget--expanded" : ""}${dragging ? " minimap-widget--dragging" : ""}`}
      onMouseEnter={() => setMinimapExpanded(true)}
      onMouseLeave={() => setMinimapExpanded(false)}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label="Floor map — click to return"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onBackToMap();
        }
      }}
    >
      <div className="minimap-widget-header">
        <span className="minimap-widget-title">Floor Map</span>
        {minimapExpanded && !dragging && (
          <span className="minimap-widget-hint">
            点击返回 · scroll to zoom
          </span>
        )}
      </div>
      <svg
        ref={svgRef}
        viewBox={viewBoxStr}
        className="minimap-widget-svg"
        role="img"
        aria-hidden
      >
        <image href={imageSrc} width={width} height={height} opacity={0.92} />
        {rooms.map((room) => {
          const { x, y, w, h } = room.overviewRect;
          const isCurrent = room.id === currentRoomId;
          return (
            <g key={room.id}>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                fill={
                  isCurrent
                    ? "rgba(25, 118, 210, 0.45)"
                    : "rgba(25, 118, 210, 0.12)"
                }
                stroke={isCurrent ? "#1976d2" : "#90caf9"}
                strokeWidth={isCurrent ? 3 : 1.5}
                rx={2}
                pointerEvents="none"
              />
              {isCurrent && (
                <circle
                  cx={x + w / 2}
                  cy={y + h / 2}
                  r={7}
                  fill="#1976d2"
                  stroke="#fff"
                  strokeWidth={2}
                  pointerEvents="none"
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
