import { describe, expect, it } from "vitest";
import type { FloorId } from "../types/indoor";
import type { Direction, RoomDef } from "../types/room";
import { getRoomsForFloor } from "./roomConfig";
import { resolveNeighborDirections } from "./roomDirections";

const FLOORS: FloorId[] = ["0F", "1F", "2F", "3F", "4F", "5F"];
const DIRS: Direction[] = ["up", "down", "left", "right"];

function makeRoom(
  id: string,
  cx: number,
  cy: number,
  neighbors: RoomDef["neighbors"]
): RoomDef {
  return {
    id,
    label: id,
    floorId: "0F",
    viewWidth: 640,
    viewHeight: 400,
    neighbors,
    overviewRect: { x: cx - 5, y: cy - 5, w: 10, h: 10 },
  };
}

describe("resolveNeighborDirections", () => {
  it("将四个明确方向的相邻房间对齐 SVG 几何（y 向下为南）", () => {
    const rooms = [
      makeRoom("c", 100, 100, {
        up: "n",
        down: "s",
        left: "w",
        right: "e",
      }),
      makeRoom("n", 100, 20, {}),
      makeRoom("s", 100, 180, {}),
      makeRoom("w", 20, 100, {}),
      makeRoom("e", 180, 100, {}),
    ];
    const center = resolveNeighborDirections(rooms).find((r) => r.id === "c")!;
    expect(center.neighbors).toEqual({
      up: "n",
      down: "s",
      left: "w",
      right: "e",
    });
  });

  it("即使原方向键标错，也按几何重排（north 被误标成 down 时修正为 up）", () => {
    const rooms = [
      makeRoom("c", 100, 100, { down: "n", up: "s" }),
      makeRoom("n", 100, 20, {}),
      makeRoom("s", 100, 180, {}),
    ];
    const center = resolveNeighborDirections(rooms).find((r) => r.id === "c")!;
    expect(center.neighbors.up).toBe("n");
    expect(center.neighbors.down).toBe("s");
  });

  it("方向争用时更贴合的房间胜出，另一方退居空闲方向且不丢失连通", () => {
    // 两个都在西侧：farW 更纯粹向西，nearNW 略偏北
    const rooms = [
      makeRoom("c", 100, 100, { left: "farW", up: "nearNW" }),
      makeRoom("farW", 10, 100, {}),
      makeRoom("nearNW", 40, 70, {}),
    ];
    const center = resolveNeighborDirections(rooms).find((r) => r.id === "c")!;
    expect(center.neighbors.left).toBe("farW");
    // nearNW 仍保留（连通不丢失），落在几何次优的空闲方向
    const ids = DIRS.map((d) => center.neighbors[d]).filter(Boolean);
    expect(ids).toContain("nearNW");
    expect(ids).toContain("farW");
  });

  it("合并指向同一房间的重复方向键", () => {
    const rooms = [
      makeRoom("c", 100, 100, { up: "dup", left: "dup", right: "other" }),
      makeRoom("dup", 100, 20, {}),
      makeRoom("other", 180, 100, {}),
    ];
    const center = resolveNeighborDirections(rooms).find((r) => r.id === "c")!;
    const dupDirs = DIRS.filter((d) => center.neighbors[d] === "dup");
    expect(dupDirs).toHaveLength(1);
    expect(center.neighbors.right).toBe("other");
  });

  it("幂等：再次解析结果不变", () => {
    for (const floor of FLOORS) {
      const once = getRoomsForFloor(floor);
      const twice = resolveNeighborDirections(once);
      for (let i = 0; i < once.length; i++) {
        expect(twice[i].neighbors).toEqual(once[i].neighbors);
      }
    }
  });

  describe.each(FLOORS)("楼层不变量 %s", (floor) => {
    const rooms = getRoomsForFloor(floor);
    const idSet = new Set(rooms.map((r) => r.id));

    it("每个方向键指向不同的合法房间（无重复、无悬空）", () => {
      for (const room of rooms) {
        const targets = DIRS.map((d) => room.neighbors[d]).filter(
          (v): v is string => !!v
        );
        expect(new Set(targets).size).toBe(targets.length);
        for (const t of targets) {
          expect(idSet.has(t)).toBe(true);
        }
      }
    });

    it("每条方向连边与两房间中心的相对几何一致", () => {
      const byId = new Map(rooms.map((r) => [r.id, r]));
      const centerOf = (r: RoomDef) => ({
        x: r.overviewRect.x + r.overviewRect.w / 2,
        y: r.overviewRect.y + r.overviewRect.h / 2,
      });
      const UNIT: Record<Direction, { x: number; y: number }> = {
        up: { x: 0, y: -1 },
        down: { x: 0, y: 1 },
        left: { x: -1, y: 0 },
        right: { x: 1, y: 0 },
      };

      for (const room of rooms) {
        const src = centerOf(room);
        const assigned = DIRS.filter((d) => room.neighbors[d]);
        for (const dir of assigned) {
          const target = byId.get(room.neighbors[dir]!)!;
          const tc = centerOf(target);
          const dx = tc.x - src.x;
          const dy = tc.y - src.y;
          const len = Math.hypot(dx, dy) || 1;
          const score = (UNIT[dir].x * dx + UNIT[dir].y * dy) / len;
          // 该方向要么是本房间所有相邻里几何最贴合的方向之一，
          // 要么是方向争用后被迫落到的空闲槽——此时其它更贴合的边已占用同方向。
          const contested = assigned.some(
            (other) =>
              other !== dir &&
              (() => {
                const ot = byId.get(room.neighbors[other]!)!;
                const oc = centerOf(ot);
                const odx = oc.x - src.x;
                const ody = oc.y - src.y;
                const olen = Math.hypot(odx, ody) || 1;
                return (
                  (UNIT[dir].x * odx + UNIT[dir].y * ody) / olen > score
                );
              })()
          );
          // 非争用时，分数必须为正（确实位于该方向一侧）
          if (!contested) {
            expect(score).toBeGreaterThan(0);
          }
        }
      }
    });
  });
});
