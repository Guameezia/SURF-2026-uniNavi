/**
 * 星露谷式分房间导航 — 0F MVP
 * 走廊独立成 room；默认从主入口走廊开始
 *
 * overviewRect 使用 SVG viewBox 坐标，与 S_0F.svg / S_1F.svg 底图一致。
 * 区域矩形由 svgFloorZones.ts 从 CAD 解析维护。
 */

import type { FloorId } from "../types/indoor";
import type { RoomDef, ViewpointDef, StairFloorLink, ElevatorFloorLink, OverviewRect } from "../types/room";
import { BUILDING_ID, getFloorModelOffset } from "./floorGeometry";
import {
  ZONES_0F,
  ZONES_1F,
  ZONES_UPPER,
  VERTICAL_SHAFT_CENTERS,
  iconZoneRect,
  type UpperFloorZones,
} from "./svgFloorZones";
import {
  ELEVATOR_FLOOR_LINKS,
  STAIR_FLOOR_LINKS,
  VERTICAL_SHAFTS,
  buildShaftPortal,
  elevSiblingKey,
  getShaftBinding,
  stairSiblingKey,
  type VerticalShaft,
} from "./floorPortals";

const BUILDING = BUILDING_ID;
const ROOM_VIEW = { viewWidth: 640, viewHeight: 400 };
const STAIR_VIEW = { viewWidth: 480, viewHeight: 320 };

export const FLOOR_0F_OVERVIEW = {
  width: 760,
  height: 720,
  imageSrc: "/maps/S_0F.svg",
};

export const FLOOR_1F_OVERVIEW = {
  width: 560,
  height: 680,
  imageSrc: "/maps/S_1F.svg",
};

const FLOOR_OVERVIEWS: Record<FloorId, { width: number; height: number; imageSrc: string }> = {
  "0F": FLOOR_0F_OVERVIEW,
  "1F": FLOOR_1F_OVERVIEW,
  "2F": { width: 520, height: 690, imageSrc: "/maps/S_2F.svg" },
  "3F": { width: 522, height: 681, imageSrc: "/maps/S_3F.svg" },
  "4F": { width: 522, height: 681, imageSrc: "/maps/S_4F.svg" },
  "5F": { width: 521, height: 681, imageSrc: "/maps/S_5F.svg" },
};

export function getFloorOverview(floorId: FloorId) {
  return FLOOR_OVERVIEWS[floorId] ?? FLOOR_0F_OVERVIEW;
}

/** 跨层竖井连接定义见 floorPortals.ts（单一数据源） */
export { STAIR_FLOOR_LINKS, ELEVATOR_FLOOR_LINKS } from "./floorPortals";

const STAIR_LINK_BY_ROOM_0F = new Map(STAIR_FLOOR_LINKS.map((l) => [l.room0F, l]));
const ELEV_LINK_BY_ROOM_0F = new Map(ELEVATOR_FLOOR_LINKS.map((l) => [l.room0F, l]));

export function getStairFloorLink(room0F: string): StairFloorLink | undefined {
  return STAIR_LINK_BY_ROOM_0F.get(room0F);
}

export function getElevatorFloorLink(room0F: string): ElevatorFloorLink | undefined {
  return ELEV_LINK_BY_ROOM_0F.get(room0F);
}

const BLOCK_LABEL: Record<string, string> = {
  sa: "SA",
  sb: "SB",
  sc: "SC",
  sd: "SD",
};

function shaftLabel(shaft: VerticalShaft): string {
  const block = BLOCK_LABEL[shaft.shaftKey.split("-")[0]] ?? "";
  const side = shaft.isWest ? "西" : "东";
  return shaft.kind === "stair"
    ? `${block} 楼梯（${side}）`
    : `${block} 电梯（${side}）`;
}

function shaftCenter(floorId: FloorId, shaftKey: string) {
  return VERTICAL_SHAFT_CENTERS[floorId]?.[shaftKey];
}

function shaftIconRect(
  floorId: FloorId,
  centerX: number,
  centerY: number,
  isStair: boolean
): OverviewRect {
  if (floorId === "1F") {
    const { w, h } = isStair ? ZONES_1F.stairIconSize : ZONES_1F.elevIconSize;
    return iconZoneRect(centerX, centerY, w, h);
  }
  if (floorId === "0F") {
    const { w, h } = isStair ? ZONES_0F.stairIconSize : ZONES_0F.elevIconSize;
    return iconZoneRect(centerX, centerY, w, h);
  }
  // 2F~5F 与 0F/1F 图标尺寸一致（楼梯 15×15 图标、电梯 13×13 双联簇），选区同款收紧
  const { w, h } = isStair ? ZONES_1F.stairIconSize : ZONES_1F.elevIconSize;
  return iconZoneRect(centerX, centerY, w, h);
}

