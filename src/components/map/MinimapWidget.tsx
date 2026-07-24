import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import type { FloorId } from "../../types/indoor";
import type { RoomDef } from "../../types/room";
import type { GuideRouteGeometry, GuideRouteStop } from "../../types/guide";
import { getFloorOverview } from "../../data/roomConfig";
import {
  computeLocalMinimapViewBox,
  clampMinimapZoom,
  MINIMAP_ZOOM,
  MINIMAP_LOCAL_VIEWPORT,
  viewportForMinimapZoom,
  shiftMinimapViewBox,
} from "../../utils/minimapView";
import { useMapStore, getRouteSegmentForFloor } from "../../store/mapStore";
import { toSvgPoint, POINT_NUDGE } from "../../utils/mapCoords";
import { buildOrthogonalPath } from "../../utils/orthogonalPath";
import {
  geometryPathsOnFloor,
  resolveGuideRouteGeometry,
} from "../../algorithms/guideRouteGeometry";

interface MinimapWidgetProps {
  floorId: FloorId;
  rooms: RoomDef[];
  currentRoomId: string;
  /** 探索模式：点击小地图返回整层鸟瞰 */
  onBackToMap?: () => void;
  /** 分房间模式：点击房间块跳转 */
  onSelectRoom?: (roomId: string) => void;
  /** 点击攻略编号站点：跳转房间并打开对应便签 */
  onSelectGuideStop?: (stopIndex: number) => void;
  /** 导航时在 minimap 上绘制路径 */
  showRoute?: boolean;
  /** 路线下一站 room */
  highlightRoomId?: string | null;
  /** 本层路线 room 序列（用于高亮途经块） */
  routeRoomIds?: string[];
  /** 收藏夹等地图高亮 room */
  spotlightRoomIds?: string[];
  /** 主题攻略路线停靠点（本层，带顺序编号） */
  guideStops?: { roomId: string; order: number }[];
  /** 攻略路线寻路几何（本层折线） */
  guideGeometry?: GuideRouteGeometry | null;
  /** 完整攻略站点（用于现场寻路补全几何） */
  guideRouteStops?: GuideRouteStop[];
  guideActiveLegIndex?: number | null;
}

const DRAG_THRESHOLD = 4;

function starPath(cx: number, cy: number, outerR: number): string {
  const innerR = outerR * 0.42;
  const pts: string[] = [];
  for (let i = 0; i < 5; i++) {
    const outerA = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const innerA = outerA + Math.PI / 5;
    pts.push(
      `${cx + outerR * Math.cos(outerA)} ${cy + outerR * Math.sin(outerA)}`
    );
    pts.push(
      `${cx + innerR * Math.cos(innerA)} ${cy + innerR * Math.sin(innerA)}`
    );
  }
  return `M ${pts.join(" L ")} Z`;
}

function fitRoomsViewBox(
  floorWidth: number,
  floorHeight: number,
  roomRects: { x: number; y: number; w: number; h: number }[]
): { x: number; y: number; w: number; h: number } {
  if (roomRects.length === 0) {
    return { x: 0, y: 0, w: floorWidth, h: floorHeight };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const r of roomRects) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.w);
    maxY = Math.max(maxY, r.y + r.h);
  }
  const pad = 48;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(floorWidth, maxX + pad);
  maxY = Math.min(floorHeight, maxY + pad);

  let w = Math.max(maxX - minX, MINIMAP_LOCAL_VIEWPORT.width * 0.7);
  let h = Math.max(maxY - minY, MINIMAP_LOCAL_VIEWPORT.height * 0.7);
  const aspect = MINIMAP_LOCAL_VIEWPORT.width / MINIMAP_LOCAL_VIEWPORT.height;
  if (w / h > aspect) {
    h = w / aspect;
  } else {
    w = h * aspect;
  }
  w = Math.min(w, floorWidth);
  h = Math.min(h, floorHeight);

  let x = (minX + maxX) / 2 - w / 2;
  let y = (minY + maxY) / 2 - h / 2;
  x = Math.max(0, Math.min(x, floorWidth - w));
  y = Math.max(0, Math.min(y, floorHeight - h));
  return { x, y, w, h };
}

