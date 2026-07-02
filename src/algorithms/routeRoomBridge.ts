/**
 * 图寻路结果 ↔ 分房间导航 桥接层
 */
import type { FloorId, Graph, RouteResult } from "../types/indoor";
import type { Direction, OverviewRect } from "../types/room";
import {
  VERTICAL_SHAFTS,
} from "../data/floorPortals";
import {
  getRoomById,
  getRoomsForFloor,
  hasRoomNavigation,
} from "../data/roomConfig";
import { toSvgPoint } from "../utils/mapCoords";

export interface RoomRouteSegment {
  floorId: FloorId;
  roomIds: string[];
}

export interface RoomRoutePlan {
  segments: RoomRouteSegment[];
}

let explicitNodeRoomCache: Map<string, string> | null = null;

function buildExplicitNodeRoomMap(): Map<string, string> {
  if (explicitNodeRoomCache) return explicitNodeRoomCache;

  const map = new Map<string, string>();

  for (const shaft of VERTICAL_SHAFTS) {
    for (const binding of shaft.floors) {
      map.set(binding.nodeId, binding.roomId);
      if (binding.corridorNodeId && binding.corridorRoomId) {
        map.set(binding.corridorNodeId, binding.corridorRoomId);
      }
    }
  }

  explicitNodeRoomCache = map;
  return map;
}

function pointInRect(
  x: number,
  y: number,
  rect: OverviewRect
): boolean {
  return (
    x >= rect.x &&
    x <= rect.x + rect.w &&
    y >= rect.y &&
    y <= rect.y + rect.h
  );
}

/** 将导航图节点解析为所在 room（显式映射优先，否则按 overviewRect 命中） */
export function resolveNodeToRoomId(
  graph: Graph,
  floorId: FloorId,
  nodeId: string
): string | null {
  const explicit = buildExplicitNodeRoomMap().get(nodeId);
  if (explicit) return explicit;

  const node = graph.nodesById[nodeId];
  if (!node || node.floorId !== floorId) return null;
  if (!hasRoomNavigation(floorId)) return null;

  const svg = toSvgPoint(floorId, node.x, node.y);
  const rooms = getRoomsForFloor(floorId);

  const containing = rooms
    .filter((r) => pointInRect(svg.x, svg.y, r.overviewRect))
    .sort(
      (a, b) =>
        a.overviewRect.w * a.overviewRect.h -
        b.overviewRect.w * b.overviewRect.h
    );

  return containing[0]?.id ?? null;
}

/** 将单层节点序列压缩为 room 序列（去重相邻相同 room） */
export function buildRoomSequence(
  graph: Graph,
  floorId: FloorId,
  nodeIds: string[]
): string[] {
  const seq: string[] = [];
  for (const nodeId of nodeIds) {
    const roomId = resolveNodeToRoomId(graph, floorId, nodeId);
    if (!roomId) continue;
    if (seq[seq.length - 1] !== roomId) seq.push(roomId);
  }
  return seq;
}

/** 从完整路径结果构建分房间导航计划 */
export function buildRoomRoutePlan(
  graph: Graph,
  route: RouteResult
): RoomRoutePlan | null {
  if (!route.found) return null;

  const segments = route.segments
    .map((seg) => ({
      floorId: seg.floorId,
      roomIds: buildRoomSequence(graph, seg.floorId, seg.nodeIds),
    }))
    .filter((seg) => seg.roomIds.length > 0);

  return segments.length > 0 ? { segments } : null;
}

export function getRoomRouteSegment(
  plan: RoomRoutePlan | null,
  floorId: FloorId
): string[] | null {
  return plan?.segments.find((s) => s.floorId === floorId)?.roomIds ?? null;
}

/** 获取某层路线入口 room */
export function getEntryRoomForFloor(
  plan: RoomRoutePlan | null,
  floorId: FloorId
): string | null {
  const seg = getRoomRouteSegment(plan, floorId);
  return seg?.[0] ?? null;
}

/** 当前 room 在路线上的下一站 */
export function getNextRouteRoom(
  roomIds: string[],
  currentRoomId: string
): string | null {
  const idx = roomIds.indexOf(currentRoomId);
  if (idx === -1) return roomIds[0] ?? null;
  if (idx >= roomIds.length - 1) return null;
  return roomIds[idx + 1];
}

/** 导航态下该方向是否沿路线前进 */
export function isDirectionOnRoute(
  floorId: FloorId,
  currentRoomId: string,
  direction: Direction,
  roomIds: string[]
): boolean {
  const current = getRoomById(floorId, currentRoomId);
  const nextId = current?.neighbors[direction];
  if (!nextId) return false;

  const expectedNext = getNextRouteRoom(roomIds, currentRoomId);
  if (expectedNext === nextId) return true;

  const idx = roomIds.indexOf(currentRoomId);
  if (idx === -1) return roomIds.includes(nextId);
  return roomIds.slice(idx + 1).includes(nextId);
}

/** 导航态下过滤可用方向（仅保留路线允许的方向） */
export function filterRouteDirections(
  floorId: FloorId,
  currentRoomId: string,
  available: Partial<Record<Direction, string>>,
  roomIds: string[]
): Partial<Record<Direction, string>> {
  const filtered: Partial<Record<Direction, string>> = {};
  for (const dir of ["up", "down", "left", "right"] as Direction[]) {
    const label = available[dir];
    if (!label) continue;
    if (isDirectionOnRoute(floorId, currentRoomId, dir, roomIds)) {
      filtered[dir] = label;
    }
  }
  return filtered;
}

/** 测试用：重置显式映射缓存 */
export function _resetNodeRoomCache(): void {
  explicitNodeRoomCache = null;
}
