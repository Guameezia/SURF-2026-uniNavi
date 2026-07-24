/**
 * 攻略主题路线 — 多站寻路几何（沿室内图最短路拼接折线）
 */

import type {
  FloorId,
  Graph,
  MapPoint,
  RouteSegment,
} from "../types/indoor";
import type { GuideRouteGeometry, GuideRouteLeg, GuideRouteStop, GuideStopAnchor } from "../types/guide";
import { findRoute } from "./pathfinding";
import { VERTICAL_SHAFTS } from "../data/floorPortals";
import { getRoomById } from "../data/roomConfig";
import type { OverviewRect } from "../types/room";
import { toSvgPoint } from "../utils/mapCoords";
import { buildOrthogonalPath } from "../utils/orthogonalPath";

function pointInRect(x: number, y: number, rect: OverviewRect): boolean {
  return (
    x >= rect.x &&
    x <= rect.x + rect.w &&
    y >= rect.y &&
    y <= rect.y + rect.h
  );
}

function samePoint(a: MapPoint, b: MapPoint): boolean {
  return Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5;
}

function buildExplicitRoomToNodeMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const shaft of VERTICAL_SHAFTS) {
    for (const binding of shaft.floors) {
      map.set(`${binding.floorId}|${binding.roomId}`, binding.nodeId);
      if (binding.corridorRoomId && binding.corridorNodeId) {
        const key = `${binding.floorId}|${binding.corridorRoomId}`;
        if (!map.has(key)) map.set(key, binding.corridorNodeId);
      }
    }
  }
  return map;
}

const EXPLICIT_ROOM_TO_NODE = buildExplicitRoomToNodeMap();

/** 房间 → 导航图节点（竖井显式映射优先，否则房间内 POI / 最近节点） */
export function resolveRoomToNodeId(
  graph: Graph,
  floorId: FloorId,
  roomId: string
): string | null {
  const explicit = EXPLICIT_ROOM_TO_NODE.get(`${floorId}|${roomId}`);
  if (explicit && graph.nodesById[explicit]) return explicit;

  const room = getRoomById(floorId, roomId);
  if (!room) return null;

  const cx = room.overviewRect.x + room.overviewRect.w / 2;
  const cy = room.overviewRect.y + room.overviewRect.h / 2;

  const inside = graph.nodes.filter((n) => {
    if (n.floorId !== floorId) return false;
    const svg = toSvgPoint(floorId, n.x, n.y);
    return pointInRect(svg.x, svg.y, room.overviewRect);
  });

  if (inside.length > 0) {
    const preferred =
      inside.find((n) => n.type === "room") ??
      inside.find((n) => n.type === "stairs" || n.type === "elevator") ??
      inside[0];
    return preferred.id;
  }

  let bestId: string | null = null;
  let bestDist = Infinity;
  for (const n of graph.nodes) {
    if (n.floorId !== floorId) continue;
    if (n.type === "junction") continue;
    const svg = toSvgPoint(floorId, n.x, n.y);
    const d = (svg.x - cx) ** 2 + (svg.y - cy) ** 2;
    if (d < bestDist) {
      bestDist = d;
      bestId = n.id;
    }
  }
  return bestId;
}

function mergeSegment(
  acc: Map<FloorId, RouteSegment>,
  seg: RouteSegment
) {
  const prev = acc.get(seg.floorId);
  if (!prev) {
    acc.set(seg.floorId, {
      floorId: seg.floorId,
      nodeIds: [...seg.nodeIds],
      points: seg.points.map((p) => ({ ...p })),
    });
    return;
  }

  let startPt = 0;
  if (
    prev.points.length > 0 &&
    seg.points.length > 0 &&
    samePoint(prev.points[prev.points.length - 1], seg.points[0])
  ) {
    startPt = 1;
  }

  let startNode = 0;
  if (
    prev.nodeIds.length > 0 &&
    seg.nodeIds.length > 0 &&
    prev.nodeIds[prev.nodeIds.length - 1] === seg.nodeIds[0]
  ) {
    startNode = 1;
  }

  prev.points.push(...seg.points.slice(startPt));
  prev.nodeIds.push(...seg.nodeIds.slice(startNode));
}