function makeVerticalLanding(
  floorId: FloorId,
  shaft: VerticalShaft,
  neighbors: RoomDef["neighbors"]
): RoomDef | null {
  const binding = getShaftBinding(shaft.shaftKey, floorId);
  const center = shaftCenter(floorId, shaft.shaftKey);
  if (!binding || !center) return null;

  const isStair = shaft.kind === "stair";

  return {
    id: binding.roomId,
    label: shaftLabel(shaft),
    floorId,
    zoneType: "corridor",
    placeholder: isStair ? "stair" : "shaft",
    ...STAIR_VIEW,
    overviewRect: shaftIconRect(floorId, center.x, center.y, isStair),
    neighbors,
    floorPortal: buildShaftPortal(shaft.shaftKey, floorId),
  };
}

function build1FShaftNeighbors(shaft: VerticalShaft): RoomDef["neighbors"] {
  const corridorId = getShaftBinding(shaft.shaftKey, "1F")?.corridorRoomId;
  const stairRoom = `1f-${stairSiblingKey(shaft.shaftKey)}`;

  if (shaft.kind === "stair") {
    return shaft.isWest ? { right: corridorId! } : { left: corridorId! };
  }

  if (shaft.isWest) return { right: stairRoom };
  return { left: stairRoom, down: corridorId! };
}

function buildUpperFloorShaftNeighbors(
  floorId: FloorId,
  shaft: VerticalShaft
): RoomDef["neighbors"] {
  const prefix = `${floorId.toLowerCase()}-`;
  const elevKey = elevSiblingKey(shaft.shaftKey);
  const stairRoom = `${prefix}${stairSiblingKey(shaft.shaftKey)}`;

  const base: RoomDef["neighbors"] =
    shaft.kind === "stair"
      ? elevKey
        ? { up: `${prefix}${elevKey}` }
        : {}
      : { down: stairRoom };

  // 2F~5F：楼梯/电梯接入本翼块走廊（SA/SB/SC/SD）
  if (UPPER_FLOOR_IDS.has(floorId)) {
    const block = shaft.shaftKey.split("-")[0];
    const blockCorridorId = `${prefix}${block}-corridor`;
    return shaft.isWest
      ? { ...base, right: blockCorridorId }
      : { ...base, left: blockCorridorId };
  }

  return base;
}

function patchShaftSiblingLinks(landings: RoomDef[], floorId: FloorId): void {
  const prefix = floorId === "0F" ? "" : `${floorId.toLowerCase()}-`;

  const linkStairToElev = (
    stairId: string,
    elevId: string,
    stairDir: "up" | "left"
  ) => {
    const stair = landings.find((r) => r.id === `${prefix}${stairId}`);
    if (stair) stair.neighbors[stairDir] = `${prefix}${elevId}`;
  };

  linkStairToElev("sa-stair-east", "sa-elev-east", "up");
  linkStairToElev("sb-stair-west", "sb-elev-west", "up");
  linkStairToElev("sc-stair-east", "sc-elev-east", "up");

  if (floorId === "1F") {
    const sdStair = landings.find((r) => r.id === "1f-sd-stair-west");
    if (sdStair) sdStair.neighbors.left = "1f-sd-elev-west";
  } else {
    const sdStair = landings.find((r) => r.id === `${prefix}sd-stair-west`);
    const sdElev = landings.find((r) => r.id === `${prefix}sd-elev-west`);
    if (sdStair) sdStair.neighbors.left = `${prefix}sd-elev-west`;
    if (sdElev) sdElev.neighbors.right = `${prefix}sd-stair-west`;
  }
}

const UPPER_FLOOR_IDS = new Set<FloorId>(["2F", "3F", "4F", "5F"]);

function buildVerticalLandings(floorId: FloorId): RoomDef[] {
  const landings: RoomDef[] = [];

  for (const shaft of VERTICAL_SHAFTS) {
    const neighbors =
      floorId === "1F"
        ? build1FShaftNeighbors(shaft)
        : floorId === "0F"
          ? {}
          : buildUpperFloorShaftNeighbors(floorId, shaft);

    const room = makeVerticalLanding(floorId, shaft, neighbors);
    if (room) landings.push(room);
  }

  if (floorId !== "0F") {
    patchShaftSiblingLinks(landings, floorId);
  }

  return landings;
}

/** 是否为楼梯/电梯/梯间（进入时弹出上下楼选择） */
export function isVerticalTransportRoom(room: RoomDef | undefined): boolean {
  if (!room?.floorPortal) return false;
  return room.placeholder === "stair" || room.placeholder === "shaft";
}

/** 0F 默认起始 room */
export const DEFAULT_ROOM_0F = "entrance-corridor";

