/**
 * 几何方向解析器
 *
 * 房间之间的连通关系（neighbors 里出现的 room id 集合）是权威的，
 * 但「东西南北」方向键最初是手工标注的，偶尔与 SVG 底图上房间中心的
 * 实际相对位置不一致。本模块根据每个房间 overviewRect 的几何中心，
 * 用向量点积对相邻房间做「最优唯一方向分配」，从而：
 *   1. 按某方向键移动，一定去往几何上位于该方向的房间；
 *   2. 双向一致（A 在 B 东侧 → 从 A 按西可回 B）。
 *
 * 仅重排方向键，绝不新增/删除连通关系。
 */
import type { Direction, OverviewRect, RoomDef, RoomNeighbors } from "../types/room";

const DIRS: Direction[] = ["up", "down", "left", "right"];

/** SVG 坐标系：y 向下增大。up=北(小 y)，down=南(大 y)，left=西(小 x)，right=东(大 x) */
const DIR_UNIT: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

function rectCenter(r: OverviewRect): { x: number; y: number } {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

interface Candidate {
  id: string;
  score: Record<Direction, number>;
}

/**
 * 为若干相邻房间在 4 个方向里做一一对应分配。
 *
 * 采用「置信度贪心」：把所有 (房间, 方向) 组合按匹配度降序排列，
 * 每次取当前最高分且房间/方向都还空闲的组合落定。这样几何方向最明确的
 * 房间会先锁定它的主方向（如正西的房间必得「西」），方向暧昧的房间再退而求其次，
 * 更贴近人的直觉；避免了「总和最大化」把明确方向让给暧昧房间的反直觉结果。
 */
function bestInjectiveAssignment(cands: Candidate[]): Map<string, Direction> {
  const result = new Map<string, Direction>();
  if (cands.length === 0) return result;

  const pairs: Array<{ id: string; dir: Direction; score: number }> = [];
  for (const c of cands) {
    for (const dir of DIRS) {
      if (c.score[dir] === -Infinity) continue;
      pairs.push({ id: c.id, dir, score: c.score[dir] });
    }
  }
  pairs.sort((a, b) => b.score - a.score);

  const usedDir = new Set<Direction>();
  for (const p of pairs) {
    if (result.has(p.id) || usedDir.has(p.dir)) continue;
    result.set(p.id, p.dir);
    usedDir.add(p.dir);
  }
  return result;
}

/** 返回一份重排方向键后的房间列表（连通集合不变） */
export function resolveNeighborDirections(rooms: RoomDef[]): RoomDef[] {
  const centerById = new Map<string, { x: number; y: number }>();
  for (const r of rooms) centerById.set(r.id, rectCenter(r.overviewRect));

  return rooms.map((room) => {
    const src = centerById.get(room.id)!;

    // 收集去重后的相邻 room id（保持首次出现顺序）
    const ids: string[] = [];
    for (const d of DIRS) {
      const id = room.neighbors[d];
      if (id && !ids.includes(id)) ids.push(id);
    }
    if (ids.length === 0) return room;

    const next: RoomNeighbors = {};

    // 找不到几何中心的目标（理论上不该出现）：保留其原方向键，占位
    const unknownIds = ids.filter((id) => !centerById.has(id));
    for (const id of unknownIds) {
      const origDir = DIRS.find((d) => room.neighbors[d] === id);
      if (origDir) next[origDir] = id;
    }
    const reserved = new Set<Direction>(Object.keys(next) as Direction[]);

    const known: Candidate[] = ids
      .filter((id) => centerById.has(id))
      .map((id) => {
        const tc = centerById.get(id)!;
        const dx = tc.x - src.x;
        const dy = tc.y - src.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = dx / len;
        const ny = dy / len;
        const score = {} as Record<Direction, number>;
        for (const d of DIRS) {
          score[d] = reserved.has(d)
            ? -Infinity
            : nx * DIR_UNIT[d].x + ny * DIR_UNIT[d].y;
        }
        return { id, score };
      });

    for (const [id, dir] of bestInjectiveAssignment(known)) {
      next[dir] = id;
    }

    return { ...room, neighbors: next };
  });
}

/** 调试用：返回相对某方向键被改动的房间明细 */
export function diffNeighborDirections(rooms: RoomDef[]): Array<{
  roomId: string;
  label: string;
  before: RoomNeighbors;
  after: RoomNeighbors;
}> {
  const resolved = resolveNeighborDirections(rooms);
  const byId = new Map(resolved.map((r) => [r.id, r]));
  const changes: Array<{
    roomId: string;
    label: string;
    before: RoomNeighbors;
    after: RoomNeighbors;
  }> = [];

  for (const room of rooms) {
    const after = byId.get(room.id)!.neighbors;
    const before = room.neighbors;
    const changed = DIRS.some((d) => (before[d] ?? null) !== (after[d] ?? null));
    if (changed) {
      changes.push({ roomId: room.id, label: room.label, before, after });
    }
  }
  return changes;
}