function stopAnchor(stop: GuideRouteStop, stopIndex: number): GuideStopAnchor {
  const room = getRoomById(stop.floorId, stop.roomId);
  const rect = room?.overviewRect ?? { x: 0, y: 0, w: 20, h: 20 };
  return {
    stopIndex,
    floorId: stop.floorId,
    roomId: stop.roomId,
    noteId: stop.noteId,
    roomLabel: stop.roomLabel,
    x: rect.x + rect.w / 2,
    y: rect.y + rect.h / 2,
  };
}

/** 为有序站点构建完整攻略路线几何（相邻便签间自动最短路寻路） */
export function buildGuideRouteGeometry(
  graph: Graph,
  stops: GuideRouteStop[]
): GuideRouteGeometry {
  const legs: GuideRouteLeg[] = [];
  const floorMap = new Map<FloorId, RouteSegment>();
  let complete = true;

  for (let i = 0; i < stops.length - 1; i++) {
    const from = stops[i];
    const to = stops[i + 1];
    const startNodeId = resolveRoomToNodeId(graph, from.floorId, from.roomId);
    const endNodeId = resolveRoomToNodeId(graph, to.floorId, to.roomId);

    if (!startNodeId || !endNodeId) {
      complete = false;
      legs.push({
        fromStopIndex: i,
        toStopIndex: i + 1,
        segments: [],
        found: false,
      });
      continue;
    }

    const route = findRoute(graph, startNodeId, endNodeId);
    if (!route.found) {
      complete = false;
      legs.push({
        fromStopIndex: i,
        toStopIndex: i + 1,
        segments: [],
        found: false,
      });
      continue;
    }

    legs.push({
      fromStopIndex: i,
      toStopIndex: i + 1,
      segments: route.segments,
      found: true,
    });

    for (const seg of route.segments) {
      mergeSegment(floorMap, seg);
    }
  }

  return {
    floorSegments: [...floorMap.values()],
    legs,
    stopAnchors: stops.map((s, i) => stopAnchor(s, i)),
    complete,
  };
}

/** 取路线几何：优先用已缓存，否则现场寻路生成 */
export function resolveGuideRouteGeometry(
  graph: Graph | null | undefined,
  stops: GuideRouteStop[],
  cached?: GuideRouteGeometry
): GuideRouteGeometry | null {
  // 图已加载时始终按当前节点/边重新计算，避免 localStorage 中旧几何为空或过期。
  if (graph && stops.length >= 2) return buildGuideRouteGeometry(graph, stops);
  return cached ?? null;
}

function segmentToPathD(
  seg: RouteSegment,
  graph: Graph,
  floorId: FloorId
): string | null {
  if (seg.points.length < 2) return null;
  const ortho = buildOrthogonalPath(seg.points, seg.nodeIds, graph);
  if (ortho.length < 2) return null;
  return ortho
    .map((p) => toSvgPoint(floorId, p.x, p.y))
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
}

/** 本层合并后的完整攻略折线（小地图用） */
export function geometryMergedPathOnFloor(
  geometry: GuideRouteGeometry,
  graph: Graph,
  floorId: FloorId
): string | null {
  const seg = geometry.floorSegments.find((s) => s.floorId === floorId);
  if (!seg) return null;
  return segmentToPathD(seg, graph, floorId);
}

export interface GuidePathOnFloor {
  legIndex: number;
  d: string;
  active: boolean;
}

/** 将某层的攻略路线转为 SVG path（按 leg 分段，便于高亮当前段） */
export function geometryPathsOnFloor(
  geometry: GuideRouteGeometry,
  graph: Graph,
  floorId: FloorId,
  activeLegIndex: number | null
): GuidePathOnFloor[] {
  const paths: GuidePathOnFloor[] = [];

  geometry.legs.forEach((leg, legIndex) => {
    if (!leg.found) return;
    const floorSegs = leg.segments.filter((s) => s.floorId === floorId);
    for (const seg of floorSegs) {
      const d = segmentToPathD(seg, graph, floorId);
      if (!d) continue;
      paths.push({
        legIndex,
        d,
        active: activeLegIndex === legIndex,
      });
    }
  });

  return paths;
}

/** 根据当前所在房间推断应高亮的路线段（站 i → 站 i+1） */
export function resolveActiveGuideLegIndex(
  stops: GuideRouteStop[],
  floorId: FloorId,
  roomId: string
): number | null {
  const stopIdx = stops.findIndex(
    (s) => s.floorId === floorId && s.roomId === roomId
  );
  if (stopIdx < 0) return null;
  if (stopIdx >= stops.length - 1) return stops.length - 2;
  return stopIdx;
}
