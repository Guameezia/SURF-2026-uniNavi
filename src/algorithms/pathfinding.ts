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
} from "../types/indoor";
import { FLOOR_ORDER } from "../data";

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
