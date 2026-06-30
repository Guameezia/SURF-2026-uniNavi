/**
 * 路径规划算法
 * 使用 Dijkstra 算法实现最短路径
 */

import type {
  Graph,
  RouteResult,
  RouteSegment,
  MapPoint,
  FloorId,
  EdgeType,
  RouteMode,
  ComputedRoute,
} from "../types/indoor";
import { FLOOR_ORDER } from "../data";
import { getEdge } from "./graph";
import { buildRouteSteps } from "./routePresenter";

/**
 * 优先队列（最小堆）
 */
class MinHeap<T> {
  private heap: { priority: number; value: T }[] = [];

  push(value: T, priority: number): void {
    this.heap.push({ priority, value });
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): T | undefined {
    if (this.heap.length === 0) return undefined;
    const min = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }
    return min.value;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[parentIndex].priority <= this.heap[index].priority) break;
      [this.heap[parentIndex], this.heap[index]] = [
        this.heap[index],
        this.heap[parentIndex],
      ];
      index = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    while (true) {
      const left = 2 * index + 1;
      const right = 2 * index + 2;
      let smallest = index;

      if (
        left < this.heap.length &&
        this.heap[left].priority < this.heap[smallest].priority
      ) {
        smallest = left;
      }
      if (
        right < this.heap.length &&
        this.heap[right].priority < this.heap[smallest].priority
      ) {
        smallest = right;
      }

      if (smallest === index) break;

      [this.heap[index], this.heap[smallest]] = [
        this.heap[smallest],
        this.heap[index],
      ];
      index = smallest;
    }
  }
}

/**
 * Dijkstra 算法
 * @param graph 图结构
 * @param startId 起点 ID
 * @param endId 终点 ID
 * @param excludeEdgeTypes 要排除的边类型
 * @returns 路径节点 ID 列表和总距离
 */
function dijkstra(
  graph: Graph,
  startId: string,
  endId: string,
  excludeEdgeTypes: EdgeType[] = []
): { path: string[]; distance: number } {
  const excludeSet = new Set(excludeEdgeTypes);
  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const visited = new Set<string>();
  const heap = new MinHeap<string>();

  // 初始化
  for (const nodeId of Object.keys(graph.nodesById)) {
    distances[nodeId] = Infinity;
    previous[nodeId] = null;
  }
  distances[startId] = 0;
  heap.push(startId, 0);

  while (!heap.isEmpty()) {
    const currentId = heap.pop()!;

    if (visited.has(currentId)) continue;
    visited.add(currentId);

    if (currentId === endId) break;

    const neighbors = graph.adjacency[currentId] || [];
    for (const { to, edge } of neighbors) {
      // 跳过被排除的边类型
      if (excludeSet.has(edge.edgeType)) continue;

      const newDist = distances[currentId] + edge.distance;
      if (newDist < distances[to]) {
        distances[to] = newDist;
        previous[to] = currentId;
        heap.push(to, newDist);
      }
    }
  }

  // 回溯路径
  if (distances[endId] === Infinity) {
    return { path: [], distance: Infinity };
  }

  const path: string[] = [];
  let current: string | null = endId;
  while (current !== null) {
    path.unshift(current);
    current = previous[current];
  }

  return { path, distance: distances[endId] };
}

/**
 * 按楼层分割路径
 */
