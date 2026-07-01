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

/** 单层跳转目标 */
export interface FloorPortalTarget {
  targetFloorId: FloorId;
  targetRoomId?: string;
  targetNodeId?: string;
}

/** 楼梯/电梯口：进入后弹出上下楼选择 */
export interface FloorPortal {
  up?: FloorPortalTarget;
  down?: FloorPortalTarget;
}

/** 0F 电梯 ↔ 1F 电梯/走廊 */
export interface ElevatorFloorLink {
  room0F: string;
  node0F: string;
  node1F: string;
  node1FCorridor: string;
  room1F: string;
}

/** 0F 楼梯 ↔ 1F 楼梯/走廊 对照（与导航图 edges 一致） */
export interface StairFloorLink {
  room0F: string;
  node0F: string;
  node1FStair: string;
  /** 1F 楼梯口连通的走廊 junction */
  node1FCorridor: string;
  room1F: string;
}

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
  placeholder?: "corridor-h" | "corridor-v" | "room" | "stair" | "shaft";
  /** 楼梯口等：进入后自动切到目标楼层 */
  floorPortal?: FloorPortal;
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
