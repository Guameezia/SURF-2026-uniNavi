/**
 * 跨层竖井连接 — 单一数据源
 * room 导航 portal 与图 edges 的对照表，由 roomConfig 与 routeRoomBridge 共用
 */
import type { FloorId } from "../types/indoor";
import { FLOOR_ORDER } from "../types/indoor";
import type {
  ElevatorFloorLink,
  FloorPortal,
  StairFloorLink,
} from "../types/room";

export interface ShaftFloorBinding {
  floorId: FloorId;
  roomId: string;
  nodeId: string;
  corridorRoomId?: string;
  corridorNodeId?: string;
}

export interface VerticalShaft {
  kind: "stair" | "elevator";
  /** 0F room id，如 sa-stair-west / sa-elev-east */
  shaftKey: string;
  isWest: boolean;
  floors: ShaftFloorBinding[];
}


function blockFromKey(shaftKey: string): string {
  return shaftKey.split("-")[0].toUpperCase();
}

function roomIdForFloor(floorId: FloorId, shaftKey: string): string {
  if (floorId === "0F") return shaftKey;
  return `${floorId.toLowerCase()}-${shaftKey}`;
}

function stairNode(floorId: FloorId, block: string, west: boolean): string {
  return `S_${floorId}_${block}_STAIR_${west ? "W" : "E"}`;
}

function elevNode(floorId: FloorId, block: string): string {
  return `S_${floorId}_${block}_ELEV`;
}

function junctionNode(floorId: FloorId, block: string, west: boolean): string {
  return `S_${floorId}_${block}_J_${west ? "W" : "E"}`;
}

function corridorRoom(block: string, west: boolean): string {
  return `1f-${block}-corridor-${west ? "west" : "east"}`;
}

/** 1F 竖井落地走廊：各翼灰走廊（SC 西翼、SD 东翼已补齐） */
function corridorRoom1F(block: string, west: boolean): string {
  return corridorRoom(block, west);
}

function buildStairShaft(shaftKey: string, west: boolean): VerticalShaft {
  const block = blockFromKey(shaftKey);
  const floors: ShaftFloorBinding[] = FLOOR_ORDER.map((floorId) => {
    const binding: ShaftFloorBinding = {
      floorId,
      roomId: roomIdForFloor(floorId, shaftKey),
      nodeId: stairNode(floorId, block, west),
    };
    if (floorId === "1F") {
      binding.corridorRoomId = corridorRoom1F(block.toLowerCase(), west);
      binding.corridorNodeId = junctionNode("1F", block, west);
    }
    return binding;
  });
  return { kind: "stair", shaftKey, isWest: west, floors };
}

function buildElevShaft(shaftKey: string, west: boolean): VerticalShaft {
  const block = blockFromKey(shaftKey);
  const floors: ShaftFloorBinding[] = FLOOR_ORDER.map((floorId) => {
    const binding: ShaftFloorBinding = {
      floorId,
      roomId: roomIdForFloor(floorId, shaftKey),
      nodeId: elevNode(floorId, block),
    };
    if (floorId === "1F") {
      binding.corridorRoomId = corridorRoom1F(block.toLowerCase(), west);
      binding.corridorNodeId = junctionNode("1F", block, west);
    }
    return binding;
  });
  return { kind: "elevator", shaftKey, isWest: west, floors };
}

export const VERTICAL_SHAFTS: VerticalShaft[] = [
  buildStairShaft("sa-stair-west", true),
  buildStairShaft("sa-stair-east", false),
  buildStairShaft("sb-stair-west", true),
  buildStairShaft("sb-stair-east", false),
  buildStairShaft("sc-stair-west", true),
  buildStairShaft("sc-stair-east", false),
  buildStairShaft("sd-stair-west", true),
  buildStairShaft("sd-stair-east", false),
  buildElevShaft("sa-elev-east", false),
  buildElevShaft("sb-elev-west", true),
  buildElevShaft("sc-elev-east", false),
  buildElevShaft("sd-elev-west", true),
];

const SHAFT_BY_KEY = new Map(VERTICAL_SHAFTS.map((s) => [s.shaftKey, s]));

export function getVerticalShaft(shaftKey: string): VerticalShaft | undefined {
  return SHAFT_BY_KEY.get(shaftKey);
}

export function getShaftBinding(
  shaftKey: string,
  floorId: FloorId
): ShaftFloorBinding | undefined {
  return getVerticalShaft(shaftKey)?.floors.find((f) => f.floorId === floorId);
}

/** 同侧楼梯 room key（电梯井用） */
export function stairSiblingKey(shaftKey: string): string {
  return shaftKey.replace("-elev-", "-stair-");
}

/** 同侧电梯 room key（楼梯井用） */
export function elevSiblingKey(shaftKey: string): string | undefined {
  if (!shaftKey.includes("-stair-")) return undefined;
  const elevKey = shaftKey.replace("-stair-", "-elev-");
  return SHAFT_BY_KEY.has(elevKey) ? elevKey : undefined;
}

export function buildShaftPortal(
  shaftKey: string,
  floorId: FloorId
): FloorPortal | undefined {
  const shaft = getVerticalShaft(shaftKey);
  if (!shaft) return undefined;

  const idx = shaft.floors.findIndex((f) => f.floorId === floorId);
  if (idx === -1) return undefined;

  const portal: FloorPortal = {};
  if (idx > 0) {
    const below = shaft.floors[idx - 1];
    portal.down = {
      targetFloorId: below.floorId,
      targetRoomId: below.roomId,
      targetNodeId: below.nodeId,
    };
  }
  if (idx < shaft.floors.length - 1) {
    const above = shaft.floors[idx + 1];
    portal.up = {
      targetFloorId: above.floorId,
      targetRoomId: above.roomId,
      targetNodeId: above.nodeId,
    };
  }
  return portal.up || portal.down ? portal : undefined;
}

/** @deprecated 兼容旧接口 — 0F↔1F 楼梯 */
export const STAIR_FLOOR_LINKS: StairFloorLink[] = VERTICAL_SHAFTS.filter(
  (s) => s.kind === "stair"
).map((shaft) => {
  const f0 = shaft.floors.find((f) => f.floorId === "0F")!;
  const f1 = shaft.floors.find((f) => f.floorId === "1F")!;
  return {
    room0F: f0.roomId,
    node0F: f0.nodeId,
    node1FStair: f1.nodeId,
    node1FCorridor: f1.corridorNodeId!,
    room1F: f1.corridorRoomId!,
  };
});

/** @deprecated 兼容旧接口 — 0F↔1F 电梯 */
export const ELEVATOR_FLOOR_LINKS: ElevatorFloorLink[] = VERTICAL_SHAFTS.filter(
  (s) => s.kind === "elevator"
).map((shaft) => {
  const f0 = shaft.floors.find((f) => f.floorId === "0F")!;
  const f1 = shaft.floors.find((f) => f.floorId === "1F")!;
  return {
    room0F: f0.roomId,
    node0F: f0.nodeId,
    node1F: f1.nodeId,
    node1FCorridor: f1.corridorNodeId!,
    room1F: f1.corridorRoomId!,
  };
});
