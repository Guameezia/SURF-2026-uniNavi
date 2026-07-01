/**
 * 星露谷式分房间导航 — 0F MVP
 * 走廊独立成 room；默认从主入口走廊开始
 *
 * overviewRect 使用 SVG viewBox 坐标（760×720），与 S_0F.svg 底图一致。
 * 换算：svgX = modelX - 81, svgY = modelY - 120
 */

import type { FloorId } from "../types/indoor";
import type { RoomDef, ViewpointDef, StairFloorLink, ElevatorFloorLink, FloorPortal } from "../types/room";
import { getFloorModelOffset } from "./mapConfig";

const BUILDING = "S";
const ROOM_VIEW = { viewWidth: 640, viewHeight: 400 };

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

export function getFloorOverview(floorId: FloorId) {
  return floorId === "1F" ? FLOOR_1F_OVERVIEW : FLOOR_0F_OVERVIEW;
}

/**
 * 0F 楼梯 room ↔ 1F 楼梯节点 ↔ 1F 走廊 junction ↔ 1F 走廊 room
 * 楼梯与走廊的连接关系见 edges.ts（如 S_1F_SA_STAIR_W → S_1F_SA_J_W）
 */
export const STAIR_FLOOR_LINKS: StairFloorLink[] = [
  {
    room0F: "sa-stair-west",
    node0F: "S_0F_SA_STAIR_W",
    node1FStair: "S_1F_SA_STAIR_W",
    node1FCorridor: "S_1F_SA_J_W",
    room1F: "1f-sa-corridor-west",
  },
  {
    room0F: "sa-stair-east",
    node0F: "S_0F_SA_STAIR_E",
    node1FStair: "S_1F_SA_STAIR_E",
    node1FCorridor: "S_1F_SA_J_E",
    room1F: "1f-sa-corridor-east",
  },
  {
    room0F: "sb-stair-west",
    node0F: "S_0F_SB_STAIR_W",
    node1FStair: "S_1F_SB_STAIR_W",
    node1FCorridor: "S_1F_SB_J_W",
    room1F: "1f-sb-corridor-west",
  },
  {
    room0F: "sb-stair-east",
    node0F: "S_0F_SB_STAIR_E",
    node1FStair: "S_1F_SB_STAIR_E",
    node1FCorridor: "S_1F_SB_J_E",
    room1F: "1f-sb-corridor-east",
  },
  {
    room0F: "sc-stair-west",
    node0F: "S_0F_SC_STAIR_W",
    node1FStair: "S_1F_SC_STAIR_W",
    node1FCorridor: "S_1F_SC_J_W",
    room1F: "1f-sc-corridor-west",
  },
  {
    room0F: "sd-stair-west",
    node0F: "S_0F_SD_STAIR_W",
    node1FStair: "S_1F_SD_STAIR_W",
    node1FCorridor: "S_1F_SD_J_W",
    room1F: "1f-sd-corridor-west",
  },
];

/** 0F 电梯 room ↔ 1F 走廊（电梯井与楼梯井分列时用） */
export const ELEVATOR_FLOOR_LINKS: ElevatorFloorLink[] = [
  {
    room0F: "sc-elev-east",
    node0F: "S_0F_SC_ELEV",
    node1F: "S_1F_SC_ELEV",
    node1FCorridor: "S_1F_SC_J_E",
    room1F: "1f-sc-corridor-east",
  },
  {
    room0F: "sd-elev-west",
    node0F: "S_0F_SD_ELEV",
    node1F: "S_1F_SD_ELEV",
    node1FCorridor: "S_1F_SD_J_W",
    room1F: "1f-sd-corridor-west",
  },
];

/**
 * 0F 楼梯+电梯同井道（CAD 蓝框内并列）→ 1F 走廊
 * sc-east-shaft：SC 东侧，电梯在上、楼梯在下
 */
