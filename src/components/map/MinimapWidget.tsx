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
import { useMapStore, getRouteSegmentForFloor } from "../../store/mapStore";
import { toSvgPoint, POINT_NUDGE } from "../../utils/mapCoords";
import { buildOrthogonalPath } from "../../utils/orthogonalPath";

interface MinimapWidgetProps {
  floorId: FloorId;
  rooms: RoomDef[];
  currentRoomId: string;
  /** 探索模式：点击小地图返回整层鸟瞰 */
  onBackToMap?: () => void;
  /** 分房间模式：点击房间块跳转 */
  onSelectRoom?: (roomId: string) => void;
  /** 导航时在 minimap 上绘制路径 */
  showRoute?: boolean;
  /** 路线下一站 room */
  highlightRoomId?: string | null;
  /** 本层路线 room 序列（用于高亮途经块） */
  routeRoomIds?: string[];
}

const DRAG_THRESHOLD = 4;

export function MinimapWidget({
  floorId,
  rooms,
  currentRoomId,
  onBackToMap,
  onSelectRoom,
  showRoute = false,
  highlightRoomId = null,
  routeRoomIds,
}: MinimapWidgetProps) {
  const { width, height, imageSrc } = getFloorOverview(floorId);
  const currentRoom = rooms.find((r) => r.id === currentRoomId);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragMovedRef = useRef(false);
  const dragStartRef = useRef({ clientX: 0, clientY: 0, panX: 0, panY: 0 });

  const { graph, routeResult, uiPhase } = useMapStore();

  const [minimapExpanded, setMinimapExpanded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const roomNavMode = !!onSelectRoom;

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [currentRoomId, floorId]);

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

  const routePath = useMemo(() => {
    if (!showRoute || uiPhase !== "navigating" || !graph || !routeResult?.found) {
      return null;
    }
    const segment = getRouteSegmentForFloor(routeResult, floorId);
    if (!segment || segment.points.length < 2) return null;

    const orthogonalPoints = buildOrthogonalPath(
      segment.points,
      segment.nodeIds,
      graph
    );
    const svgPoints = orthogonalPoints.map((p) => toSvgPoint(floorId, p.x, p.y));
    if (svgPoints.length < 2) return null;

    return svgPoints
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x + POINT_NUDGE.x} ${p.y + POINT_NUDGE.y}`)
      .join(" ");
  }, [showRoute, uiPhase, graph, routeResult, floorId]);

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
      if (dragMovedRef.current || roomNavMode) return;
      onBackToMap?.();
    },
    [onBackToMap, roomNavMode]
  );

  const handleRoomClick = useCallback(
    (e: React.MouseEvent, roomId: string) => {
      e.stopPropagation();
      if (dragMovedRef.current) return;
      onSelectRoom?.(roomId);
    },
    [onSelectRoom]
  );

  const viewBoxStr = `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`;
  const aspectRatio = `${width} / ${height}`;

  return (
    <div
      className={`minimap-widget${minimapExpanded ? " minimap-widget--expanded" : ""}${dragging ? " minimap-widget--dragging" : ""}`}
      onMouseEnter={() => setMinimapExpanded(true)}
      onMouseLeave={() => setMinimapExpanded(false)}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      role={roomNavMode ? "region" : "button"}
      tabIndex={roomNavMode ? undefined : 0}
      aria-label={roomNavMode ? "Floor map" : "Floor map — click to return"}
      onKeyDown={
        roomNavMode
          ? undefined
          : (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onBackToMap?.();
              }
            }
      }
    >
      <div className="minimap-widget-header">
        <span className="minimap-widget-title">Floor Map</span>
        {minimapExpanded && !dragging && (
          <span className="minimap-widget-hint">
            {roomNavMode ? "scroll to zoom · 点击房间跳转" : "点击返回 · scroll to zoom"}
          </span>
        )}
      </div>
      <svg
        ref={svgRef}
        viewBox={viewBoxStr}
        className="minimap-widget-svg"
        style={{ aspectRatio }}
        role="img"
        aria-hidden
      >
        <image href={imageSrc} width={width} height={height} opacity={0.92} />
        {showRoute && routePath && (
          <g className="minimap-route-layer" pointerEvents="none">
            <path
              d={routePath}
              fill="none"
              stroke="#1976D2"
              strokeWidth={8}
              strokeOpacity={0.3}
              strokeLinecap="round"
              strokeLinejoin="miter"
            />
            <path
              d={routePath}
              fill="none"
              stroke="#1976D2"
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="miter"
            />
          </g>
        )}
        {rooms.map((r) => {
          const { x, y, w, h } = r.overviewRect;
          const isCurrent = r.id === currentRoomId;
          const isNext = highlightRoomId != null && r.id === highlightRoomId;
          const onRoute =
            routeRoomIds?.includes(r.id) && !isCurrent && !isNext;
          return (
            <g key={r.id}>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                fill={
                  isCurrent
                    ? "rgba(25, 118, 210, 0.45)"
                    : isNext
                      ? "rgba(46, 125, 50, 0.35)"
                      : onRoute
                        ? "rgba(25, 118, 210, 0.2)"
                        : "rgba(25, 118, 210, 0.12)"
                }
                stroke={
                  isCurrent ? "#1976d2" : isNext ? "#2e7d32" : "#90caf9"
                }
                strokeWidth={isCurrent || isNext ? 3 : 1.5}
                rx={2}
                pointerEvents={roomNavMode ? "all" : "none"}
                style={roomNavMode ? { cursor: "pointer" } : undefined}
                onClick={
                  roomNavMode
                    ? (e) => handleRoomClick(e, r.id)
                    : undefined
                }
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
