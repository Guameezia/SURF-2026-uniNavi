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

// 楼层顺序常量
export const FLOOR_ORDER: FloorId[] = ["0F", "1F", "2F", "3F", "4F", "5F"];

// 地图视口配置（各楼层）
export interface MapViewBox {
  width: number;
  height: number;
}

export const MAP_VIEWBOX: Record<FloorId, MapViewBox> = {
  "0F": { width: 850, height: 950 },
  "1F": { width: 850, height: 950 },
  "2F": { width: 850, height: 950 },
  "3F": { width: 850, height: 950 },
  "4F": { width: 850, height: 950 },
  "5F": { width: 850, height: 950 },
};