export function MinimapWidget({
  floorId,
  rooms,
  currentRoomId,
  onBackToMap,
  onSelectRoom,
  onSelectGuideStop,
  showRoute = false,
  highlightRoomId = null,
  routeRoomIds,
  spotlightRoomIds,
  guideStops,
  guideGeometry,
  guideRouteStops,
  guideActiveLegIndex = null,
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

  const resolvedGuideGeometry = useMemo(
    () => resolveGuideRouteGeometry(graph, guideRouteStops ?? [], guideGeometry ?? undefined),
    [graph, guideRouteStops, guideGeometry]
  );

  const guideRouteActive = !!resolvedGuideGeometry;

  const guideRouteBounds = useMemo(() => {
    if (!resolvedGuideGeometry) return null;
    const points = resolvedGuideGeometry.legs.flatMap((leg) =>
      leg.segments
        .filter((segment) => segment.floorId === floorId)
        .flatMap((segment) =>
          segment.points.map((point) => toSvgPoint(floorId, point.x, point.y))
        )
    );
    if (points.length === 0) return null;
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    return {
      x: minX,
      y: minY,
      w: Math.max(maxX - minX, 16),
      h: Math.max(maxY - minY, 16),
    };
  }, [resolvedGuideGeometry, floorId]);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [currentRoomId, floorId]);

  const baseViewBox = useMemo(() => {
    if (!currentRoom) return { x: 0, y: 0, w: width, h: height };

    // 攻略路线激活时，尽量拉远到覆盖本层全部站点与路线
    if (resolvedGuideGeometry) {
      const focusRects = rooms
        .filter((r) => {
          if (r.id === currentRoomId) return true;
          if (guideStops?.some((s) => s.roomId === r.id)) return true;
          return resolvedGuideGeometry.stopAnchors.some(
            (a) => a.floorId === floorId && a.roomId === r.id
          );
        })
        .map((r) => r.overviewRect);
      if (guideRouteBounds) focusRects.push(guideRouteBounds);
      if (focusRects.length > 0) {
        return fitRoomsViewBox(width, height, focusRects);
      }
    }

    if (guideStops && guideStops.length > 0) {
      const focusRects = rooms
        .filter(
          (r) =>
            r.id === currentRoomId ||
            guideStops.some((s) => s.roomId === r.id)
        )
        .map((r) => r.overviewRect);
      if (focusRects.length > 0) {
        return fitRoomsViewBox(width, height, focusRects);
      }
    }

    const focusIds = new Set<string>([currentRoomId]);
    spotlightRoomIds?.forEach((id) => focusIds.add(id));

    if (focusIds.size > 1) {
      const focusRects = rooms
        .filter((r) => focusIds.has(r.id))
        .map((r) => r.overviewRect);
      if (focusRects.length > 0) {
        return fitRoomsViewBox(width, height, focusRects);
      }
    }

    const viewport = viewportForMinimapZoom(zoom);
    return computeLocalMinimapViewBox(
      width,
      height,
      currentRoom.overviewRect,
      viewport
    );
  }, [
    currentRoom,
    currentRoomId,
    width,
    height,
    zoom,
    rooms,
    spotlightRoomIds,
    guideStops,
    resolvedGuideGeometry,
    guideRouteBounds,
    floorId,
  ]);

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
    if (guideRouteActive) return null;
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
  }, [guideRouteActive, showRoute, uiPhase, graph, routeResult, floorId]);

  const guidePaths = useMemo(() => {
    if (!resolvedGuideGeometry || !graph) return [];
    return geometryPathsOnFloor(
      resolvedGuideGeometry,
      graph,
      floorId,
      guideActiveLegIndex
    );
  }, [resolvedGuideGeometry, graph, floorId, guideActiveLegIndex]);

  const guideConnectors = useMemo(() => {
    if (!resolvedGuideGeometry || !guideStops) return [];
    return guideStops.flatMap((stop) => {
      const stopIndex = stop.order - 1;
      const room = rooms.find((candidate) => candidate.id === stop.roomId);
      if (!room) return [];

      const outgoing = resolvedGuideGeometry.legs[stopIndex];
      const incoming =
        stopIndex > 0 ? resolvedGuideGeometry.legs[stopIndex - 1] : undefined;
      const outgoingSegment = outgoing?.segments.find(
        (segment) => segment.floorId === floorId
      );
      const incomingSegment = incoming?.segments.find(
        (segment) => segment.floorId === floorId
      );
      const routePoint = outgoingSegment?.points[0] ??
        incomingSegment?.points[incomingSegment.points.length - 1];
      if (!routePoint) return [];

      const endpoint = toSvgPoint(floorId, routePoint.x, routePoint.y);
      const rect = room.overviewRect;
      return [{
        order: stop.order,
        x1: rect.x + rect.w / 2,
        y1: rect.y + rect.h / 2,
        x2: endpoint.x,
        y2: endpoint.y,
      }];
    });
  }, [resolvedGuideGeometry, guideStops, rooms, floorId]);

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
    (e: React.MouseEvent, roomId: string, guideOrder?: number) => {
      e.stopPropagation();
      if (dragMovedRef.current) return;
      if (guideOrder != null && onSelectGuideStop) {
        onSelectGuideStop(guideOrder - 1);
        return;
      }
      onSelectRoom?.(roomId);
    },
    [onSelectRoom, onSelectGuideStop]
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
          const hitPad = Math.max(0, (14 - Math.min(w, h)) / 2);
          const hitX = x - hitPad;
          const hitY = y - hitPad;
          const hitW = w + hitPad * 2;
          const hitH = h + hitPad * 2;
          const isCurrent = r.id === currentRoomId;
          const isNext = highlightRoomId != null && r.id === highlightRoomId;
          const onRoute =
            routeRoomIds?.includes(r.id) && !isCurrent && !isNext;
          const isSpotlight = !!spotlightRoomIds?.includes(r.id);
          const guideOrder = guideStops?.find((s) => s.roomId === r.id)?.order;
          return (
            <g key={r.id}>
              <rect
                x={hitX}
                y={hitY}
                width={hitW}
                height={hitH}
                fill={
                  isCurrent
                    ? "rgba(25, 118, 210, 0.45)"
                    : isNext
                      ? "rgba(46, 125, 50, 0.35)"
                      : guideOrder != null
                        ? "rgba(245, 124, 0, 0.22)"
                        : onRoute
                          ? "rgba(25, 118, 210, 0.2)"
                          : "rgba(25, 118, 210, 0.12)"
                }
                stroke={
                  isCurrent
                    ? "#1976d2"
                    : isNext
                      ? "#2e7d32"
                      : guideOrder != null
                        ? "#ef6c00"
                        : "#90caf9"
                }
                strokeWidth={isCurrent || isNext || guideOrder != null ? 3 : 1.5}
                rx={2}
                pointerEvents={roomNavMode ? "all" : "none"}
                style={roomNavMode ? { cursor: "pointer" } : undefined}
                onClick={
                  roomNavMode
                    ? (e) => handleRoomClick(e, r.id, guideOrder)
                    : undefined
                }
              />
              {isCurrent && guideOrder == null && !isSpotlight && (
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
              {isSpotlight && (
                <g pointerEvents="none">
                  <path
                    d={starPath(x + w / 2, y + h / 2, 9)}
                    fill="#ff9800"
                    stroke="#ef6c00"
                    strokeWidth={1.2}
                    strokeLinejoin="round"
                  />
                </g>
              )}
            </g>
          );
        })}
        {guidePaths.length > 0 && (
          <g className="minimap-guide-route-legs" pointerEvents="none">
            {guidePaths.map((path, index) => (
              <g key={`guide-leg-${path.legIndex}-${index}`}>
                <path
                  d={path.d}
                  fill="none"
                  stroke="#fff3e0"
                  strokeWidth={path.active ? 11 : 9}
                  strokeOpacity={0.95}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={path.d}
                  fill="none"
                  stroke={path.active ? "#e65100" : "#f57c00"}
                  strokeWidth={path.active ? 6 : 5}
                  strokeOpacity={path.active ? 1 : 0.82}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={path.active ? undefined : "10 6"}
                />
              </g>
            ))}
          </g>
        )}
        {guideConnectors.map((connector) => (
          <g key={`guide-connector-${connector.order}`} pointerEvents="none">
            <path
              d={`M ${connector.x1} ${connector.y1} L ${connector.x2} ${connector.y2}`}
              fill="none"
              stroke="#fff3e0"
              strokeWidth={9}
              strokeLinecap="round"
            />
            <path
              d={`M ${connector.x1} ${connector.y1} L ${connector.x2} ${connector.y2}`}
              fill="none"
              stroke="#f57c00"
              strokeWidth={5}
              strokeLinecap="round"
            />
          </g>
        ))}
        {guideStops?.map((stop) => {
          const stopRoom = rooms.find((room) => room.id === stop.roomId);
          if (!stopRoom) return null;
          const { x, y, w, h } = stopRoom.overviewRect;
          return (
            <g key={`guide-stop-${stop.order}`} pointerEvents="none">
              <circle
                cx={x + w / 2}
                cy={y + h / 2}
                r={8}
                fill="#ef6c00"
                stroke="#fff"
                strokeWidth={2}
              />
              <text
                x={x + w / 2}
                y={y + h / 2 + 3.5}
                textAnchor="middle"
                fontSize={9}
                fontWeight={700}
                fill="#fff"
              >
                {stop.order}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