function splitByFloor(path: string[], graph: Graph): RouteSegment[] {
  if (path.length === 0) return [];

  const segments: RouteSegment[] = [];
  let currentFloor: FloorId | null = null;
  let currentNodeIds: string[] = [];
  let currentPoints: MapPoint[] = [];

  for (const nodeId of path) {
    const node = graph.nodesById[nodeId];
    if (!node) continue;

    if (currentFloor === null) {
      // 第一个节点
      currentFloor = node.floorId;
      currentNodeIds = [nodeId];
      currentPoints = [{ x: node.x, y: node.y, id: nodeId }];
    } else if (node.floorId === currentFloor) {
      // 同一楼层
      currentNodeIds.push(nodeId);
      currentPoints.push({ x: node.x, y: node.y, id: nodeId });
    } else {
      // 楼层切换 - 保存当前段
      segments.push({
        floorId: currentFloor,
        nodeIds: currentNodeIds,
        points: currentPoints,
      });
      // 开始新的段
      currentFloor = node.floorId;
      currentNodeIds = [nodeId];
      currentPoints = [{ x: node.x, y: node.y, id: nodeId }];
    }
  }

  // 保存最后一段
  if (currentFloor !== null && currentNodeIds.length > 0) {
    segments.push({
      floorId: currentFloor,
      nodeIds: currentNodeIds,
      points: currentPoints,
    });
  }

  // 按楼层顺序排序
  segments.sort((a, b) => {
    return FLOOR_ORDER.indexOf(a.floorId) - FLOOR_ORDER.indexOf(b.floorId);
  });

  return segments;
}

// --- Comfort / Fast 竖井路由（对齐 uni-navi-ios DijkstraRouter）---

type ShaftKind =
  | "elevator"
  | "stair"
  | "externalZeroFloorStair"
  | "thirdFloorExit";

interface Shaft {
  nodesByFloor: Record<string, string>;
  kind: ShaftKind;
}

function getShaftKind(nodeIds: string[], transportType: EdgeType): ShaftKind {
  for (const id of nodeIds) {
    if (id.includes("EXIT_1F3F")) return "thirdFloorExit";
    if (id.includes("EXT_STAIR_")) return "externalZeroFloorStair";
  }
  return transportType === "elevator" ? "elevator" : "stair";
}

function modePriority(mode: RouteMode, kind: ShaftKind): number {
  if (mode === "comfort") {
    switch (kind) {
      case "elevator":
        return 0;
      case "stair":
      case "externalZeroFloorStair":
        return 1;
      case "thirdFloorExit":
        return 3;
    }
  }
  switch (kind) {
    case "stair":
    case "externalZeroFloorStair":
      return 0;
    case "thirdFloorExit":
      return 2;
    case "elevator":
      return 3;
  }
}

