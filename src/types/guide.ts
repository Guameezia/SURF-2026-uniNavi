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

export type GuideRouteTag = "food" | "study" | "tour" | "accessible";

export interface GuideRouteTagDef {
  id: GuideRouteTag;
  label: string;
  emoji: string;
  color: string;
  cover: string;
}

export const GUIDE_ROUTE_TAGS: GuideRouteTagDef[] = [
  {
    id: "food",
    label: "美食",
    emoji: "🍜",
    color: "#e65100",
    cover: "linear-gradient(135deg, #ffcc80 0%, #ef6c00 100%)",
  },
  {
    id: "study",
    label: "自习",
    emoji: "📚",
    color: "#1565c0",
    cover: "linear-gradient(135deg, #90caf9 0%, #1565c0 100%)",
  },
  {
    id: "tour",
    label: "参观",
    emoji: "🧭",
    color: "#2e7d32",
    cover: "linear-gradient(135deg, #a5d6a7 0%, #2e7d32 100%)",
  },
  {
    id: "accessible",
    label: "无障碍",
    emoji: "♿",
    color: "#6a1b9a",
    cover: "linear-gradient(135deg, #ce93d8 0%, #6a1b9a 100%)",
  },
];

export function getGuideRouteTagDef(id: GuideRouteTag): GuideRouteTagDef {
  return GUIDE_ROUTE_TAGS.find((tag) => tag.id === id) ?? GUIDE_ROUTE_TAGS[2];
}

/** 主题路线：3–8 个有序地点 */
export interface GuideRoute {
  id: string;
  name: string;
  description: string;
  tags: GuideRouteTag[];
  estimatedMinutes: number;
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

export interface GuideRouteProgress {
  routeId: string;
  currentStopIndex: number;
  currentNoteId: string;
  startedAt: number;
  updatedAt: number;
}

export interface GuideRouteCompletion {
  routeId: string;
  routeName: string;
  completedStops: number;
  floors: FloorId[];
  startedAt: number;
  completedAt: number;
}

export type GuideOverlay =
  | { kind: "collection"; id: string }
  | { kind: "route"; id: string };

export type TimelineFilter = "today" | "week" | "all";
