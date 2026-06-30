/**
 * 图结构构建和操作
 */

import type {
  MapNode,
  MapEdge,
  Graph,
  GraphAdjacencyItem,
  Floor,
  POI,
  FloorId,
} from "../types/indoor";
import { FLOOR_ORDER } from "../data";
import { normalizeOrthogonalGraph } from "./orthogonalGraph";

/**
 * 生成边的唯一键
 * 由于是无向图，from-to 和 to-from 应该生成相同的 key
 */
export function getEdgeKey(from: string, to: string): string {
  return from < to ? `${from}|${to}` : `${to}|${from}`;
}

/**
 * 创建图结构
 */
export function createGraph(nodes: MapNode[], edges: MapEdge[]): Graph {
  const { nodes: normalizedNodes, edges: normalizedEdges } =
    normalizeOrthogonalGraph(nodes, edges);

  // 构建 nodesById
  const nodesById: Record<string, MapNode> = {};
  for (const node of normalizedNodes) {
    nodesById[node.id] = node;
  }

  // 过滤无效边（引用不存在节点的边）
  const validEdges = normalizedEdges.filter((edge) => {
    const fromExists = nodesById[edge.from] !== undefined;
    const toExists = nodesById[edge.to] !== undefined;
    if (!fromExists || !toExists) {
      console.warn(
        `Invalid edge: ${edge.from} -> ${edge.to} (node not found)`
      );
      return false;
    }
    return true;
  });

  // 构建 adjacency 邻接表（无向图，双向添加）
  const adjacency: Record<string, GraphAdjacencyItem[]> = {};
  for (const node of normalizedNodes) {
    adjacency[node.id] = [];
  }

  for (const edge of validEdges) {
    // from -> to
    adjacency[edge.from].push({
      to: edge.to,
      edge,
    });
    // to -> from (无向图)
    adjacency[edge.to].push({
      to: edge.from,
      edge,
    });
  }

  // 构建 edgesByKey
  const edgesByKey: Record<string, MapEdge> = {};
  for (const edge of validEdges) {
    const key = getEdgeKey(edge.from, edge.to);
    edgesByKey[key] = edge;
  }

  return {
    nodesById,
    adjacency,
    edgesByKey,
    edges: validEdges,
    nodes: normalizedNodes,
  };
}

/**
 * 获取边
 */
export function getEdge(
  graph: Graph,
  from: string,
  to: string
): MapEdge | undefined {
  const key = getEdgeKey(from, to);
  return graph.edgesByKey[key];
}

/**
 * 获取两节点之间的邻接项
 */
export function getAdjacencyItem(
  graph: Graph,
  from: string,
  to: string
): GraphAdjacencyItem | undefined {
  const items = graph.adjacency[from];
  if (!items) return undefined;
  return items.find((item) => item.to === to);
}

/**
 * 获取 POI 节点列表（排除 junction）
 * POI 可作为起终点
 */
export function getPOINodes(graph: Graph): POI[] {
  const poiTypes = new Set(["room", "toilet", "exit", "elevator", "stairs"]);
  const pois: POI[] = [];

  for (const node of graph.nodes) {
    if (poiTypes.has(node.type)) {
      pois.push({
        id: node.id,
        label: node.label || node.id,
        type: node.type,
        floorId: node.floorId,
        building: node.building,
        x: node.x,
        y: node.y,
      });
    }
  }

  // 按楼层和标签排序
  pois.sort((a, b) => {
    const floorDiff =
      FLOOR_ORDER.indexOf(a.floorId) - FLOOR_ORDER.indexOf(b.floorId);
    if (floorDiff !== 0) return floorDiff;
    return a.label.localeCompare(b.label);
  });

  return pois;
}

/**
 * 获取楼层列表
 */
export function getFloors(graph: Graph, building: string = "S"): Floor[] {
  // 获取该建筑中实际存在的楼层
  const existingFloors = new Set<FloorId>();
  for (const node of graph.nodes) {
    if (node.building === building) {
      existingFloors.add(node.floorId);
    }
  }

  // 按 FLOOR_ORDER 顺序返回
  return FLOOR_ORDER.filter((floorId) => existingFloors.has(floorId)).map(
    (floorId) => ({
      id: floorId,
      name: floorId,
      building,
    })
  );
}

/**
 * 获取指定楼层的节点
 */
export function getFloorNodes(graph: Graph, floorId: FloorId): MapNode[] {
  return graph.nodes.filter((node) => node.floorId === floorId);
}

/**
 * 获取指定楼层的边（两端节点都在该楼层，或是跨楼层边）
 */
export function getFloorEdges(
  graph: Graph,
  floorId: FloorId,
  includeVertical: boolean = false
): MapEdge[] {
  return graph.edges.filter((edge) => {
    const fromNode = graph.nodesById[edge.from];
    const toNode = graph.nodesById[edge.to];
    if (!fromNode || !toNode) return false;

    // 同楼层的 flat 边
    if (fromNode.floorId === floorId && toNode.floorId === floorId) {
      return true;
    }

    // 如果包含垂直边，检查是否有一端在该楼层
    if (includeVertical && (edge.edgeType === "elevator" || edge.edgeType === "stairs")) {
      return fromNode.floorId === floorId || toNode.floorId === floorId;
    }

    return false;
  });
}

/**
 * 获取节点的相邻节点 ID 列表
 */
export function getNeighbors(graph: Graph, nodeId: string): string[] {
  const items = graph.adjacency[nodeId];
  if (!items) return [];
  return items.map((item) => item.to);
}