export const SHAFT_FLOOR_LINKS = [
  {
    room0F: "sc-east-shaft",
    node0FStair: "S_0F_SC_STAIR_E",
    node0FElev: "S_0F_SC_ELEV",
    node1FStair: "S_1F_SC_STAIR_E",
    node1FElev: "S_1F_SC_ELEV",
    node1FCorridor: "S_1F_SC_J_E",
    room1F: "1f-sc-corridor-east",
  },
  {
    room0F: "sd-east-shaft",
    node0FStair: "S_0F_SD_STAIR_E",
    node1FStair: "S_1F_SD_STAIR_E",
    node1FCorridor: "S_1F_SD_J_E",
    room1F: "1f-sd-corridor-east",
  },
] as const;

const STAIR_LINK_BY_ROOM_0F = new Map(STAIR_FLOOR_LINKS.map((l) => [l.room0F, l]));
const ELEV_LINK_BY_ROOM_0F = new Map(ELEVATOR_FLOOR_LINKS.map((l) => [l.room0F, l]));
const SHAFT_LINK_BY_ROOM_0F = new Map<string, (typeof SHAFT_FLOOR_LINKS)[number]>(
  SHAFT_FLOOR_LINKS.map((l) => [l.room0F, l])
);

export function getStairFloorLink(room0F: string): StairFloorLink | undefined {
  return STAIR_LINK_BY_ROOM_0F.get(room0F);
}

export function getElevatorFloorLink(room0F: string): ElevatorFloorLink | undefined {
  return ELEV_LINK_BY_ROOM_0F.get(room0F);
}

function portalFromStairLink(link: StairFloorLink): FloorPortal {
  return {
    up: {
      targetFloorId: "1F",
      targetRoomId: `1f-${link.room0F}`,
      targetNodeId: link.node1FStair,
    },
  };
}

function portalFromStairLinkDown(link: StairFloorLink): FloorPortal {
  return {
    down: {
      targetFloorId: "0F",
      targetRoomId: link.room0F,
      targetNodeId: link.node0F,
    },
  };
}

function portalFromElevLink(link: ElevatorFloorLink): FloorPortal {
  return {
    up: {
      targetFloorId: "1F",
      targetRoomId: `1f-${link.room0F}`,
      targetNodeId: link.node1F,
    },
  };
}

function portalFromElevLinkDown(link: ElevatorFloorLink): FloorPortal {
  return {
    down: {
      targetFloorId: "0F",
      targetRoomId: link.room0F,
      targetNodeId: link.node0F,
    },
  };
}

function portalFromShaft(room0F: string): FloorPortal | undefined {
  const link = SHAFT_LINK_BY_ROOM_0F.get(room0F);
  if (!link) return undefined;
  return {
    up: {
      targetFloorId: "1F",
      targetRoomId: `1f-${room0F}`,
      targetNodeId: link.node1FStair,
    },
  };
}

function portalFromShaftDown(room0F: string): FloorPortal | undefined {
  const link = SHAFT_LINK_BY_ROOM_0F.get(room0F);
  if (!link) return undefined;
  return {
    down: {
      targetFloorId: "0F",
      targetRoomId: link.room0F,
      targetNodeId: link.node0FStair,
    },
  };
}

function make1FVerticalLanding(
  id: string,
  label: string,
  modelX: number,
  modelY: number,
  portal: FloorPortal,
  neighbors: RoomDef["neighbors"],
  placeholder: "stair" | "shaft" = "stair"
): RoomDef {
  return {
    id,
    label,
    floorId: "1F",
    zoneType: "corridor",
    placeholder,
    ...STAIR_VIEW,
    overviewRect: modelRectToOverview("1F", modelX - 24, modelY - 20, 48, 40),
    neighbors,
    floorPortal: portal,
  };
}