/** model 矩形 → 鸟瞰 SVG 矩形 */
export function modelRectToOverview(
  floorId: FloorId,
  modelX: number,
  modelY: number,
  modelW: number,
  modelH: number
) {
  const offset = getFloorModelOffset(BUILDING, floorId);
  return {
    x: modelX - offset.x,
    y: modelY - offset.y,
    w: modelW,
    h: modelH,
  };
}

/** 以 SVG 楼梯/电梯图标中心生成鸟瞰块 */
function stairOverviewRect(
  svgX: number,
  svgY: number,
  w = ZONES_0F.stairIconSize.w,
  h = ZONES_0F.stairIconSize.h
) {
  return iconZoneRect(svgX, svgY, w, h);
}

function elevOverviewRect(svgX: number, svgY: number) {
  const { w, h } = ZONES_0F.elevIconSize;
  return iconZoneRect(svgX, svgY, w, h);
}

function makeStairRoom(
  id: string,
  label: string,
  svgX: number,
  svgY: number,
  neighbors: RoomDef["neighbors"]
): RoomDef {
  return {
    id,
    label,
    floorId: "0F",
    zoneType: "corridor",
    placeholder: "stair",
    ...STAIR_VIEW,
    overviewRect: stairOverviewRect(svgX, svgY),
    neighbors,
    floorPortal: buildShaftPortal(id, "0F"),
  };
}

function makeElevatorRoom(
  id: string,
  label: string,
  svgX: number,
  svgY: number,
  neighbors: RoomDef["neighbors"]
): RoomDef {
  return {
    id,
    label,
    floorId: "0F",
    zoneType: "corridor",
    placeholder: "shaft",
    ...STAIR_VIEW,
    overviewRect: elevOverviewRect(svgX, svgY),
    neighbors,
    floorPortal: buildShaftPortal(id, "0F"),
  };
}

/** 0F 走廊段 */
function make0FCorridor(
  id: string,
  label: string,
  overviewRect: OverviewRect,
  neighbors: RoomDef["neighbors"],
  placeholder: "corridor-h" | "corridor-v" = "corridor-h"
): RoomDef {
  return {
    id,
    label,
    floorId: "0F",
    zoneType: "corridor",
    placeholder,
    ...ROOM_VIEW,
    overviewRect,
    neighbors,
  };
}

const Z0 = ZONES_0F;
const S0 = Z0.stairCenters;
const E0 = Z0.elevatorCenters;
const C0 = Z0.corridors;

