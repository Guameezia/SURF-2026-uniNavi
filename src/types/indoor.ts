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

// draw.io 页面坐标 → 楼层 SVG viewBox 的变换配置
export interface FloorMapConfig {
  /** SVG viewBox 宽度 */
  width: number;
  /** SVG viewBox 高度 */
  height: number;
  /** 页面坐标 X 偏移（svgX = pageX - offsetX） */
  offsetX: number;
  /** 页面坐标 Y 偏移（svgY = pageY - offsetY） */
  offsetY: number;
}

// offsetX / offsetY 直接取每层 draw.io 内容包围盒左上角（= mxGeometry 最小 x/y），
// 与渲染出的 SVG viewBox 原点对齐，无需再用 POINT_NUDGE 做大幅补偿。
export const FLOOR_MAP_CONFIG: Record<FloorId, FloorMapConfig> = {
  "0F": { width: 760, height: 720, offsetX: 80, offsetY: 120 },
  "1F": { width: 560, height: 680, offsetX: 140, offsetY: 120 },
  "2F": { width: 520, height: 690, offsetX: 160, offsetY: 120 },
  "3F": { width: 522, height: 681, offsetX: 160, offsetY: 120 },
  "4F": { width: 522, height: 681, offsetX: 160, offsetY: 120 },
  "5F": { width: 521, height: 681, offsetX: 160, offsetY: 120 },
};

/** @deprecated 使用 FLOOR_MAP_CONFIG */
export type MapViewBox = Pick<FloorMapConfig, "width" | "height">;

/** @deprecated 使用 FLOOR_MAP_CONFIG */
export const MAP_VIEWBOX: Record<FloorId, MapViewBox> = Object.fromEntries(
  Object.entries(FLOOR_MAP_CONFIG).map(([floor, config]) => [
    floor,
    { width: config.width, height: config.height },
  ])
) as Record<FloorId, MapViewBox>;
