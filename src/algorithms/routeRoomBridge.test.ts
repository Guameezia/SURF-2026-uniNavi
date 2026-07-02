import { describe, expect, it, beforeEach } from "vitest";
import { sEdges, sNodes } from "../data";
import { createGraph } from "./graph";
import { findRoute } from "./pathfinding";
import {
  _resetNodeRoomCache,
  buildRoomRoutePlan,
  buildRoomSequence,
  getNextRouteRoom,
  resolveNodeToRoomId,
} from "./routeRoomBridge";

const graph = createGraph(sNodes, sEdges);

describe("routeRoomBridge", () => {
  beforeEach(() => {
    _resetNodeRoomCache();
  });

  it("maps stair nodes to room ids explicitly", () => {
    expect(resolveNodeToRoomId(graph, "0F", "S_0F_SA_STAIR_W")).toBe(
      "sa-stair-west"
    );
    expect(resolveNodeToRoomId(graph, "1F", "S_1F_SA_J_W")).toBe(
      "1f-sa-corridor-west"
    );
  });

  it("builds room sequence from node path on 0F", () => {
    const route = findRoute(graph, "S_0F_SA_STAIR_W", "S_0F_SA_STAIR_E");
    expect(route.found).toBe(true);
    const rooms = buildRoomSequence(graph, "0F", route.nodeIds);
    expect(rooms.length).toBeGreaterThan(0);
    expect(rooms[0]).toBe("sa-stair-west");
  });

  it("builds room route plan for cross-floor route", () => {
    const route = findRoute(graph, "S_0F_SA_STAIR_W", "S_1F_SA_J_E");
    expect(route.found).toBe(true);
    const plan = buildRoomRoutePlan(graph, route);
    expect(plan).not.toBeNull();
    expect(plan!.segments.length).toBeGreaterThanOrEqual(2);
    expect(plan!.segments[0]!.floorId).toBe("0F");
    expect(plan!.segments[1]!.floorId).toBe("1F");
  });

  it("getNextRouteRoom returns following room", () => {
    const ids = ["a", "b", "c"];
    expect(getNextRouteRoom(ids, "a")).toBe("b");
    expect(getNextRouteRoom(ids, "c")).toBeNull();
    expect(getNextRouteRoom(ids, "unknown")).toBe("a");
  });
});