const ROOMS_0F: RoomDef[] = [
  make0FCorridor(
    "entrance-corridor",
    "地下停车场入口通道",
    Z0.walkable.entranceCorridor,
    { up: "sb-corridor", down: "sd-corridor", right: "sc-atrium" },
    "corridor-v"
  ),
  make0FCorridor("sa-corridor", "SA 走廊", C0.sa, {
    left: "sa-stair-west",
    right: "sa-stair-east",
    down: "tongfa-canteen",
  }),
  make0FCorridor("sa-corridor-west", "SA 西翼走廊", C0.saWest, {
    up: "sa-stair-west",
    right: "tongfa-canteen",
    down: "sb-corridor-west",
  }),
  make0FCorridor("sa-corridor-east", "SA 东翼走廊", C0.saEast, {
    left: "sa-corridor",
    down: "sa007-room",
    up: "sa-elev-east",
  }),
  make0FCorridor("sb-corridor", "SB 走廊", C0.sb, {
    left: "sb-corridor-west",
    right: "sb-corridor-east",
    down: "entrance-corridor",
  }),
  make0FCorridor("sb-corridor-west", "SB 西翼走廊", C0.sbWest, {
    up: "sa-corridor-west",
    right: "sb-corridor",
    down: "sb-stair-west",
  }),
  make0FCorridor("sb-corridor-east", "SB 东翼走廊", C0.sbEast, {
    left: "sb-corridor",
    right: "sb-stair-east",
    down: "sc-atrium",
  }),
  make0FCorridor(
    "sc-atrium",
    "地下停车场SC中庭",
    Z0.walkable.scAtrium,
    {
      left: "entrance-corridor",
      up: "sb-corridor",
      right: "sb-corridor-east",
      down: "sc-stair-west",
    }
  ),
  {
    id: "tongfa-canteen",
    label: "Tongfa 食堂",
    floorId: "0F",
    zoneType: "room",
    imageSrc: "/maps/zones/canteen_0F.png",
    ...ROOM_VIEW,
    overviewRect: Z0.rooms.tongfaCanteen,
    neighbors: {
      down: "sa-corridor",
      right: "sa007-room",
      left: "sa-corridor-west",
    },
  },
  {
    id: "sa007-room",
    label: "SA007",
    floorId: "0F",
    zoneType: "room",
    imageSrc: "/maps/rooms/sa007_0F.png",
    ...ROOM_VIEW,
    overviewRect: Z0.rooms.sa007,
    neighbors: {
      left: "tongfa-canteen",
      up: "sa-corridor-east",
    },
  },
  makeStairRoom("sa-stair-west", "SA 楼梯（西）", S0.saWest.x, S0.saWest.y, {
    right: "sa-corridor",
    down: "sa-corridor-west",
  }),
  makeStairRoom("sa-stair-east", "SA 楼梯（东）", S0.saEast.x, S0.saEast.y, {
    left: "sa-corridor",
    right: "sa-corridor-east",
    up: "sa-elev-east",
  }),
  makeElevatorRoom("sa-elev-east", "SA 电梯（东）", E0.saEast.x, E0.saEast.y, {
    left: "sa-corridor-east",
    down: "sa-stair-east",
  }),
  makeStairRoom("sb-stair-west", "SB 楼梯（西）", S0.sbWest.x, S0.sbWest.y, {
    up: "sb-corridor-west",
    right: "sb-corridor",
    left: "sb-elev-west",
  }),
  makeElevatorRoom("sb-elev-west", "SB 电梯（西）", E0.sbWest.x, E0.sbWest.y, {
    down: "sb-stair-west",
  }),
  makeStairRoom("sb-stair-east", "SB 楼梯（东）", S0.sbEast.x, S0.sbEast.y, {
    left: "sb-corridor-east",
    down: "sb-corridor",
  }),
  makeStairRoom("sc-stair-east", "SC 楼梯（东）", S0.scEast.x, S0.scEast.y, {
    left: "sc-stair-west",
    up: "sc-elev-east",
  }),
  makeElevatorRoom("sc-elev-east", "SC 电梯（东）", E0.scEast.x, E0.scEast.y, {
    left: "sc-atrium",
    down: "sc-stair-east",
  }),
  make0FCorridor(
    "sd-corridor",
    "SD 入口过道",
    Z0.walkable.sdCorridorNarrow,
    { up: "entrance-corridor", left: "sd-corridor-west", down: "sd085-room" },
    "corridor-v"
  ),
  make0FCorridor(
    "sd-corridor-west",
    "SD 西翼走廊",
    C0.sdWest,
    { right: "sd-corridor", up: "sc-stair-west", down: "sd-stair-west" },
    "corridor-v"
  ),
  make0FCorridor("sd-east-open", "SD 东前厅", Z0.walkable.sdEastOpen, {
    left: "sd085-room",
    right: "sd-stair-east",
  }),
  {
    id: "sd085-room",
    label: "SD085",
    floorId: "0F",
    zoneType: "room",
    ...ROOM_VIEW,
    placeholder: "room",
    overviewRect: Z0.rooms.sd085,
    imageSrc: "/maps/rooms/sd085_0F.png",
    neighbors: { up: "sd-corridor", right: "sd-east-open" },
  },
  makeStairRoom("sd-stair-east", "SD 楼梯（东）", S0.sdEast.x, S0.sdEast.y, {
    left: "sd-east-open",
  }),
  makeStairRoom("sc-stair-west", "SC 楼梯（西）", S0.scWest.x, S0.scWest.y, {
    up: "sc-atrium",
    down: "sd-corridor-west",
    right: "sc-stair-east",
  }),
  makeStairRoom("sd-stair-west", "SD 楼梯（西）", S0.sdWest.x, S0.sdWest.y, {
    up: "sd-corridor-west",
    left: "sd-elev-west",
  }),
  makeElevatorRoom("sd-elev-west", "SD 电梯（西）", E0.sdWest.x, E0.sdWest.y, {
    right: "sd-stair-west",
  }),
];

/** 1F 走廊 / 通道（灰竖条为翼楼走廊，块间短灰条为通道） */
function make1FCorridor(
  id: string,
  label: string,
  overviewRect: OverviewRect,
  neighbors: RoomDef["neighbors"],
  orientation: "h" | "v" = "h"
): RoomDef {
  return {
    id,
    label,
    floorId: "1F",
    zoneType: "corridor",
    placeholder: orientation === "v" ? "corridor-v" : "corridor-h",
    ...ROOM_VIEW,
    overviewRect,
    neighbors,
  };
}

/** 1F 教室（标签框来自 SVG） */
function make1FRoom(
  id: string,
  label: string,
  overviewRect: OverviewRect,
  neighbors: RoomDef["neighbors"]
): RoomDef {
  return {
    id,
    label,
    floorId: "1F",
    zoneType: "room",
    placeholder: "room",
    ...ROOM_VIEW,
    overviewRect,
    neighbors,
  };
}

