import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import type { FloorId } from "../../types/indoor";
import type { RoomDef } from "../../types/room";
import { getFloorOverview } from "../../data/roomConfig";
import {
  computeLocalMinimapViewBox,
  clampMinimapZoom,
  MINIMAP_ZOOM,
  viewportForMinimapZoom,
  shiftMinimapViewBox,
} from "../../utils/minimapView";

interface FloorMinimapProps {
  floorId: FloorId;
  rooms: RoomDef[];
  currentRoomId: string;
  visitedRoomIds: string[];
  onSelectRoom: (roomId: string) => void;
}

const DRAG_THRESHOLD = 4;

export function FloorMinimap({
  floorId,
  rooms,
  currentRoomId,
  visitedRoomIds,
  onSelectRoom,
}: FloorMinimapProps) {
  const { width, height, imageSrc } = getFloorOverview(floorId);
  const currentRoom = rooms.find((r) => r.id === currentRoomId);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragMovedRef = useRef(false);
  const dragStartRef = useRef({ clientX: 0, clientY: 0, panX: 0, panY: 0 });

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [currentRoomId]);

  const baseViewBox = useMemo(() => {
    if (!currentRoom) return { x: 0, y: 0, w: width, h: height };
    const viewport = viewportForMinimapZoom(zoom);
    return computeLocalMinimapViewBox(width, height, currentRoom.overviewRect, viewport);
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
    const delta = e.deltaY > 0 ? -MINIMAP_ZOOM.wheelFactor : MINIMAP_ZOOM.wheelFactor;
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

  const handleRoomClick = useCallback(
    (roomId: string, visited: boolean) => {
      if (dragMovedRef.current || !visited) return;
      onSelectRoom(roomId);
    },
    [onSelectRoom]
  );

  const viewBoxStr = `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`;

  return (
    <div
      className={`floor-minimap${hovered ? " floor-minimap--hover" : ""}${dragging ? " floor-minimap--dragging" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
    >
      <div className="floor-minimap-title">
        附近地图
        {hovered && !dragging && (
          <span className="floor-minimap-hint">滚轮缩放 · 拖拽平移</span>
        )}
      </div>
      <svg
        ref={svgRef}
        viewBox={viewBoxStr}
        className="floor-minimap-svg"
        role="img"
        aria-label="当前位置附近地图，滚轮缩放，拖拽平移"
      >
        <image href={imageSrc} width={width} height={height} opacity={0.9} />
        {rooms.map((room) => {
          const { x, y, w, h } = room.overviewRect;
          const isCurrent = room.id === currentRoomId;
          const visited = visitedRoomIds.includes(room.id);
          const unexplored = !visited && !isCurrent;

          return (
            <g key={room.id} opacity={unexplored ? 0.35 : 1}>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                fill={
                  isCurrent
                    ? "rgba(92, 107, 192, 0.5)"
                    : visited
                      ? "rgba(126, 200, 80, 0.4)"
                      : "rgba(180, 180, 180, 0.25)"
                }
                stroke={isCurrent ? "#5c6bc0" : visited ? "#6ab340" : "#aaa"}
                strokeWidth={isCurrent ? 4 : 2}
                rx={2}
                className="floor-minimap-room"
                onClick={() => handleRoomClick(room.id, visited)}
                style={{ cursor: visited ? "pointer" : "default" }}
              />
              {isCurrent && (
                <circle
                  cx={x + w / 2}
                  cy={y + h / 2}
                  r={8}
                  fill="#5c6bc0"
                  stroke="#fff"
                  strokeWidth={2.5}
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
