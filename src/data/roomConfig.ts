/**
 * 0F 探索模式房间配置
 * overviewRect 使用 SVG viewBox 坐标，与 S_0F.svg（760×720）一致
 */

import type { FloorId } from "../types/indoor";
import type { RoomDef } from "../types/room";
import { FLOOR_MAP_CONFIG } from "../types/indoor";

const ROOM_VIEW = { viewWidth: 640, viewHeight: 400 };

export const FLOOR_0F_OVERVIEW = {
  width: FLOOR_MAP_CONFIG["0F"].width,
  height: FLOOR_MAP_CONFIG["0F"].height,
  imageSrc: "/maps/S_0F.svg",
};

/** 可点击进入的房间（MVP：3 个） */
const EXPLORE_ROOMS_0F: RoomDef[] = [
  {
    id: "tongfa-canteen",
    label: "Tongfa Canteen",
    floorId: "0F",
    overviewRect: { x: 119, y: 80, w: 250, h: 110 },
    interior: {
      type: "image",
      imageSrc: "/maps/zones/canteen_0F.png",
    },
    ...ROOM_VIEW,
  },
  {
    id: "sa007-room",
    label: "SA007",
    floorId: "0F",
    overviewRect: { x: 439, y: 100, w: 120, h: 90 },
    interior: { type: "placeholder", placeholderVariant: "classroom" },
    ...ROOM_VIEW,
  },
  {
    id: "sd085-room",
    label: "SD085",
    floorId: "0F",
    overviewRect: { x: 169, y: 610, w: 220, h: 60 },
    interior: { type: "placeholder", placeholderVariant: "classroom" },
    ...ROOM_VIEW,
  },
];

const ROOMS_BY_FLOOR: Partial<Record<FloorId, RoomDef[]>> = {
  "0F": EXPLORE_ROOMS_0F,
};

export function hasExploreMode(floorId: FloorId): boolean {
  return (ROOMS_BY_FLOOR[floorId]?.length ?? 0) > 0;
}

export function getExploreRooms(floorId: FloorId): RoomDef[] {
  return ROOMS_BY_FLOOR[floorId] ?? [];
}

export function getExploreRoomById(
  floorId: FloorId,
  roomId: string
): RoomDef | undefined {
  return getExploreRooms(floorId).find((r) => r.id === roomId);
}