/** 1F 洗手间（图标包围框来自 SVG） */
function make1FToilet(
  id: string,
  label: string,
  overviewRect: OverviewRect,
  neighbors: RoomDef["neighbors"]
): RoomDef {
  return {
    id,
    label,
    floorId: "1F",
    zoneType: "room",
    placeholder: "room",
    ...ROOM_VIEW,
    overviewRect,
    neighbors,
  };
}

const Z1 = ZONES_1F;
const W1 = Z1.wingCorridors;
const P1 = Z1.passages;
const B1 = Z1.spineBridges;
const R1 = Z1.rooms;
const T1 = Z1.toilets;

const ROOMS_1F: RoomDef[] = [
  make1FCorridor("1f-spine", "中通道", Z1.spine, {
    up: "1f-sb-spine-bridge-west",
    down: "1f-sc-spine-bridge-west",
    left: "1f-sc-stair-west",
    right: "1f-sc-corridor-east",
  }),
  // —— 西翼灰走廊（竖向 #f5f5f5）——
  make1FCorridor("1f-sa-corridor-west", "SA 西走廊", W1.westSa, {
    left: "1f-sa-stair-west",
    right: "1f-sa-spine-bridge-west",
    down: "1f-sasb-passage-west",
  }, "v"),
  make1FCorridor("1f-sb-corridor-west", "SB 西走廊", W1.westSb, {
    up: "1f-sasb-passage-west",
    left: "1f-sb-stair-west",
    right: "1f-sb-spine-bridge-west",
    down: "1f-sbsc-passage-west",
  }, "v"),
  make1FCorridor("1f-sc-corridor-west", "SC 西走廊", W1.westSc, {
    up: "1f-sbsc-passage-west",
    left: "1f-sc-stair-west",
    right: "1f-sc-spine-bridge-west",
    down: "1f-scsd-passage-west",
  }, "v"),
  make1FCorridor("1f-sd-corridor-west", "SD 西走廊", W1.westSd, {
    up: "1f-scsd-passage-west",
    left: "1f-sd-stair-west",
    right: "1f-spine",
  }, "v"),
  // —— 西翼块间通道 ——
  make1FCorridor("1f-sasb-passage-west", "SASB 西通道", P1.westSaSb, {
    up: "1f-sa-corridor-west",
    down: "1f-sb-corridor-west",
  }, "v"),
  make1FCorridor("1f-sbsc-passage-west", "SBSC 西通道", P1.westSbSc, {
    up: "1f-sb-corridor-west",
    down: "1f-sc-corridor-west",
  }, "v"),
  make1FCorridor("1f-scsd-passage-west", "SCSD 西通道", P1.westScSd, {
    up: "1f-sc-corridor-west",
    down: "1f-sd-corridor-west",
  }, "v"),
  // —— 西翼连中通道（白色横向）——
  make1FCorridor("1f-sa-spine-bridge-west", "SA 西连廊", B1.westSa, {
    left: "1f-sa-corridor-west",
    right: "1f-sa-corridor-east",
  }),
  make1FCorridor("1f-sb-spine-bridge-west", "SB 西连廊", B1.westSb, {
    left: "1f-sb-corridor-west",
    right: "1f-spine",
  }),
  make1FCorridor("1f-sc-spine-bridge-west", "SC 西连廊", B1.westSc, {
    left: "1f-sc-corridor-west",
    right: "1f-spine",
  }),
  // —— 东翼灰走廊 ——
  make1FCorridor("1f-sa-corridor-east", "SA 东走廊", W1.eastSa, {
    left: "1f-sa-spine-bridge-west",
    right: "1f-sa-stair-east",
    down: "1f-sasb-passage-east",
  }, "v"),
  make1FCorridor("1f-sb-corridor-east", "SB 东走廊", W1.eastSb, {
    up: "1f-sasb-passage-east",
    left: "1f-sb-corridor-west",
    right: "1f-sb-stair-east",
    down: "1f-sbsc-passage-east",
  }, "v"),
  make1FCorridor("1f-sc-corridor-east", "SC 东走廊", W1.eastSc, {
    up: "1f-sbsc-passage-east",
    left: "1f-spine",
    right: "1f-sc-stair-east",
    down: "1f-scsd-passage-east",
  }, "v"),
  make1FCorridor("1f-sd-corridor-east", "SD 东走廊", W1.eastSd, {
    up: "1f-scsd-passage-east",
    left: "1f-spine",
    right: "1f-sd-stair-east",
  }, "v"),
  // —— 东翼块间通道 ——
  make1FCorridor("1f-sasb-passage-east", "SASB 东通道", P1.eastSaSb, {
    up: "1f-sa-corridor-east",
    down: "1f-sb-corridor-east",
  }, "v"),
  make1FCorridor("1f-sbsc-passage-east", "SBSC 东通道", P1.eastSbSc, {
    up: "1f-sb-corridor-east",
    down: "1f-sc-corridor-east",
  }, "v"),
  make1FCorridor("1f-scsd-passage-east", "SCSD 东通道", P1.eastScSd, {
    up: "1f-sc-corridor-east",
    down: "1f-sd-corridor-east",
  }, "v"),
  // —— 东翼连中通道 ——
  make1FCorridor("1f-sa-spine-bridge-east", "SA 东连廊", B1.eastSa, {
    left: "1f-sa-corridor-west",
    right: "1f-sa-corridor-east",
  }),
  make1FCorridor("1f-sb-spine-bridge-east", "SB 东连廊", B1.eastSb, {
    left: "1f-spine",
    right: "1f-sb-corridor-east",
  }),
  make1FCorridor("1f-sc-spine-bridge-east", "SC 东连廊", B1.eastSc, {
    left: "1f-spine",
    right: "1f-sc-corridor-east",
  }),
  make1FRoom("1f-sa164", "SA164", R1.SA164, { down: "1f-sa169", right: "1f-sa-corridor-west" }),
  make1FRoom("1f-sa169", "SA169", R1.SA169, { up: "1f-sa164", right: "1f-sa-corridor-west" }),
  make1FRoom("1f-sa136", "SA136", R1.SA136, { left: "1f-sa-corridor-east" }),
  make1FRoom("1f-sb152", "SB152", R1.SB152, { down: "1f-sb-corridor-west" }),
  make1FRoom("1f-sb102", "SB102", R1.SB102, { left: "1f-sb-corridor-east", down: "1f-sb120" }),
  make1FRoom("1f-sb120", "SB120", R1.SB120, { up: "1f-sb102", down: "1f-sb123" }),
  make1FRoom("1f-sb123", "SB123", R1.SB123, { up: "1f-sb120" }),
  make1FRoom("1f-sc176", "SC176", R1.SC176, { down: "1f-sc162", right: "1f-sc-corridor-west" }),
  make1FRoom("1f-sc162", "SC162", R1.SC162, { up: "1f-sc176", down: "1f-sc169" }),
  make1FRoom("1f-sc169", "SC169", R1.SC169, { up: "1f-sc162", right: "1f-sc-corridor-west" }),
  make1FRoom("1f-sc140", "SC140", R1.SC140, { left: "1f-sc-corridor-east" }),
  make1FRoom("1f-sd154", "SD154", R1.SD154, { up: "1f-sd-corridor-west" }),
  make1FRoom("1f-sd102", "SD102", R1.SD102, { left: "1f-sd-corridor-east", down: "1f-sd114" }),
  make1FRoom("1f-sd114", "SD114", R1.SD114, { up: "1f-sd102", down: "1f-sd120" }),
  make1FRoom("1f-sd120", "SD120", R1.SD120, { up: "1f-sd114" }),
  make1FToilet("1f-sa-wc", "SA 洗手间", T1.saWest, { right: "1f-sa-corridor-west" }),
  make1FToilet("1f-sb-wc", "SB 洗手间", T1.sbEast, { left: "1f-sb-corridor-east" }),
  make1FToilet("1f-sc-wc", "SC 洗手间", T1.scWest, { right: "1f-sc-corridor-west" }),
  make1FToilet("1f-sd-wc", "SD 洗手间", T1.sdEast, { left: "1f-sd-corridor-east" }),
  ...buildVerticalLandings("1F"),
];

