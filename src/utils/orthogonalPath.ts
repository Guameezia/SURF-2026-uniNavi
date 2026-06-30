import type { Graph, MapPoint } from "../types/indoor";
import { getEdge } from "../algorithms/graph";
import {
  getTraversedEdgePathPoints,
  simplifyOrthogonalPath,
} from "../algorithms/orthogonalGraph";

function isSamePoint(a: MapPoint, b: MapPoint): boolean {
  return Math.abs(a.x - b.x) < 0.01 && Math.abs(a.y - b.y) < 0.01;
}

/**
 * 将路径点列展开为正交折线（仅水平/垂直线段）
 */
export function buildOrthogonalPath(
  points: MapPoint[],
  nodeIds: string[],
  graph: Graph
): MapPoint[] {
  if (points.length === 0) return [];

  const result: MapPoint[] = [points[0]];

  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i];
    const to = points[i + 1];
    const fromId = nodeIds[i];
    const toId = nodeIds[i + 1];

    const edge =
      getEdge(graph, fromId, toId) || getEdge(graph, toId, fromId);

    const segmentPoints = edge
      ? getTraversedEdgePathPoints(edge, graph.nodesById, fromId)
      : [from, to];

    for (const point of segmentPoints.slice(1)) {
      const last = result[result.length - 1];
      if (!isSamePoint(last, point)) {
        result.push(point);
      }
    }
  }

  return simplifyOrthogonalPath(result);
}