function build1FVerticalLandings(): RoomDef[] {
  const landings: RoomDef[] = [];

  for (const link of STAIR_FLOOR_LINKS) {
    const isWest = link.room1F.endsWith("-west");
    const corridorId = link.room1F;
    const landingId = `1f-${link.room0F}`;
    const modelX = isWest ? 165 : 675;
    const modelY =
      link.room0F.includes("sa") ? 179 :
      link.room0F.includes("sb") ? 378 :
      link.room0F.includes("sc") ? 557 : 775;

    landings.push(
      make1FVerticalLanding(
        landingId,
        `${link.room0F.includes("sa") ? "SA" : link.room0F.includes("sb") ? "SB" : link.room0F.includes("sc") ? "SC" : "SD"} 楼梯口`,
        modelX,
        modelY,
        portalFromStairLinkDown(link),
        isWest
          ? { right: corridorId }
          : { left: corridorId }
      )
    );
  }

  for (const link of ELEVATOR_FLOOR_LINKS) {
    const landingId = `1f-${link.room0F}`;
    const isWest = link.room1F.endsWith("-west");
    const stairSibling = isWest ? `1f-${link.room0F.replace("-elev-", "-stair-")}` : undefined;
    landings.push(
      make1FVerticalLanding(
        landingId,
        link.room0F.includes("sd") ? "SD 电梯口" : "SC 电梯口",
        isWest ? 165 : 675,
        link.room0F.includes("sc") ? 543 : 748,
        portalFromElevLinkDown(link),
        isWest && stairSibling
          ? { right: stairSibling }
          : isWest
            ? { right: link.room1F }
            : { left: link.room1F },
        "shaft"
      )
    );
  }

  for (const link of SHAFT_FLOOR_LINKS) {
    const landingId = `1f-${link.room0F}`;
    landings.push(
      make1FVerticalLanding(
        landingId,
        link.room0F.includes("sc") ? "SC 梯间（东）" : "SD 梯间（东）",
        675,
        link.room0F.includes("sc") ? 556 : 778,
        portalFromShaftDown(link.room0F)!,
        { left: link.room1F },
        "shaft"
      )
    );
  }

  const sdStairWest = landings.find((r) => r.id === "1f-sd-stair-west");
  if (sdStairWest) sdStairWest.neighbors.left = "1f-sd-elev-west";

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

/** 以 model 坐标中心生成楼梯口鸟瞰块 */
function stairOverviewRect(modelX: number, modelY: number, w = 48, h = 40) {
  return modelRectToOverview("0F", modelX - w / 2, modelY - h / 2, w, h);
}

const STAIR_VIEW = { viewWidth: 480, viewHeight: 320 };

function makeStairRoom(
  id: string,
  label: string,
  modelX: number,
  modelY: number,
  neighbors: RoomDef["neighbors"]
): RoomDef {
  const link = getStairFloorLink(id);
  return {
    id,
    label,
    floorId: "0F",
    zoneType: "corridor",
    placeholder: "stair",
    ...STAIR_VIEW,
    overviewRect: stairOverviewRect(modelX, modelY),
    neighbors,
    floorPortal: link ? portalFromStairLink(link) : undefined,
  };
}

function makeElevatorRoom(
  id: string,
  label: string,
  modelX: number,
  modelY: number,
  neighbors: RoomDef["neighbors"]
): RoomDef {
  const link = getElevatorFloorLink(id);
  return {
    id,
    label,
    floorId: "0F",
    zoneType: "corridor",
    placeholder: "shaft",
    ...STAIR_VIEW,
    overviewRect: stairOverviewRect(modelX, modelY, 44, 44),
    neighbors,
    floorPortal: link ? portalFromElevLink(link) : undefined,
  };
}

/** 楼梯+电梯同井道（一个 room 上楼） */
function makeShaftRoom(
  id: string,
  label: string,
  modelX: number,
  modelY: number,
  modelW: number,
  modelH: number,
  neighbors: RoomDef["neighbors"]
): RoomDef {
  return {
    id,
    label,
    floorId: "0F",
    zoneType: "corridor",
    placeholder: "shaft",
    ...STAIR_VIEW,
    overviewRect: modelRectToOverview("0F", modelX, modelY, modelW, modelH),
    neighbors,
    floorPortal: portalFromShaft(id),
  };
}

/** 1F 楼梯口走廊 landing（对齐 node1FCorridor 坐标） */
function makeCorridorLanding(
  id: string,
  label: string,
  modelX: number,
  modelY: number,
  neighbors: RoomDef["neighbors"]
): RoomDef {
  return {
    id,
    label,
    floorId: "1F",
    zoneType: "corridor",
    placeholder: "corridor-h",
    ...ROOM_VIEW,
    overviewRect: modelRectToOverview("1F", modelX - 60, modelY - 30, 120, 60),
    neighbors,
  };
}

const ROOMS_0F: RoomDef[] = [
  {
    id: "entrance-corridor",
    label: "主入口走廊",
    floorId: "0F",
    zoneType: "corridor",
    ...ROOM_VIEW,
    placeholder: "corridor-v",
    // SVG 坐标（自 S_0F.svg 解析）
    overviewRect: { x: 159, y: 320, w: 120, h: 280 },
    neighbors: { up: "sa-corridor", down: "sd-corridor" },
  },
  {
    id: "sa-corridor",
    label: "SA 走廊",
    floorId: "0F",
    zoneType: "corridor",
    ...ROOM_VIEW,
    placeholder: "corridor-h",
    overviewRect: { x: 79, y: 200, w: 520, h: 80 },
    neighbors: {
      down: "entrance-corridor",
      left: "sb-stair-west",
      right: "sa007-room",
    },
  },
  {
    id: "tongfa-canteen",
    label: "Tongfa 食堂",
    floorId: "0F",
    zoneType: "room",
    imageSrc: "/maps/zones/canteen_0F.png",
    ...ROOM_VIEW,
    overviewRect: { x: 119, y: 80, w: 250, h: 110 },
    neighbors: {
      down: "sa-corridor",
      right: "sa007-room",
      up: "sa-stair-west",
      left: "sb-stair-west",
    },
  },
  {
    id: "sa007-room",
    label: "SA007",
    floorId: "0F",
    zoneType: "room",
    imageSrc: "/maps/rooms/sa007_0F.png",
    ...ROOM_VIEW,
    overviewRect: { x: 439, y: 100, w: 120, h: 90 },
    neighbors: {
      down: "sb-stair-east",
      left: "tongfa-canteen",
      up: "sa-stair-east",
    },
  },
  makeStairRoom(
    "sa-stair-west",
    "SA 楼梯（西）",
    205,
    180,
    { down: "tongfa-canteen" }
  ),
  makeStairRoom(
    "sa-stair-east",
    "SA 楼梯（东）",
    630,
    185,
    { down: "sa007-room" }
  ),
  makeStairRoom(
    "sb-stair-west",
    "SB 楼梯（西）",
    200,
    380,
    { right: "sa-corridor", left: "tongfa-canteen" }
  ),
  makeStairRoom(
    "sb-stair-east",
    "SB 楼梯（东）",
    625,
    380,
    { up: "sa007-room" }
  ),
  {
    id: "sd-corridor",
    label: "SD 过道",
    floorId: "0F",
    zoneType: "corridor",
    ...ROOM_VIEW,
    placeholder: "corridor-h",
    // 入口正下方窄条过道（可通行），不含 SD085 教室内部
    overviewRect: { x: 159, y: 600, w: 120, h: 14 },
    neighbors: {
      up: "entrance-corridor",
      down: "sd085-room",
      left: "sd-corridor-west",
    },
  },
  {
    id: "sd-corridor-west",
    label: "SD 西走廊",
    floorId: "0F",
    zoneType: "corridor",
    ...ROOM_VIEW,
    placeholder: "corridor-v",
    // 教室西侧可通行走廊（CAD 空白走道 x:79–139）
    overviewRect: { x: 79, y: 600, w: 60, h: 80 },
    neighbors: {
      right: "sd085-room",
      up: "sc-stair-west",
      down: "sd-stair-west",
    },
  },
  {
    id: "sd085-room",
    label: "SD085",
    floorId: "0F",
    zoneType: "room",
    ...ROOM_VIEW,
    placeholder: "room",
    // 仅 CAD 蓝色 SD085 标签框（教室本体），不是整条 SD 底带
    overviewRect: { x: 169, y: 610, w: 220, h: 60 },
    imageSrc: "/maps/rooms/sd085_0F.png",
    neighbors: { up: "sd-corridor", left: "sd-corridor-west", right: "sd-east-shaft" },
  },
  {
    id: "sc-corridor-h",
    label: "SC 过道",
    floorId: "0F",
    zoneType: "corridor",
    ...ROOM_VIEW,
    placeholder: "corridor-h",
    overviewRect: modelRectToOverview("0F", 210, 522, 380, 28),
    neighbors: { left: "sc-stair-west", right: "sc-east-shaft" },
  },
  makeShaftRoom(
    "sc-east-shaft",
    "SC 梯间（东）",
    575,
    518,
    90,
    75,
    { left: "sc-corridor-h" }
  ),
  makeShaftRoom(
    "sd-east-shaft",
    "SD 梯间（东）",
    575,
    748,
    90,
    55,
    { left: "sd085-room" }
  ),
  makeStairRoom(
    "sc-stair-west",
    "SC 楼梯（西）",
    210,
    570,
    { down: "sd-corridor-west", right: "sc-corridor-h" }
  ),
  makeStairRoom(
    "sd-stair-west",
    "SD 楼梯（西）",
    210,
    770,
    { up: "sd-corridor-west", left: "sd-elev-west" }
  ),
  makeElevatorRoom(
    "sd-elev-west",
    "SD 电梯（西）",
    210,
    743,
    { right: "sd-stair-west" }
  ),
  // SC/SD 中区房间待绑
];

const ROOMS_1F: RoomDef[] = [
  makeCorridorLanding("1f-sa-corridor-west", "SA 西走廊", 185, 179, {
    left: "1f-sa-stair-west",
    right: "1f-sa-corridor-east",
    down: "1f-sb-corridor-west",
  }),
  makeCorridorLanding("1f-sa-corridor-east", "SA 东走廊", 655, 179, {
    left: "1f-sa-corridor-west",
    right: "1f-sa-stair-east",
    down: "1f-sb-corridor-east",
  }),
  makeCorridorLanding("1f-sb-corridor-west", "SB 西走廊", 185, 378, {
    up: "1f-sa-corridor-west",
    left: "1f-sb-stair-west",
    right: "1f-sb-corridor-east",
    down: "1f-sc-corridor-west",
  }),
  makeCorridorLanding("1f-sb-corridor-east", "SB 东走廊", 655, 378, {
    up: "1f-sa-corridor-east",
    left: "1f-sb-corridor-west",
    right: "1f-sb-stair-east",
    down: "1f-sc-corridor-east",
  }),
  makeCorridorLanding("1f-sc-corridor-west", "SC 西走廊", 185, 557, {
    up: "1f-sb-corridor-west",
    left: "1f-sc-stair-west",
    right: "1f-sc-corridor-east",
    down: "1f-sd-corridor-west",
  }),
  makeCorridorLanding("1f-sc-corridor-east", "SC 东走廊", 655, 557, {
    up: "1f-sb-corridor-east",
    left: "1f-sc-corridor-west",
    right: "1f-sc-east-shaft",
    down: "1f-sd-corridor-east",
  }),
  makeCorridorLanding("1f-sd-corridor-west", "SD 西走廊", 185, 775, {
    up: "1f-sc-corridor-west",
    left: "1f-sd-stair-west",
    right: "1f-sd-corridor-east",
  }),
  makeCorridorLanding("1f-sd-corridor-east", "SD 东走廊", 655, 785, {
    up: "1f-sc-corridor-east",
    left: "1f-sd-corridor-west",
    right: "1f-sd-east-shaft",
  }),
  ...build1FVerticalLandings(),
];

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
};

const DEFAULT_BY_FLOOR: Partial<Record<FloorId, string>> = {
  "0F": DEFAULT_ROOM_0F,
  "1F": "1f-sa-corridor-west",
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

/** @deprecated 旧探索模式兼容 */
export function getExploreRooms(floorId: FloorId): RoomDef[] {
  return getRoomsForFloor(floorId).filter((r) => r.imageSrc);
}

/** @deprecated 旧探索模式兼容 */
export function getExploreRoomById(
  floorId: FloorId,
  roomId: string
): RoomDef | undefined {
  return getExploreRooms(floorId).find((r) => r.id === roomId);
}