/**
 * 2F～5F 通用房间图 — 教室先用占位贴图（RoomPlaceholder），后续替换实拍图
 * 各翼 SA/SB/SC/SD 东西向楼内走廊 + 2F/3F 贯穿东西翼纵向走廊；4F/5F 无翼走廊时由块走廊接楼梯。
 */
const UPPER_BLOCKS = ["sa", "sb", "sc", "sd"] as const;
type UpperBlock = (typeof UPPER_BLOCKS)[number];

function blockFromRoomLabel(label: string): UpperBlock {
  const b = label.slice(0, 2).toLowerCase();
  return UPPER_BLOCKS.includes(b as UpperBlock) ? (b as UpperBlock) : "sa";
}

function makeUpperFloorBlockCorridor(
  floorId: FloorId,
  block: UpperBlock,
  overviewRect: OverviewRect,
  neighbors: RoomDef["neighbors"]
): RoomDef {
  const prefix = `${floorId.toLowerCase()}-`;
  return {
    id: `${prefix}${block}-corridor`,
    label: `${block.toUpperCase()} 走廊`,
    floorId,
    zoneType: "corridor",
    placeholder: "corridor-h",
    ...ROOM_VIEW,
    overviewRect,
    neighbors,
  };
}

function buildBlockCorridorNeighbors(
  floorId: FloorId,
  zones: UpperFloorZones
): Record<UpperBlock, RoomDef["neighbors"]> {
  const prefix = `${floorId.toLowerCase()}-`;
  const hasPerBlockWings = zones.wingCorridors != null;

  const wingEnds = (block: UpperBlock) =>
    hasPerBlockWings
      ? {
          left: `${prefix}${block}-corridor-west`,
          right: `${prefix}${block}-corridor-east`,
        }
      : {
          left: `${prefix}${block}-stair-west`,
          right: `${prefix}${block}-stair-east`,
        };

  return {
    sa: { ...wingEnds("sa"), down: `${prefix}sb-corridor` },
    sb: {
      ...wingEnds("sb"),
      up: `${prefix}sa-corridor`,
      down: `${prefix}sc-corridor`,
    },
    sc: {
      ...wingEnds("sc"),
      up: `${prefix}sb-corridor`,
      down: `${prefix}sd-corridor`,
    },
    sd: { ...wingEnds("sd"), up: `${prefix}sc-corridor` },
  };
}

