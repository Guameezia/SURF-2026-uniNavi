/**
 * 星露谷式分房间导航 — 0F MVP
 * 走廊独立成 room；默认从主入口走廊开始
 *
 * overviewRect 使用 SVG viewBox 坐标（760×720），与 S_0F.svg 底图一致。
 * 换算：svgX = modelX - 81, svgY = modelY - 120
 */

import type { FloorId } from "../types/indoor";
import type { RoomDef, ViewpointDef } from "../types/room";
import { getFloorModelOffset } from "./mapConfig";

const BUILDING = "S";
const ROOM_VIEW = { viewWidth: 640, viewHeight: 400 };

export const FLOOR_0F_OVERVIEW = {
  width: 760,
  height: 720,
  imageSrc: "/maps/S_0F.svg",
};

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
      left: "tongfa-canteen",
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
    neighbors: { down: "sa-corridor", right: "sa007-room" },
  },
  {
    id: "sa007-room",
    label: "SA007",
    floorId: "0F",
    zoneType: "room",
    imageSrc: "/maps/rooms/sa007_0F.png",
    ...ROOM_VIEW,
    overviewRect: { x: 439, y: 100, w: 120, h: 90 },
    neighbors: { down: "sa-corridor", left: "tongfa-canteen" },
  },
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
    neighbors: { right: "sd085-room" },
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
    neighbors: { up: "sd-corridor", left: "sd-corridor-west" },
  },
  // TODO: x:399,y:600 120×80 等为 SC 区/其他房间；x:519 附近为楼梯，暂作 blocked 未绑
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
};

const DEFAULT_BY_FLOOR: Partial<Record<FloorId, string>> = {
  "0F": DEFAULT_ROOM_0F,
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
