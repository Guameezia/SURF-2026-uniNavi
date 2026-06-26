/**
 * 旧项目数据适配器
 * 将原 uni-app 项目的数据格式转换为新 Web 项目格式
 */

import type {
  MapNode,
  MapEdge,
  FloorId,
  IndoorNodeType,
  EdgeType,
} from "../../types/indoor";

// 楼层顺序常量
export const FLOOR_ORDER: FloorId[] = ["0F", "1F", "2F", "3F", "4F", "5F"];

// 旧项目节点类型
interface LegacyNode {
  id: string;
  type: string;
  label: string;
  building: string;
  floor: string;
  block: string;
  x: number;
  y: number;
}

// 旧项目边类型
interface LegacyEdge {
  from: string;
  to: string;
  distance: number;
  edgeType: string;
  directionHint: string;
}

/**
 * 转换节点类型
 * staircase → stairs
 */
function convertNodeType(type: string): IndoorNodeType {
  if (type === "staircase") return "stairs";
  return type as IndoorNodeType;
}

/**
 * 转换边类型
 * staircase → stairs
 */
function convertEdgeType(edgeType: string): EdgeType {
  if (edgeType === "staircase") return "stairs";
  return edgeType as EdgeType;
}

/**
 * 转换旧节点数据为新格式
 */
export function convertLegacyNode(node: LegacyNode): MapNode {
  return {
    id: node.id,
    type: convertNodeType(node.type),
    label: node.label,
    building: node.building,
    floorId: node.floor as FloorId,
    block: node.block,
    x: node.x,
    y: node.y,
  };
}

/**
 * 转换旧边数据为新格式
 */
export function convertLegacyEdge(edge: LegacyEdge): MapEdge {
  return {
    from: edge.from,
    to: edge.to,
    distance: edge.distance,
    edgeType: convertEdgeType(edge.edgeType),
    directionHint: edge.directionHint,
  };
}

/**
 * 批量转换节点
 */
export function convertLegacyNodes(nodes: LegacyNode[]): MapNode[] {
  return nodes.map(convertLegacyNode);
}

/**
 * 批量转换边
 */
export function convertLegacyEdges(edges: LegacyEdge[]): MapEdge[] {
  return edges.map(convertLegacyEdge);
}

/**
 * 获取地图资源路径
 *
 * mapper 提供像素 PNG 后：
 * 1. 将 MAP_ASSET_EXTENSION 改为 'png'
 * 2. 把 PNG 放入 public/maps/（如 S_0F.png）
 * 3. 在 mapConfig.ts 更新对应楼层的 MAP_VIEWBOX 尺寸
 */
export type MapAssetExtension = "svg" | "png";

/** 像素底图就绪后改为 'png' */
export const MAP_ASSET_EXTENSION: MapAssetExtension = "svg";

export function getMapAssetPath(building: string, floorId: FloorId): string {
  return `/maps/${building}_${floorId}.${MAP_ASSET_EXTENSION}`;
}