function makeUpperFloorBlockWingCorridor(
  floorId: FloorId,
  block: UpperBlock,
  side: "west" | "east",
  overviewRect: OverviewRect,
  neighbors: RoomDef["neighbors"]
): RoomDef {
  const sideLabel = side === "west" ? "西翼走廊" : "东翼走廊";
  return {
    id: `${floorId.toLowerCase()}-${block}-corridor-${side}`,
    label: `${block.toUpperCase()} ${sideLabel}`,
    floorId,
    zoneType: "corridor",
    placeholder: "corridor-v",
    ...ROOM_VIEW,
    overviewRect,
    neighbors,
  };
}

function buildPerBlockWingCorridors(
  floorId: FloorId,
  wingCorridors: NonNullable<UpperFloorZones["wingCorridors"]>
): RoomDef[] {
  const prefix = `${floorId.toLowerCase()}-`;
  const rooms: RoomDef[] = [];

  for (const side of ["west", "east"] as const) {
    for (let i = 0; i < UPPER_BLOCKS.length; i++) {
      const block = UPPER_BLOCKS[i];
      const rectKey =
        `${side}${block.charAt(0).toUpperCase()}${block.slice(1)}` as keyof typeof wingCorridors;
      const prev = i > 0 ? UPPER_BLOCKS[i - 1] : null;
      const next = i < UPPER_BLOCKS.length - 1 ? UPPER_BLOCKS[i + 1] : null;
      const stairSuffix = side;

      const neighbors: RoomDef["neighbors"] =
        side === "west"
          ? {
              left: `${prefix}${block}-stair-${stairSuffix}`,
              right: `${prefix}${block}-corridor`,
            }
          : {
              left: `${prefix}${block}-corridor`,
              right: `${prefix}${block}-stair-${stairSuffix}`,
            };

      if (prev) neighbors.up = `${prefix}${prev}-corridor-${side}`;
      if (next) neighbors.down = `${prefix}${next}-corridor-${side}`;

      rooms.push(
        makeUpperFloorBlockWingCorridor(
          floorId,
          block,
          side,
          wingCorridors[rectKey],
          neighbors
        )
      );
    }
  }

  return rooms;
}

/** 2F～5F 洗手间（图标包围框来自 SVG） */
function makeUpperFloorToilet(
  id: string,
  label: string,
  floorId: FloorId,
  overviewRect: OverviewRect,
  neighbors: RoomDef["neighbors"]
): RoomDef {
  return {
    id,
    label,
    floorId,
    zoneType: "room",
    placeholder: "room",
    ...ROOM_VIEW,
    overviewRect,
    neighbors,
  };
}

function toiletNeighborsFromKey(
  floorId: FloorId,
  key: string,
  zones: UpperFloorZones
): RoomDef["neighbors"] {
  const prefix = `${floorId.toLowerCase()}-`;
  const block = key.slice(0, 2).toLowerCase() as UpperBlock;
  const side = key.slice(2).toLowerCase() as "west" | "east";

  if (zones.wingCorridors) {
    return side === "west"
      ? { right: `${prefix}${block}-corridor-west` }
      : { left: `${prefix}${block}-corridor-east` };
  }
  return side === "west"
    ? { right: `${prefix}${block}-corridor` }
    : { left: `${prefix}${block}-corridor` };
}

function buildUpperFloorToilets(
  floorId: FloorId,
  zones: UpperFloorZones
): RoomDef[] {
  return Object.entries(zones.toilets).map(([key, rect]) => {
    const block = key.slice(0, 2).toUpperCase();
    return makeUpperFloorToilet(
      `${floorId.toLowerCase()}-${key.slice(0, 2).toLowerCase()}-wc`,
      `${block} 洗手间`,
      floorId,
      rect,
      toiletNeighborsFromKey(floorId, key, zones)
    );
  });
}

