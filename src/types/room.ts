import type { FloorId } from "./indoor";

export type Direction = "up" | "down" | "left" | "right";

export interface RoomNeighbors {
  up?: string | null;
  down?: string | null;
  left?: string | null;
  right?: string | null;
}

/** 鸟瞰图上的房间块（与 floor viewBox 760×720 对齐） */
export interface OverviewRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 区域类型：room=可进入房间，corridor=可通行走廊，blocked=墙/不可通行（仅标注用） */
export type RoomZoneType = "room" | "corridor" | "blocked";

export interface RoomDef {
  id: string;
  label: string;
  floorId: FloorId;
  /** 区域类型，默认由 placeholder 推断 */
  zoneType?: RoomZoneType;
  /** 房间主屏像素图；无则显示占位 */
  imageSrc?: string;
  viewWidth: number;
  viewHeight: number;
  neighbors: RoomNeighbors;
  overviewRect: OverviewRect;
  placeholder?: "corridor-h" | "corridor-v" | "room";
}

export interface ViewpointDef {
  id: string;
  roomId: string;
  floorId: FloorId;
  x: number;
  y: number;
  title: string;
  content: string;
}
