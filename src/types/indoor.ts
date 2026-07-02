/**
 * 室内导航类型定义
 */

// 楼层 ID
export type FloorId = "0F" | "1F" | "2F" | "3F" | "4F" | "5F";

// 建筑 ID
export type BuildingId = string;

// 节点类型
export type IndoorNodeType =
  | "room"
  | "junction"
  | "stairs"
  | "elevator"
  | "exit"
  | "toilet";

// 边类型
export type EdgeType = "flat" | "elevator" | "stairs";

// 方向提示
export type DirectionHint = "east" | "south" | "north" | "west" | "up";

// 地图点坐标
export interface MapPoint {
  x: number;
  y: number;
  id?: string;
}

// 地图节点
export interface MapNode {
  id: string;
  type: IndoorNodeType;
  label: string;
  building: BuildingId;
  floorId: FloorId;
  block: string;
  x: number;
  y: number;
}

// 地图边
export interface MapEdge {
  from: string;
  to: string;
  distance: number;
  edgeType: EdgeType;
  directionHint: DirectionHint | string;
  /** 中间折点（draw.io 页面坐标），用于让边贴合真实浅灰色可行走走廊 */
  waypoints?: MapPoint[];
}

// POI（兴趣点）
export interface POI {
  id: string;
  label: string;
  type: IndoorNodeType;
  floorId: FloorId;
  building: BuildingId;
  x: number;
  y: number;
}

// 楼层信息
export interface Floor {
  id: FloorId;
  name: string;
  building: BuildingId;
}

// 图邻接表项
export interface GraphAdjacencyItem {
  to: string;
  edge: MapEdge;
}

// 图结构
export interface Graph {
  nodesById: Record<string, MapNode>;
  adjacency: Record<string, GraphAdjacencyItem[]>;
  edgesByKey: Record<string, MapEdge>;
  edges: MapEdge[];
  nodes: MapNode[];
}

// 路径段（按楼层分段）
export interface RouteSegment {
  floorId: FloorId;
  nodeIds: string[];
  points: MapPoint[];
}

// 路径结果
export interface RouteResult {
  startNodeId: string;
  endNodeId: string;
  nodeIds: string[];
  distance: number;
  segments: RouteSegment[];
  found: boolean;
}

// 路线模式
export type RouteMode = "comfort" | "fast";

// 含分步指引的完整路线
export interface ComputedRoute extends RouteResult {
  steps: string[];
}

// UI 阶段
export type NavigationUIPhase = "idle" | "navigating";

// 楼层顺序常量
export const FLOOR_ORDER: FloorId[] = ["0F", "1F", "2F", "3F", "4F", "5F"];

import { FLOOR_MAP_CONFIG as _FLOOR_MAP_CONFIG } from "../data/floorGeometry";

export type {
  FloorMapConfig,
  MapViewBox,
} from "../data/floorGeometry";
export {
  FLOOR_MAP_CONFIG,
  DISPLAY_CANVAS,
} from "../data/floorGeometry";

/** @deprecated 使用 FLOOR_MAP_CONFIG */
export const MAP_VIEWBOX: Record<FloorId, { width: number; height: number }> =
  Object.fromEntries(
    Object.entries(_FLOOR_MAP_CONFIG).map(([floor, config]) => [
      floor,
      { width: config.width, height: config.height },
    ])
  ) as Record<FloorId, { width: number; height: number }>;