function makeUpperFloorRoom(
  floorId: FloorId,
  label: string,
  overviewRect: OverviewRect,
  zones: UpperFloorZones
): RoomDef {
  const prefix = `${floorId.toLowerCase()}-`;
  const block = blockFromRoomLabel(label);
  const blockCorridorId = `${prefix}${block}-corridor`;
  const corridor = zones.blockCorridors[block];
  const cx = overviewRect.x + overviewRect.w / 2;
  const cy = overviewRect.y + overviewRect.h / 2;
  const corridorCy = corridor.y + corridor.h / 2;
  const corridorCx = corridor.x + corridor.w / 2;

  const neighbors: RoomDef["neighbors"] = {};
  if (cx < corridorCx - 30) {
    neighbors.right = blockCorridorId;
  } else if (cx > corridorCx + 30) {
    neighbors.left = blockCorridorId;
  } else if (cy < corridorCy - 5) {
    neighbors.down = blockCorridorId;
  } else {
    neighbors.up = blockCorridorId;
  }

  return {
    id: `${prefix}${label.toLowerCase()}`,
    label,
    floorId,
    zoneType: "room",
    placeholder: "room",
    ...ROOM_VIEW,
    overviewRect,
    neighbors,
  };
}

function buildUpperFloorRooms(floorId: FloorId, zones: UpperFloorZones): RoomDef[] {
  const blockNeighbors = buildBlockCorridorNeighbors(floorId, zones);
  const blockCorridors = UPPER_BLOCKS.map((block) =>
    makeUpperFloorBlockCorridor(
      floorId,
      block,
      zones.blockCorridors[block],
      blockNeighbors[block]
    )
  );

  const wingCorridors = zones.wingCorridors
    ? buildPerBlockWingCorridors(floorId, zones.wingCorridors)
    : [];

  const rooms = Object.entries(zones.rooms).map(([label, rect]) =>
    makeUpperFloorRoom(floorId, label, rect, zones)
  );
  const toilets = buildUpperFloorToilets(floorId, zones);

  return [...blockCorridors, ...wingCorridors, ...rooms, ...toilets];
}

function buildUpperFloorAll(floorId: FloorId, zones: UpperFloorZones): RoomDef[] {
  return [...buildVerticalLandings(floorId), ...buildUpperFloorRooms(floorId, zones)];
}

const ROOMS_2F: RoomDef[] = buildUpperFloorAll("2F", ZONES_UPPER["2F"]);
const ROOMS_3F: RoomDef[] = buildUpperFloorAll("3F", ZONES_UPPER["3F"]);
const ROOMS_4F: RoomDef[] = buildUpperFloorAll("4F", ZONES_UPPER["4F"]);
const ROOMS_5F: RoomDef[] = buildUpperFloorAll("5F", ZONES_UPPER["5F"]);

export const VIEWPOINTS_0F: ViewpointDef[] = [
  {
    id: "vp-canteen-window",
    roomId: "tongfa-canteen",
    floorId: "0F",
    x: 480,
    y: 120,
    title: "食堂观景台",
    content: "从这里可以俯瞰 Tongfa 食堂的取餐台和用餐区。\n（MVP 预设点，后续可接图片/链接）",
  },
];

const ROOMS_BY_FLOOR: Partial<Record<FloorId, RoomDef[]>> = {
  "0F": ROOMS_0F,
  "1F": ROOMS_1F,
  "2F": ROOMS_2F,
  "3F": ROOMS_3F,
  "4F": ROOMS_4F,
  "5F": ROOMS_5F,
};

const DEFAULT_BY_FLOOR: Partial<Record<FloorId, string>> = {
  "0F": DEFAULT_ROOM_0F,
  "1F": "1f-sa-corridor-west",
  "2F": "2f-sa-corridor-west",
  "3F": "3f-sa-corridor-west",
  "4F": "4f-sa-corridor",
  "5F": "5f-sa-corridor",
};

export function hasRoomNavigation(floorId: FloorId): boolean {
  return (ROOMS_BY_FLOOR[floorId]?.length ?? 0) > 0;
}

export function getRoomsForFloor(floorId: FloorId): RoomDef[] {
  return ROOMS_BY_FLOOR[floorId] ?? [];
}

export function getDefaultRoomId(floorId: FloorId): string | null {
  return DEFAULT_BY_FLOOR[floorId] ?? null;
}

export function getRoomById(floorId: FloorId, roomId: string): RoomDef | undefined {
  return getRoomsForFloor(floorId).find((r) => r.id === roomId);
}

export function getViewpointsForRoom(floorId: FloorId, roomId: string): ViewpointDef[] {
  if (floorId !== "0F") return [];
  return VIEWPOINTS_0F.filter((v) => v.roomId === roomId);
}
