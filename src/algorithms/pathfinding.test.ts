import { describe, expect, it } from "vitest";
import { sEdges, sNodes } from "../data";
import type { MapEdge, MapNode } from "../types/indoor";
import { createGraph } from "./graph";
import { findRoute, getRouteDescription } from "./pathfinding";

function makeNode(overrides: Partial<MapNode> & Pick<MapNode, "id">): MapNode {
  return {
    type: "junction",
    label: overrides.id,
    building: "S",
    floorId: "1F",
    block: "SA",
    x: 0,
    y: 0,
    ...overrides,
  };
}

function makeEdge(
  from: string,
  to: string,
  distance: number,
  edgeType: MapEdge["edgeType"] = "flat"
): MapEdge {
  return { from, to, distance, edgeType, directionHint: "east" };
}

describe("findRoute", () => {
  it("returns zero-distance route when start equals end", () => {
    const nodes = [makeNode({ id: "A", x: 100, y: 200, label: "Room A" })];
    const graph = createGraph(nodes, []);

    const result = findRoute(graph, "A", "A");

    expect(result.found).toBe(true);
    expect(result.distance).toBe(0);
    expect(result.nodeIds).toEqual(["A"]);
    expect(result.segments).toHaveLength(1);
    expect(result.segments[0]?.floorId).toBe("1F");
    expect(result.segments[0]?.nodeIds).toEqual(["A"]);
  });

  it("finds the shortest path between connected nodes", () => {
    const nodes = [
      makeNode({ id: "A", x: 0, y: 0 }),
      makeNode({ id: "B", x: 10, y: 0 }),
      makeNode({ id: "C", x: 10, y: 20 }),
    ];
    const edges = [makeEdge("A", "B", 10), makeEdge("B", "C", 20)];
    const graph = createGraph(nodes, edges);

    const result = findRoute(graph, "A", "C");

    expect(result.found).toBe(true);
    expect(result.nodeIds).toEqual(["A", "B", "C"]);
    expect(result.distance).toBe(30);
  });

  it("returns not found when nodes are disconnected", () => {
    const nodes = [
      makeNode({ id: "A" }),
      makeNode({ id: "B", x: 10, y: 0 }),
      makeNode({ id: "C", x: 20, y: 0 }),
    ];
    const graph = createGraph(nodes, [makeEdge("B", "C", 10)]);

    const result = findRoute(graph, "A", "C");

    expect(result.found).toBe(false);
    expect(result.nodeIds).toEqual([]);
    expect(result.distance).toBe(0);
  });

  it("returns not found when start or end node is missing", () => {
    const nodes = [makeNode({ id: "A" })];
    const graph = createGraph(nodes, []);

    expect(findRoute(graph, "A", "MISSING").found).toBe(false);
    expect(findRoute(graph, "MISSING", "A").found).toBe(false);
  });
});

describe("findRoute with S building data", () => {
  const graph = createGraph(sNodes, sEdges);

  it("finds a same-floor route between SA164 and SA169", () => {
    const result = findRoute(graph, "S_1F_SA164", "S_1F_SA169");

    expect(result.found).toBe(true);
    expect(result.nodeIds[0]).toBe("S_1F_SA164");
    expect(result.nodeIds.at(-1)).toBe("S_1F_SA169");
    expect(result.segments.every((segment) => segment.floorId === "1F")).toBe(
      true
    );
    expect(result.distance).toBeGreaterThanOrEqual(0);
  });

  it("builds a human-readable route description", () => {
    const result = findRoute(graph, "S_1F_SA164", "S_1F_SA169");

    expect(getRouteDescription(result, graph)).not.toBe("未找到路径");
  });
});
