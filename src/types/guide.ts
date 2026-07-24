import type { FloorId } from "./indoor";
import type { MapPoint, RouteSegment } from "./indoor";

/** 收藏夹主题（攻略书分类） */
export type GuideTheme =
  | "food"
  | "study"
  | "tour"
  | "facility"
  | "custom";

export interface GuideThemeDef {
  id: GuideTheme;
  label: string;
  color: string;
}

export const GUIDE_THEMES: GuideThemeDef[] = [
  { id: "food", label: "美食", color: "#e65100" },
  { id: "study", label: "自习", color: "#1565c0" },
  { id: "tour", label: "导览", color: "#2e7d32" },
  { id: "facility", label: "设施", color: "#6a1b9a" },
  { id: "custom", label: "自定义", color: "#546e7a" },
];

export function getGuideThemeDef(id: GuideTheme): GuideThemeDef {
  return GUIDE_THEMES.find((t) => t.id === id) ?? GUIDE_THEMES[4];
}

/** 收藏夹：主题合集，无顺序要求 */
export interface GuideCollection {
  id: string;
  name: string;
  theme: GuideTheme;
  noteIds: string[];
  createdAt: number;
  updatedAt: number;
}

/** 路线停靠点（有序） */
export interface GuideRouteStop {
  noteId: string;
  floorId: FloorId;
  roomId: string;
  roomLabel: string;
  noteText: string;
}

/** 主题路线：3–8 个有序地点 */
export interface GuideRoute {
  id: string;
  name: string;
  collectionId?: string | null;
  stops: GuideRouteStop[];
  /** 沿室内图寻路拼接的几何（生成时计算） */
  geometry?: GuideRouteGeometry;
  createdAt: number;
  updatedAt: number;
}

export interface GuideFloorSegment {
  floorId: FloorId;
  nodeIds: string[];
  points: MapPoint[];
}

/** 相邻两站之间的一段寻路结果 */
export interface GuideRouteLeg {
  fromStopIndex: number;
  toStopIndex: number;
  segments: RouteSegment[];
  found: boolean;
}

/** 站点在楼层鸟瞰图上的锚点 */
export interface GuideStopAnchor {
  stopIndex: number;
  floorId: FloorId;
  roomId: string;
  noteId: string;
  roomLabel: string;
  x: number;
  y: number;
}

export interface GuideRouteGeometry {
  floorSegments: GuideFloorSegment[];
  legs: GuideRouteLeg[];
  stopAnchors: GuideStopAnchor[];
  complete: boolean;
}

export type GuideOverlay =
  | { kind: "collection"; id: string }
  | { kind: "route"; id: string };

export type TimelineFilter = "today" | "week" | "all";