function identifyShafts(graph: Graph, transportType: EdgeType): Shaft[] {
  const vertAdj: Record<string, string[]> = {};
  for (const e of graph.edges) {
    if (e.edgeType !== transportType) continue;
    if (!vertAdj[e.from]) vertAdj[e.from] = [];
    if (!vertAdj[e.to]) vertAdj[e.to] = [];
    vertAdj[e.from].push(e.to);
    vertAdj[e.to].push(e.from);
  }

  const visited = new Set<string>();
  const shafts: Shaft[] = [];

  for (const startNode of Object.keys(vertAdj)) {
    if (visited.has(startNode)) continue;

    const component: string[] = [];
    const queue = [startNode];
    visited.add(startNode);

    while (queue.length > 0) {
      const cur = queue.shift()!;
      component.push(cur);
      for (const neighbor of vertAdj[cur] ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    const nodesByFloor: Record<string, string> = {};
    for (const nodeId of component) {
      const node = graph.nodesById[nodeId];
      if (node) nodesByFloor[node.floorId] = nodeId;
    }

    shafts.push({
      nodesByFloor,
      kind: getShaftKind(component, transportType),
    });
  }

  return shafts;
}

function getShaftPath(
  graph: Graph,
  shaft: Shaft,
  fromFloor: string,
  toFloor: string
): { path: string[]; distance: number } {
  const floors = Object.keys(shaft.nodesByFloor).sort(
    (a, b) => FLOOR_ORDER.indexOf(a as FloorId) - FLOOR_ORDER.indexOf(b as FloorId)
  );

  const fromIdx = floors.indexOf(fromFloor);
  const toIdx = floors.indexOf(toFloor);
  if (fromIdx < 0 || toIdx < 0) return { path: [], distance: Infinity };

  const step = fromIdx < toIdx ? 1 : -1;
  const path: string[] = [];
  let distance = 0;

  let i = fromIdx;
  while (true) {
    const nodeId = shaft.nodesByFloor[floors[i]]!;
    path.push(nodeId);
    if (i !== fromIdx) {
      const prevIdx = i - step;
      const prevId = shaft.nodesByFloor[floors[prevIdx]]!;
      const edge = getEdge(graph, prevId, nodeId);
      distance += edge?.distance ?? 20;
    }
    if (i === toIdx) break;
    i += step;
  }

  return { path, distance };
}

function combinePaths(...paths: string[][]): string[] {
  const result: string[] = [];
  for (const path of paths) {
    if (path.length === 0) continue;
    if (result.length === 0) {
      result.push(...path);
    } else {
      result.push(...path.slice(1));
    }
  }
  return result;
}

function buildRouteResult(
  graph: Graph,
  startNodeId: string,
  endNodeId: string,
  path: string[],
  distance: number
): ComputedRoute {
  const segments = splitByFloor(path, graph);
  return {
    startNodeId,
    endNodeId,
    nodeIds: path,
    distance,
    segments,
    found: path.length > 0,
    steps: buildRouteSteps(path, graph),
  };
}

/**
 * 按模式寻找优选路线（comfort 优先电梯，fast 优先楼梯）
 */
export function findPreferredRoute(
  graph: Graph,
  startNodeId: string,
  endNodeId: string,
  mode: RouteMode
): ComputedRoute {
  const empty = buildRouteResult(graph, startNodeId, endNodeId, [], Infinity);
  empty.found = false;
  empty.distance = 0;
  empty.steps = [];

  const startNode = graph.nodesById[startNodeId];
  const endNode = graph.nodesById[endNodeId];
  if (!startNode || !endNode) return empty;

  if (startNode.floorId === endNode.floorId) {
    const { path, distance } = dijkstra(graph, startNodeId, endNodeId, [
      "elevator",
      "stairs",
    ]);
    return buildRouteResult(graph, startNodeId, endNodeId, path, distance);
  }

  const shafts = [
    ...identifyShafts(graph, "elevator"),
    ...identifyShafts(graph, "stairs"),
  ];

  let best: {
    path: string[];
    distance: number;
    priority: number;
  } | null = null;

  for (const shaft of shafts) {
    if (shaft.kind === "externalZeroFloorStair" && endNode.floorId !== "0F") {
      continue;
    }

    const entryId = shaft.nodesByFloor[startNode.floorId];
    const exitId = shaft.nodesByFloor[endNode.floorId];
    if (!entryId || !exitId) continue;

    const leg1 = dijkstra(graph, startNodeId, entryId, ["elevator", "stairs"]);
    if (leg1.distance === Infinity) continue;

    const leg2 = getShaftPath(
      graph,
      shaft,
      startNode.floorId,
      endNode.floorId
    );
    if (leg2.distance === Infinity) continue;

    const leg3 = dijkstra(graph, exitId, endNodeId, ["elevator", "stairs"]);
    if (leg3.distance === Infinity) continue;

    const totalDist = leg1.distance + leg2.distance + leg3.distance;
    const priority = modePriority(mode, shaft.kind);
    const combined = combinePaths(leg1.path, leg2.path, leg3.path);

    let isBetter = false;
    if (!best) {
      isBetter = true;
    } else if (mode === "fast") {
      isBetter =
        totalDist < best.distance ||
        (totalDist === best.distance && priority < best.priority);
    } else {
      isBetter =
        priority < best.priority ||
        (priority === best.priority && totalDist < best.distance);
    }

    if (isBetter) {
      best = { path: combined, distance: totalDist, priority };
    }
  }

  if (!best) return empty;
  return buildRouteResult(
    graph,
    startNodeId,
    endNodeId,
    best.path,
    best.distance
  );
}

export interface DualRouteResult {
  comfort: ComputedRoute;
  fast: ComputedRoute;
  hasMultipleRoutes: boolean;
}

/**
 * 同时计算舒适与快速两种方案
 */
export function findDualRoutes(
  graph: Graph,
  startNodeId: string,
  endNodeId: string
): DualRouteResult {
  const startNode = graph.nodesById[startNodeId];
  const endNode = graph.nodesById[endNodeId];

  if (!startNode || !endNode) {
    const empty = buildRouteResult(graph, startNodeId, endNodeId, [], 0);
    empty.found = false;
    empty.steps = [];
    return {
      comfort: empty,
      fast: { ...empty, steps: [] },
      hasMultipleRoutes: false,
    };
  }

  if (startNode.floorId === endNode.floorId) {
    const route = findPreferredRoute(graph, startNodeId, endNodeId, "comfort");
    return {
      comfort: route,
      fast: route,
      hasMultipleRoutes: false,
    };
  }

  const comfort = findPreferredRoute(graph, startNodeId, endNodeId, "comfort");
  const fast = findPreferredRoute(graph, startNodeId, endNodeId, "fast");

  const hasMultipleRoutes =
    comfort.found &&
    fast.found &&
    comfort.nodeIds.join("|") !== fast.nodeIds.join("|");

  return { comfort, fast, hasMultipleRoutes };
}

/**
 * 路径规划主函数
 */
export function findRoute(
  graph: Graph,
  startNodeId: string,
  endNodeId: string
): RouteResult {
  const emptyResult: RouteResult = {
    startNodeId,
    endNodeId,
    nodeIds: [],
    distance: 0,
    segments: [],
    found: false,
  };

  // 验证节点存在
  const startNode = graph.nodesById[startNodeId];
  const endNode = graph.nodesById[endNodeId];

  if (!startNode || !endNode) {
    console.warn("Start or end node not found");
    return emptyResult;
  }

  // 起终点相同
  if (startNodeId === endNodeId) {
    return {
      startNodeId,
      endNodeId,
      nodeIds: [startNodeId],
      distance: 0,
      segments: [
        {
          floorId: startNode.floorId,
          nodeIds: [startNodeId],
          points: [{ x: startNode.x, y: startNode.y, id: startNodeId }],
        },
      ],
      found: true,
    };
  }

  // 判断是否同楼层
  const sameFloor = startNode.floorId === endNode.floorId;

  // 同楼层：优先只走 flat 边
  // 跨楼层：允许所有边类型
  const excludeTypes: EdgeType[] = sameFloor ? ["elevator", "stairs"] : [];

  let { path, distance } = dijkstra(graph, startNodeId, endNodeId, excludeTypes);

  // 如果同楼层找不到路径，尝试允许所有边类型
  if (path.length === 0 && sameFloor) {
    const fallback = dijkstra(graph, startNodeId, endNodeId, []);
    path = fallback.path;
    distance = fallback.distance;
  }

  if (path.length === 0) {
    return emptyResult;
  }

  // 按楼层分割路径
  const segments = splitByFloor(path, graph);

  return {
    startNodeId,
    endNodeId,
    nodeIds: path,
    distance,
    segments,
    found: true,
  };
}

/**
 * 获取路径的文字描述
 */
export function getRouteDescription(
  routeResult: RouteResult,
  graph: Graph
): string {
  if (!routeResult.found) {
    return "未找到路径";
  }

  const descriptions: string[] = [];

  for (const segment of routeResult.segments) {
    const startNode = graph.nodesById[segment.nodeIds[0]];
    const endNode = graph.nodesById[segment.nodeIds[segment.nodeIds.length - 1]];
    if (startNode && endNode) {
      descriptions.push(
        `${segment.floorId}: ${startNode.label || startNode.id} → ${endNode.label || endNode.id}`
      );
    }
  }

  return descriptions.join(" → ");
}
