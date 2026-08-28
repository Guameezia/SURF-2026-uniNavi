import { describe, expect, it } from "vitest";
import { createGraph } from "./graph";
import { buildGuideRouteGeometry, resolveRoomToNodeId } from "./guideRouteGeometry";
import { sEdges, sNodes } from "../data";
import type { GuideRouteStop } from "../types/guide";
import { getGuideLegInstruction } from "../utils/guideProgress";

function stop(
  noteId: string,
  floorId: GuideRouteStop["floorId"],
  roomId: string
): GuideRouteStop {
  return { noteId, floorId, roomId, roomLabel: roomId, noteText: noteId };
}

describe("guide route geometry", () => {
  it("builds a visible cross-floor segment to Tongfa", () => {
    const graph = createGraph(sNodes, sEdges);
    const stops = [
      stop("one", "1F", "1f-sa164"),
      stop("two", "0F", "tongfa-canteen"),
    ];

    expect(resolveRoomToNodeId(graph, "1F", "1f-sa164")).toBeTruthy();
    expect(resolveRoomToNodeId(graph, "0F", "tongfa-canteen")).toBe(
      "S_0F_Tongfa_Canteen"
    );

    const geometry = buildGuideRouteGeometry(graph, stops);
    expect(geometry.complete).toBe(true);
    expect(geometry.legs[0].found).toBe(true);
    expect(
      geometry.legs[0].segments.find((segment) => segment.floorId === "0F")
        ?.points.length
    ).toBeGreaterThan(1);
  });

  it("uses the comfort route for an accessible guide", () => {
    const graph = createGraph(sNodes, sEdges);
    const geometry = buildGuideRouteGeometry(
      graph,
      [
        stop("one", "1F", "1f-sa164"),
        stop("two", "0F", "tongfa-canteen"),
      ],
      true
    );

    expect(geometry.complete).toBe(true);
    expect(
      geometry.legs[0].segments.some((segment) =>
        segment.nodeIds.some((nodeId) => nodeId.includes("ELEV"))
      )
    ).toBe(true);
    const instruction = getGuideLegInstruction(
        {
          id: "accessible",
          name: "无障碍路线",
          description: "test",
          tags: ["accessible"],
          estimatedMinutes: 10,
          stops: [
            stop("one", "1F", "1f-sa164"),
            stop("two", "0F", "tongfa-canteen"),
          ],
          geometry,
          createdAt: 1,
          updatedAt: 1,
        },
        0
      );
    expect(instruction).toMatch(/^前往 [A-Z]{2} (西侧|东侧)电梯，下至 0F$/);
  });
});
