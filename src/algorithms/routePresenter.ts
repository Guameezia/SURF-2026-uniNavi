/**
 * 路径步骤文案生成（对齐 uni-navi-ios RoutePresenter）
 */

import type { Graph, MapNode } from "../types/indoor";
import { getEdge } from "./graph";

function describeNodeBriefly(node: MapNode | undefined): string {
  if (!node) return "unknown";
  switch (node.type) {
    case "junction":
      return "";
    case "room":
      return node.label || node.id;
    case "toilet":
      return "toilet";
    case "elevator":
      return "elevator";
    case "stairs":
      return "stairs";
    case "exit":
      return "exit";
    default:
      return node.label || node.id;
  }
}

function describeBlock(block: string): string {
  return block ? `block ${block}` : "";
}

function isThirdFloorExitNode(node: MapNode): boolean {
  return node.id.includes("EXIT_1F3F");
}

function getMajorDirection(directions: string[]): string {
  if (directions.length === 0) return "";
  const counts: Record<string, number> = {};
  for (const d of directions) {
    counts[d] = (counts[d] ?? 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

interface WalkSegmentResult {
  endIndex: number;
  startNode: MapNode;
  endNode: MapNode;
  visitedLandmarks: MapNode[];
  directions: string[];
}

function collectWalkSegment(
  pathNodeIds: string[],
  startIdx: number,
  graph: Graph
): WalkSegmentResult {
  const nodesById = graph.nodesById;
  let i = startIdx;
  const visitedLandmarks: MapNode[] = [];
  const directions: string[] = [];

  while (i < pathNodeIds.length - 1) {
    const node = nodesById[pathNodeIds[i]];
    const nextNode = nodesById[pathNodeIds[i + 1]];
    if (!node || !nextNode) break;

    const edge = getEdge(graph, node.id, nextNode.id);
    if (!edge || edge.edgeType !== "flat") break;

    if (node.type !== "junction" && i > startIdx) {
      visitedLandmarks.push(node);
    }
    if (edge.directionHint) {
      directions.push(String(edge.directionHint));
    }
    i += 1;
  }

  return {
    endIndex: i,
    startNode: nodesById[pathNodeIds[startIdx]]!,
    endNode: nodesById[pathNodeIds[i]]!,
    visitedLandmarks,
    directions,
  };
}

function describeWalkSegment(result: WalkSegmentResult): string {
  const { startNode, endNode, visitedLandmarks, directions } = result;
  if (startNode.id === endNode.id) return "";

  const dirText = getMajorDirection(directions);
  const startDesc = describeNodeBriefly(startNode);
  const endDesc = describeNodeBriefly(endNode);
  const startIsJunction = startNode.type === "junction";
  const endIsJunction = endNode.type === "junction";

  if (startIsJunction && endIsJunction) {
    return `Walk ${dirText} along the corridor`;
  }
  if (startIsJunction && !endIsJunction) {
    return `Go ${dirText} to ${endDesc}`;
  }
  if (!startIsJunction && endIsJunction) {
    return `From ${startDesc}, walk ${dirText} along the corridor`;
  }

  const landmarkNames = visitedLandmarks
    .filter((n) => n.type !== "junction")
    .map((n) => describeNodeBriefly(n))
    .filter(Boolean)
    .slice(0, 2);

  const passBy =
    landmarkNames.length > 0
      ? `, passing ${landmarkNames.join(" and ")}`
      : "";

  return `Go ${dirText} to ${endDesc}${passBy}`;
}

/**
 * 将节点路径转为分步指引文案
 */
export function buildRouteSteps(
  pathNodeIds: string[],
  graph: Graph
): string[] {
  if (pathNodeIds.length < 2) return [];

  const nodesById = graph.nodesById;
  const startNode = nodesById[pathNodeIds[0]];
  const endNode = nodesById[pathNodeIds[pathNodeIds.length - 1]];
  if (!startNode || !endNode) return [];

  const steps: string[] = [
    `Start from ${describeNodeBriefly(startNode)} (${startNode.floorId} ${describeBlock(startNode.block)})`,
  ];

  let i = 0;
  while (i < pathNodeIds.length - 1) {
    const node = nodesById[pathNodeIds[i]];
    const nextNode = nodesById[pathNodeIds[i + 1]];
    if (!node || !nextNode) {
      i += 1;
      continue;
    }

    const edge = getEdge(graph, node.id, nextNode.id);

    if (edge?.edgeType === "elevator") {
      const fromFloor = node.floorId;
      let toFloor = nextNode.floorId;
      let j = i + 1;
      while (j < pathNodeIds.length - 1) {
        const e = getEdge(graph, pathNodeIds[j], pathNodeIds[j + 1]);
        if (e?.edgeType === "elevator") {
          toFloor = nodesById[pathNodeIds[j + 1]]!.floorId;
          j += 1;
        } else {
          break;
        }
      }
      steps.push(`Take the elevator from ${fromFloor} to ${toFloor}`);
      i = j;
      continue;
    }

    if (edge?.edgeType === "stairs") {
      const fromFloor = node.floorId;
      let toFloor = nextNode.floorId;
      let j = i + 1;
      let usesThirdFloorExit =
        isThirdFloorExitNode(node) || isThirdFloorExitNode(nextNode);
      while (j < pathNodeIds.length - 1) {
        const e = getEdge(graph, pathNodeIds[j], pathNodeIds[j + 1]);
        if (e?.edgeType === "stairs") {
          const nextN = nodesById[pathNodeIds[j + 1]]!;
          usesThirdFloorExit =
            usesThirdFloorExit || isThirdFloorExitNode(nextN);
          toFloor = nextN.floorId;
          j += 1;
        } else {
          break;
        }
      }
      if (usesThirdFloorExit) {
        steps.push(
          `Use the 3F entrance/exit from ${fromFloor} to ${toFloor}`
        );
      } else {
        steps.push(`Take the stairs from ${fromFloor} to ${toFloor}`);
      }
      i = j;
      continue;
    }

    const walkResult = collectWalkSegment(pathNodeIds, i, graph);
    if (walkResult.endIndex > i) {
      const desc = describeWalkSegment(walkResult);
      if (desc) steps.push(desc);
      i = walkResult.endIndex;
      continue;
    }

    i += 1;
  }

  steps.push(
    `Arrive at ${describeNodeBriefly(endNode)} (${endNode.floorId} ${describeBlock(endNode.block)})`
  );

  return steps;
}
