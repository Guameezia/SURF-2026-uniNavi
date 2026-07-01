/**
 * 地图状态管理 - Zustand Store
 */

import { create } from "zustand";
import type {
  FloorId,
  Floor,
  RouteResult,
  Graph,
  POI,
  RouteMode,
  ComputedRoute,
  NavigationUIPhase,
} from "../types/indoor";

interface MapState {
  // 状态
  floors: Floor[];
  currentFloorId: FloorId;
  /** 切层后一次性聚焦到该导航节点（整层 CAD 模式） */
  floorFocusNodeId: string | null;
  /** 切层后进入的分房间 id（分房间模式，优先于 floorFocusNodeId） */
  floorEntryRoomId: string | null;
  selectedPOIId: string | null;
  routeResult: RouteResult | null;
  graph: Graph | null;
  pois: POI[];

  // 导航状态
  uiPhase: NavigationUIPhase;
  comfortRoute: ComputedRoute | null;
  fastRoute: ComputedRoute | null;
  selectedRouteMode: RouteMode;
  hasMultipleRoutes: boolean;

  // 加载状态
  isLoading: boolean;
  error: string | null;

  // Actions
  initializeMap: (graph: Graph, pois: POI[], floors: Floor[]) => void;
  setCurrentFloor: (floorId: FloorId) => void;
  transitionToFloor: (
    floorId: FloorId,
    focusNodeId?: string | null,
    entryRoomId?: string | null
  ) => void;
  clearFloorFocus: () => void;
  clearFloorEntry: () => void;
  selectPOI: (poiId: string | null) => void;
  setRoute: (result: RouteResult) => void;
  setDualRoutes: (
    comfort: ComputedRoute,
    fast: ComputedRoute,
    hasMultipleRoutes: boolean
  ) => void;
  setRouteMode: (mode: RouteMode) => void;
  clearRoute: () => void;
  beginEditingRoute: () => void;
  setError: (error: string | null) => void;
}

export const useMapStore = create<MapState>((set, get) => ({
  // 初始状态
  floors: [],
  currentFloorId: "0F",
  floorFocusNodeId: null,
  floorEntryRoomId: null,
  selectedPOIId: null,
  routeResult: null,
  graph: null,
  pois: [],
  uiPhase: "idle",
  comfortRoute: null,
  fastRoute: null,
  selectedRouteMode: "comfort",
  hasMultipleRoutes: false,
  isLoading: true,
  error: null,

  // 初始化地图
  initializeMap: (graph, pois, floors) => {
    const prefer0F = floors.find((f) => f.id === "0F");
    set({
      graph,
      pois,
      floors,
      currentFloorId: prefer0F?.id ?? (floors.length > 0 ? floors[0].id : "0F"),
      isLoading: false,
      error: null,
    });
  },

  // 切换楼层
  setCurrentFloor: (floorId) => {
    set({
      currentFloorId: floorId,
      floorFocusNodeId: null,
      floorEntryRoomId: null,
    });
  },

  transitionToFloor: (floorId, focusNodeId = null, entryRoomId = null) => {
    set({
      currentFloorId: floorId,
      floorEntryRoomId: entryRoomId ?? null,
      floorFocusNodeId: entryRoomId ? null : (focusNodeId ?? null),
    });
  },

  clearFloorFocus: () => {
    set({ floorFocusNodeId: null });
  },

  clearFloorEntry: () => {
    set({ floorEntryRoomId: null });
  },

  // 选择 POI
  selectPOI: (poiId) => {
    set({ selectedPOIId: poiId });
  },

  // 设置路径结果
  setRoute: (result) => {
    set(() => {
      if (result.found && result.segments.length > 0) {
        return {
          routeResult: result,
          currentFloorId: result.segments[0].floorId,
        };
      }
      return { routeResult: result };
    });
  },

  setDualRoutes: (comfort, fast, hasMultipleRoutes) => {
    const active = get().selectedRouteMode === "fast" ? fast : comfort;
    const route = active.found ? active : comfort.found ? comfort : fast;

    set({
      comfortRoute: comfort,
      fastRoute: fast,
      hasMultipleRoutes,
      routeResult: route.found ? route : null,
      uiPhase: route.found ? "navigating" : "idle",
      currentFloorId:
        route.found && route.segments.length > 0
          ? route.segments[0].floorId
          : get().currentFloorId,
    });
  },

  setRouteMode: (mode) => {
    const { comfortRoute, fastRoute } = get();
    const route = mode === "fast" ? fastRoute : comfortRoute;
    if (!route?.found) {
      set({ selectedRouteMode: mode });
      return;
    }
    set({
      selectedRouteMode: mode,
      routeResult: route,
      currentFloorId:
        route.segments.length > 0 ? route.segments[0].floorId : get().currentFloorId,
    });
  },

  // 清除路径
  clearRoute: () => {
    set({
      routeResult: null,
      comfortRoute: null,
      fastRoute: null,
      hasMultipleRoutes: false,
      uiPhase: "idle",
      selectedRouteMode: "comfort",
    });
  },

  beginEditingRoute: () => {
    set({
      routeResult: null,
      comfortRoute: null,
      fastRoute: null,
      hasMultipleRoutes: false,
      uiPhase: "idle",
      selectedRouteMode: "comfort",
    });
  },

  // 设置错误
  setError: (error) => {
    set({ error, isLoading: false });
  },
}));

/**
 * 判断指定楼层是否有路径段
 */
export function hasRouteOnFloor(
  routeResult: RouteResult | null,
  floorId: FloorId
): boolean {
  if (!routeResult || !routeResult.found) return false;
  return routeResult.segments.some((seg) => seg.floorId === floorId);
}

/**
 * 获取指定楼层的路径段
 */
export function getRouteSegmentForFloor(
  routeResult: RouteResult | null,
  floorId: FloorId
) {
  if (!routeResult || !routeResult.found) return null;
  return routeResult.segments.find((seg) => seg.floorId === floorId) || null;
}

/**
 * 获取有路径的楼层列表
 */
export function getFloorsWithRoute(routeResult: RouteResult | null): FloorId[] {
  if (!routeResult || !routeResult.found) return [];
  return routeResult.segments.map((seg) => seg.floorId);
}
