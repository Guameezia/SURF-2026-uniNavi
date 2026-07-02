/**
 * 跨层竖井连接 — 单一数据源
 * room 导航 portal 与图 edges 的对照表，由 roomConfig 与 routeRoomBridge 共用
 */
import type {
  ElevatorFloorLink,
  StairFloorLink,
} from "../types/room";

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

export type ShaftFloorLink = (typeof SHAFT_FLOOR_LINKS)[number];
